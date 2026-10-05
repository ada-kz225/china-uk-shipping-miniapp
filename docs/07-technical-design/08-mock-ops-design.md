# Mock Ops / Demo Event 设计

> V1 没有真实仓库、支付或物流接入。Mock Ops 的职责是模拟**事实来源**，而非跳过真实业务规则。它不属于小程序用户页面，也不构成完整运营后台。

## 1. 目标

- 让 Demo 能沿真实 Package / Shipment 状态机推进；
- 可重复演示正常路径和异常路径；
- 每个状态都有可追溯的触发事件、来源和 AuditLog；
- 不允许 Seed Script 或 Ops 页面直接更新数据库状态；
- 防止用户端借 Mock Ops 绕过支付、出库和锁定规则。

## 2. 推荐最简实现

采用三层组合，不开发完整 Admin UI：

| 组成 | 形式 | 用途 |
| --- | --- | --- |
| Seed Script | `npm run db:seed` | 建立固定 Demo 用户、仓地址、15 件 Package、各阶段 Shipment 和 Exception。 |
| Mock Ops Command API | 受保护内部 endpoint | 开发者在本地或受控 Demo 环境推进单个事件。 |
| 可选 Dev Command Panel | 仅开发环境的极简网页 / 命令行 | 便于演示点击触发命令；不纳入小程序，也不作为 P0 页面。 |

最小交付只需要 Seed Script + Command API。命令行或极简开发面板是开发辅助，不增加用户功能。

## 3. Command Contract

```json
{
  "command": "GENERATE_QUOTE",
  "entityType": "SHIPMENT",
  "entityId": "shipment-id",
  "idempotencyKey": "demo-command-id",
  "payload": {
    "shippingFeeMinor": 0,
    "handlingFeeMinor": 0,
    "currency": "GBP"
  }
}
```

- 需要 `X-Demo-Ops-Key`；
- 服务仅在 `NODE_ENV !== production` 或显式 `DEMO_OPS_ENABLED=true` 时注册；
- Payload 由 Zod 按命令白名单校验；
- Command Handler 将 actor 设为 `MOCK_OPS`，随后调用业务服务；
- 重复 `idempotencyKey` 返回同一结果；
- 每次成功或拒绝都写入审计 / 服务日志，拒绝不写非法状态。

## 4. Supported Commands

| Command | Entity | Calls | Preconditions / result |
| --- | --- | --- | --- |
| `MARK_INBOUND` | Package | PackageService | `DECLARED → INBOUND_TO_WAREHOUSE`。 |
| `RECEIVE_PACKAGE` | Package | PackageService.receivePackage | `INBOUND_TO_WAREHOUSE → ARRIVED_PENDING_MATCH`。 |
| `MATCH_SUCCEEDED` | Package | PackageService.matchPackage | 匹配正确 owner 后 → `READY_FOR_SHIPMENT`。 |
| `START_WAREHOUSE_PROCESSING` | Shipment | ShipmentService | `SUBMITTED → WAREHOUSE_PROCESSING`。 |
| `RECORD_WEIGHT` | Shipment | QuoteService.recordWeight | 只记录打包完成和最终重量。 |
| `GENERATE_QUOTE` | Shipment | QuoteService.generateQuote | 仅处理完成且有重量后 → `AWAITING_PAYMENT`。 |
| `PAYMENT_SUCCEEDED` | Payment | PaymentService.markPaymentSuccess | `PAYMENT_PROCESSING → PAID_AWAITING_DISPATCH`。 |
| `PAYMENT_FAILED` | Payment | PaymentService.markPaymentFailure | `PAYMENT_PROCESSING → AWAITING_PAYMENT`。 |
| `DISPATCH_SHIPMENT` | Shipment | DispatchService.dispatchShipment | 所有出库闸门满足后 → `DISPATCHED`。 |
| `ENTER_INTERNATIONAL_TRANSIT` | Shipment | TrackingService | 追加事件并推进国际运输。 |
| `ENTER_CUSTOMS_CLEARANCE` | Shipment | TrackingService | 仅能从国际运输推进。 |
| `ENTER_UK_LAST_MILE` | Shipment | TrackingService | 仅能从清关推进。 |
| `MARK_DELIVERED` | Shipment | TrackingService | 仅能从英国派送推进。 |
| `RAISE_EXCEPTION` | Package / Shipment | ExceptionService.raiseException | 需要中文五段说明和合法 resume state。 |
| `RESOLVE_EXCEPTION` | Exception | ExceptionService.resolveException | 只能恢复记录的 resume state。 |

`MARK_INBOUND` 可由 Seed 或 Ops 使用；小程序没有触发入口。

## 5. Payment Simulation

用户点击“确认并模拟付款”只会调用用户 Payment API：

1. 创建 `PROCESSING` Payment，Shipment 进入 `PAYMENT_PROCESSING`；
2. Mock Payment adapter 根据 Demo scenario 返回成功、失败或未知；
3. adapter 通过 PaymentService 写入结果；
4. 客户端刷新详情，显示中文结果。

用户请求不携带“成功 / 失败”选择；失败场景由 Seed 或 Mock Ops 配置，避免把测试控制错误做成用户功能。

## 6. Event Sequence and Safety

| Rule | Mock Ops behavior |
| --- | --- |
| 状态顺序 | Command Handler 必须通过状态机；例如生成 Quote 前必须先记录重量。 |
| Package lock | 提交时由 ShipmentService 真实锁定；Mock Ops 不可把已锁定 Package 放进另一 Shipment。 |
| Payment / Dispatch | Payment Success 只推进到等待出库；Dispatch command 再校验前置条件。 |
| Tracking | 只能按离仓、国际运输、清关、英国派送、签收的顺序进入。 |
| Exception | Raise 会阻断对应实体；Resolve 只恢复之前存储的状态。 |
| Audit | 每条 Command 记录 `MOCK_OPS` actor、命令、前后状态和时间。 |

## 7. Demo Transparency

- 开发 README 与 Demo 说明明确：仓库、支付和运输事件为模拟；
- TrackingEvent 的 `source` 保留 `MOCK_OPS`，对用户界面不显示为实时承运商数据；
- Demo 不使用真实姓名、地址、手机号、订单截图、运单或支付记录；
- Mock 金额仅用于流程演示，不能表示真实报价、税费或服务承诺。

