# 开发计划

> 按业务闭环推进，而不是先堆完所有页面。每一阶段都以可测试的领域事实为完成条件；不改变已冻结 MVP Scope。

## Phase 0：项目初始化

| Item | Plan |
| --- | --- |
| Goal | 建立可本地运行、可测试、与 Prototype 隔离的开发基础。 |
| Backend | TypeScript / Fastify、环境配置、统一错误 middleware、迁移框架、Demo Session。 |
| Mini Program | 创建原生 TypeScript 工程、API client、中文全局 loading / error 基础能力、TabBar 骨架。 |
| Tests | typecheck、lint、空服务 smoke test、迁移 smoke test。 |
| Definition of Done | 项目不依赖 Prototype；空数据库可迁移；客户端可连接本地 API。 |

建议目录：

```text
miniprogram/       # 正式微信小程序代码
server/            # API、领域服务、迁移、seed、测试
docs/              # 产品与技术文档
prototype/         # 已冻结的独立交互原型，不被生产代码引用
```

## Phase 1：领域模型、数据库与 Seed

| Item | Plan |
| --- | --- |
| Goal | 让 Package、Shipment、Quote、Payment、Event、Exception 与审计有真实持久化。 |
| Backend | Schema、migration、repository、transaction helper、状态枚举、AuditService、seed scenario。 |
| Mini Program | 无新增业务页面；仅准备 DTO 类型与 Demo Session。 |
| Tests | Schema constraint、迁移、seed、唯一索引、乐观锁。 |
| Definition of Done | 可从空数据库建立可复现 Demo 场景；不能插入非法有效 Package 关联。 |

## Phase 2：Package Management

| Item | Plan |
| --- | --- |
| Goal | 完成仓地址、预报、包裹列表、详情、筛选与 Package 状态读取。 |
| Backend | PackageService、Warehouse 地址 API、Package 列表 / 详情 / 预报 API、ownership guard。 |
| Mini Program | 首页仓地址区块；包裹列表、详情、预报页面；中文表单 / 空 / 加载 / 错误状态。 |
| Tests | 预报去重、最小信息、归属、筛选、中文状态 DTO。 |
| Definition of Done | 用户可真实创建 `DECLARED` Package，并只能看到自己的 Package；Mock Ops 可合法推进到可合箱。 |

## Phase 3：Shipment Consolidation

| Item | Plan |
| --- | --- |
| Goal | 实现多 Package 选择、草稿、地址快照、提交、Reference 与锁定。 |
| Backend | ShipmentService、draft / submit / cancel API、ShipmentPackage transaction 与 idempotency。 |
| Mini Program | 选择模式、固定底栏、创建转运单、转运列表 / 详情基本状态。 |
| Tests | 10 选 8、非可合箱拒绝、并发锁定、提交幂等、取消释放。 |
| Definition of Done | 选择 8 件仅在提交时锁定；提交成功后可在详情看到唯一转运单号。 |

## Phase 4：Warehouse Processing、Quote 与 Payment Simulation

| Item | Plan |
| --- | --- |
| Goal | 实现称重 → Quote Snapshot → 模拟付款，并严格区分已付款和已出库。 |
| Backend | QuoteService、PaymentService、Mock Payment adapter、相关 Ops commands。 |
| Mini Program | 转运单详情中的处理、最终报价、模拟付款与付款结果状态。 |
| Tests | 无重量不可报价；Quote 冻结；Payment failure；Payment success 不出库。 |
| Definition of Done | 用户可见最终重量和模拟费用；付款成功后只显示“已付款，等待仓库发出”。 |

## Phase 5：Dispatch 与 Tracking

| Item | Plan |
| --- | --- |
| Goal | 完成实际出库事实、阶段级时间线和签收。 |
| Backend | DispatchService、TrackingService、Ops command、TrackingEvent API DTO。 |
| Mini Program | 转运单详情时间线随当前状态变化；首页 / 列表读取进行中 Shipment。 |
| Tests | 出库闸门、合法阶段顺序、签收约束、刷新不推进状态。 |
| Definition of Done | 可从已付款待出库合法推进至已签收，且时间线与状态一致。 |

## Phase 6：Exception Handling

| Item | Plan |
| --- | --- |
| Goal | 让 Package / Shipment 的异常阻断、说明与恢复可执行。 |
| Backend | ExceptionService、五段中文异常 DTO、Ops raise / resolve command。 |
| Mini Program | 包裹 / 转运单详情内的异常优先区块；不提供自助解决按钮。 |
| Tests | 阻断、恢复、无用户 resolve endpoint、Technical Error 不创建 Exception。 |
| Definition of Done | 异常路径能从创建、用户理解到 Ops 解决和正确恢复完整演示。 |

## Phase 7：首页聚合与状态刷新

| Item | Plan |
| --- | --- |
| Goal | 将已完成事实按首页优先级聚合并提供可靠刷新。 |
| Backend | `GET /home` 聚合、行动优先级、最近更新时间。 |
| Mini Program | 待处理事项 → 当前转运 → 包裹概览 → 中国仓地址；下拉刷新 / 回前台刷新。 |
| Tests | 行动优先级、局部加载失败、无 Package 引导。 |
| Definition of Done | 首页是任务入口，不替代事实详情，不成为功能九宫格。 |

## Phase 8：质量收口与演示准备

| Item | Plan |
| --- | --- |
| Goal | 完成验收、错误态、Mock 透明度与作品集交付说明。 |
| Backend | 安全检查、Audit 查询辅助、seed reset、CI 基础脚本。 |
| Mini Program | PRD 验收走查、中文文案检查、加载 / 错误 / 空状态收口。 |
| Tests | Happy Path、Exception Path、API contract、关键手工回归与 UT01 任务回归。 |
| Definition of Done | 真实 API 驱动 7 个 P0 页面；无已知阻塞状态漏洞；README 说明 Mock 边界。 |

## Sequencing constraints

- Phase 1 是所有后续阶段前置；
- Phase 2 的 Package 可合箱状态是 Phase 3 的前置；
- Phase 3 的 Package 锁定与 Shipment 提交是 Phase 4–6 的前置；
- Phase 4 的成功 Payment 是 Phase 5 Dispatch 的前置；
- Phase 6 可在 Phase 4/5 的服务完成后接入，但需在 Phase 8 前覆盖全部关键路径；
- 不在任何阶段增加 P1 地址簿、通知、照片凭据、服务偏好、优惠券、积分或真实第三方接入。

