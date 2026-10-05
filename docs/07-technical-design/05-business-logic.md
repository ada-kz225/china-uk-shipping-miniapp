# 核心业务服务设计

> 服务层是业务规则的唯一执行入口。Route、Mock Ops、Seed Script 和未来外部 Adapter 都只能调用服务方法；Repository 不对外暴露“任意更新状态”的能力。

## 1. Service 调用通则

每个写服务都应：

1. 从 Session / Ops Context 得到 actor，而不信任请求中的 `userId`；
2. 校验实体所有权、输入格式、当前状态与开放 Exception；
3. 在一个事务中写实体、关联事实与 AuditLog；
4. 使用 `version` 或唯一约束处理并发；
5. 返回领域结果，再由 Presentation 转为中文用户响应；
6. 对重复请求返回既有结果或明确冲突，不产生重复实体。

## 2. PackageService

| Method | Input / purpose | Business validation | Result / audit |
| --- | --- | --- | --- |
| `declarePackage` | 国内运单号、商品说明或订单证明、备注 | 当前用户；运单号标准化后未重复；说明/证明至少一项。 | 创建 `DECLARED` Package；记录 `PACKAGE_DECLARED`。 |
| `receivePackage` | Package ID、收货时间、Ops 来源 | 仅 Ops；当前为 `INBOUND_TO_WAREHOUSE`；无开放阻塞问题。 | → `ARRIVED_PENDING_MATCH`；记录收货。 |
| `matchPackage` | Package ID、匹配结果 | 仅 Ops；当前为 `ARRIVED_PENDING_MATCH`；匹配用户必须等于 Package.owner。 | 成功后调用 `markPackageReady`；失败应创建 Exception，而非错配。 |
| `markPackageReady` | Package ID | 仅 Ops；已完成匹配；无阻塞 Exception。 | → `READY_FOR_SHIPMENT`；记录匹配/可合箱审计。 |
| `validatePackageOwnership` | user、packageIds | 校验全部实体属于 current user，且无缺失。 | 为列表、草稿与提交提供可复用 guard；越权时不泄露存在性。 |

`receivePackage` 与 `matchPackage` 的来源在 V1 是模拟的，但其状态顺序、归属校验和审计记录是真实业务逻辑。

## 3. ShipmentService

| Method | Input / purpose | Business validation | Result / audit |
| --- | --- | --- | --- |
| `createDraft` | 用户选择的 Package IDs | 至少 1 件、均属当前用户；可在草稿中暂存，但不锁定。 | 创建 / 返回 `DRAFT`；不生成 reference。 |
| `addPackages` | draft ID、Package IDs | 草稿属于当前用户；去重；当前仍允许编辑。 | 更新草稿候选集合；提交时仍需二次校验。 |
| `removePackages` | draft ID、Package IDs | 草稿属于当前用户；不可把最终草稿提交为空。 | 移除候选；不改变 Package 状态。 |
| `submitShipment` | draft ID、地址、idempotency key | 至少 1 件；地址四字段完整；全部仍 `READY_FOR_SHIPMENT`、归属当前用户、无开放异常且无有效锁定。 | 原子写 Address、Shipment Reference、Shipment `SUBMITTED`、ShipmentPackage 锁定与 Package `IN_SHIPMENT`。 |
| `lockPackages` | shipment、package IDs | 仅在 submit transaction 中调用；数据库部分唯一索引不得冲突。 | 创建有效关联；任何一件失败则整笔回滚。 |
| `cancelShipment` | Shipment ID、用户请求 | 仅 owner；状态为 `DRAFT`、`SUBMITTED` 或 `AWAITING_PAYMENT`；未进入仓库处理、无 payment processing、未出库。 | → `CANCELLED`，释放关联 Package 至 `READY_FOR_SHIPMENT`，审计。 |

已提交转运单不提供“编辑包裹”API。若后续真实业务确认更复杂撤回规则，再在 P1/P2 中重新定义，不能在 V1 静默放宽。

## 4. QuoteService

| Method | Input / purpose | Business validation | Result / audit |
| --- | --- | --- | --- |
| `recordWeight` | Shipment ID、最终计费重量、打包完成时间 | 仅 Ops；Shipment 为 `WAREHOUSE_PROCESSING`；重量为正数；无阻塞 Exception。 | 记录打包事实和重量；状态仍为仓库处理中。 |
| `generateQuote` | Shipment ID、运费、处理费、币种 | 仅 Ops；打包完成、重量存在、费用非负、总额正确、无 Quote、无阻塞 Exception。 | 创建不可变 Quote Snapshot；Shipment → `AWAITING_PAYMENT`；审计。 |
| `freezeQuoteSnapshot` | shipment、计算后的 quote facts | 只被 `generateQuote` 内部调用。 | 复制重量、费用、总价、来源与时间；付款后禁止改写。 |

V1 不实现真实计费公式；Mock Ops 必须显式传入模拟金额，不能把它标识为真实价目。

## 5. PaymentService

| Method | Input / purpose | Business validation | Result / audit |
| --- | --- | --- | --- |
| `createMockPayment` | Shipment ID、idempotency key | 当前用户；Shipment 为 `AWAITING_PAYMENT`；存在 Quote；无阻塞 Exception；无成功 Payment。 | 创建 `PROCESSING` attempt；Shipment → `PAYMENT_PROCESSING`。 |
| `markPaymentSuccess` | payment ID、mock result | 仅 Mock Payment adapter；attempt 仍 processing；金额与 Quote 一致；无成功 Payment。 | Payment → `SUCCEEDED`；Shipment → `PAID_AWAITING_DISPATCH`；审计。 |
| `markPaymentFailure` | payment ID、mock result | 仅 Mock Payment adapter；attempt 仍 processing。 | Payment → `FAILED` 或 `UNKNOWN`；Shipment → `AWAITING_PAYMENT`；审计。 |

Payment 成功后不调用 DispatchService；付款状态与实际出库严格分离。

## 6. DispatchService 与 TrackingService

| Method | Input / purpose | Business validation | Result / audit |
| --- | --- | --- | --- |
| `validateDispatchEligibility` | Shipment ID | 付款成功、Quote 存在、打包已完成、最终重量存在、无开放阻塞 Exception、当前为 `PAID_AWAITING_DISPATCH`。 | 返回合法 / 具体拒绝原因。 |
| `dispatchShipment` | Shipment ID、实际离仓时间 | 仅 Ops；必须通过 dispatch eligibility。 | → `DISPATCHED`；写 `dispatched_at` 与首个中文 TrackingEvent。 |
| `appendTrackingEvent` | Shipment ID、下一个 stage、发生时间、中文说明 | 仅 Ops / adapter；stage 与当前状态合法相邻；时间不早于已有事件。 | 写事件和审计。 |
| `updateShipmentStage` | Shipment ID、目标履约阶段 | 仅 Ops / adapter；只允许 `DISPATCHED → INTERNATIONAL_TRANSIT → CUSTOMS_CLEARANCE → UK_LAST_MILE → DELIVERED`。 | 更新 Shipment 与用户时间线。 |

## 7. ExceptionService

| Method | Input / purpose | Business validation | Result / audit |
| --- | --- | --- | --- |
| `raiseException` | Package 或 Shipment、中文五段说明、resume state、是否阻塞 | 仅 Ops / adapter；目标存在；resume state 必须是当前合法主状态；不得有同一目标的阻塞开放 Exception。 | 创建 `OPEN` Exception；目标 → `EXCEPTION`；审计。 |
| `blockEntity` | Exception ID | 由 `raiseException` 内部调用。 | 阻止后续转换；列表 / 详情读取可见。 |
| `resolveException` | Exception ID、解决说明 | 仅 Ops；Exception 为 `OPEN`；恢复状态仍然合法。 | 标记 `RESOLVED`；目标从 `EXCEPTION` 恢复 resume state；审计。 |
| `resumeWorkflow` | target、resume state | 只由 `resolveException` 调用。 | 不补造事件、不跳步骤；恢复后等待下一正常事件。 |

业务 Exception 与技术错误完全不同：读取失败、数据库错误或网络断开不会调用 ExceptionService。

## 8. AuditService

| Method | Required record |
| --- | --- |
| `recordCriticalOperation` | actor、action、entity、前后状态、相关值、原因（如有）、request ID、时间。 |

至少记录 Package 预报/收货/匹配、Shipment 提交/取消/锁定/释放、重量/Quote、付款结果、出库、Tracking、Exception 创建与解决。AuditLog 是内部追溯事实；不等于用户的运输进度。

## 9. Transaction boundaries

| Action | One transaction must include |
| --- | --- |
| 提交 Shipment | 读取并锁定候选 Package → 校验 → Shipment / Address → ShipmentPackage → Package 状态 → Reference → AuditLog。 |
| 取消 Shipment | 校验取消条件 → Shipment `CANCELLED` → 释放关联 → Package `READY_FOR_SHIPMENT` → AuditLog。 |
| 生成 Quote | 校验处理完成和重量 → Quote Snapshot → Shipment 待付款 → AuditLog。 |
| 付款结果 | Payment Attempt → Shipment 状态 → AuditLog。 |
| 出库 | eligibility → dispatched_at → Shipment `DISPATCHED` → TrackingEvent → AuditLog。 |
| 异常创建 / 解决 | Exception 记录 → 目标状态 → AuditLog。 |

