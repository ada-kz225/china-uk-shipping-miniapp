# 关键业务规则

> 本文将 MVP 的业务约束写成可讨论、可验证的规则，而不是宣称为现有服务事实。除非标为“P01 行为支持”，其余执行细节均是 **Product Assumption**，需要在未来获得真实业务规则后校准。

## Package

| ID | 规则 | 依据与状态 |
| --- | --- | --- |
| BR-001 | 用户在国内购物前需要获得 Warehouse 收件地址及个人识别信息；V1 提供地址与填写说明。 | P01 行为支持地址、专属姓名/编号/电话的使用；具体格式为 Product Assumption。 |
| BR-002 | Package 预报使用运单号和商品信息/截图的最小组合；用户提交后生成 `DECLARED` Package。 | P01 实际提交订单截图与运单号，并说明其用于商品/归属识别和收货核对。是否每件都必须预报为 Product Assumption。 |
| BR-003 | 只有 Warehouse 已实际收货、已匹配到 User、且无阻塞性 Exception 的 Package，才能进入 `READY_FOR_SHIPMENT`。 | P01 在国内物流签收后仍需确认已入个人集合；精确核验流程为 Product Assumption。 |
| BR-004 | 未预报或无法匹配的物理包裹不自动归入用户 Package 集合；应以 `EXCEPTION` 告知需要补充的信息。 | Product Assumption；用于避免错误归属。 |
| BR-005 | Package 照片、验货结果和装箱凭据可作为关联记录，但不改变 Package 主状态。 | P01 认为照片有帮助且可作为证据；可用性与记录范围为 Product Assumption。 |

## Shipment 与 Consolidation

| ID | 规则 | 依据与状态 |
| --- | --- | --- |
| BR-006 | 一个 Shipment 必须包含至少一个 `READY_FOR_SHIPMENT` Package。 | V1 Product Assumption；保证 Shipment 有可履约对象。 |
| BR-007 | 一个 Package 任一时刻只能属于一个有效 Shipment。 | V1 Product Assumption；防止同一实物被重复选择或发运。 |
| BR-008 | 用户在 `DRAFT` 可自由增删 Package、修改地址和服务偏好；Package 在草稿阶段不被最终锁定。 | V1 Product Assumption；符合 P01 在封箱前可修改选择的行为方向。 |
| BR-009 | 提交 Shipment 后，Package 进入 `IN_SHIPMENT`，Shipment 进入 `SUBMITTED`；系统需展示本次包含哪些 Package。 | Directionally supported by P01；具体锁定时点为 Product Assumption。 |
| BR-010 | 在 Warehouse 尚未开始处理前，V1 允许取消或撤回已提交 Shipment；处理开始后，不支持自助修改，应显示当前限制和支持指引。 | Product Assumption。P01 只表明封箱前可修改，不足以确认真实取消窗口。 |
| BR-011 | 取消符合规则的 Shipment 后，其 Package 回到 `READY_FOR_SHIPMENT`；若已发生物理打包/出库，则不能通过 V1 自助取消。 | Product Assumption；真实仓库处理与取消规则待确认。 |

## Quote 与 Payment

| ID | 规则 | 依据与状态 |
| --- | --- | --- |
| BR-012 | Warehouse 处理完成、称重后，为 Shipment 生成一个最终 Quote，状态进入 `AWAITING_PAYMENT`。 | P01 行为支持“封箱称重后获知重量/价格再付款”；真实处理顺序与 Quote 版本规则为 Product Assumption。 |
| BR-013 | Quote 至少应关联计费重量、费用项和总价，以便用户付款前核对。 | P01 会核对重量、单价和人工打包费；真实计费公式、币种、税费和有效期为 Product Assumption。 |
| BR-014 | 用户发起 Payment 后，Shipment 必须先经历付款结果确认；Payment 成功才进入 `PAID_AWAITING_DISPATCH`。 | V1 Product Assumption；P01 的实际付款方式为微信转账，支付确认机制未获得。 |
| BR-015 | Payment 失败、取消或未完成时，Shipment 保持/回到 `AWAITING_PAYMENT`，且不允许出库。 | V1 Product Assumption。 |

## Dispatch 与 Tracking

| ID | 规则 | 依据与状态 |
| --- | --- | --- |
| BR-016 | Shipment 只有在 Payment 成功、无阻塞性 Exception 且 Warehouse 确认实际离仓后，才能进入 `DISPATCHED`。 | P01 行为支持付款后仍需等待离仓；精确出库前置条件为 Product Assumption。 |
| BR-017 | `PAID_AWAITING_DISPATCH`、`DISPATCHED` 和 `DELIVERED` 必须是不同状态。 | P01 希望查询是否离仓；这是防止“付款/发货/签收”混淆的 V1 设计约束。 |
| BR-018 | 每个 Tracking Event 至少关联时间、阶段和用户可理解的说明；若有信息来源，可一并标明。 | P01 使用多个追踪入口；真实事件字段、更新频率和来源可靠性为 Product Assumption。 |
| BR-019 | `DELIVERED` 只能在英国末端承运商的签收事实进入系统后出现；国际运输、清关或英国派送不等于完成。 | V1 Product Assumption；真实签收事件接入方式待确认。 |

## Exception 与下一步

| ID | 规则 | 依据与状态 |
| --- | --- | --- |
| BR-020 | Exception 必须关联具体 Package 或 Shipment，并显示：影响、原因（如已知）、用户下一步和当前处理状态。 | Directionally supported by P01 的末端派送异常；异常字段与责任范围为 Product Assumption。 |
| BR-021 | 阻塞性 Exception 阻止相关阶段继续，例如 Package 未匹配时不可加入 Shipment、出库阻塞时不可进入 `DISPATCHED`。 | V1 Product Assumption。 |
| BR-022 | V1 不承诺自助解决全部 Exception；当需人工处理时，应提供上下文明确的支持指引，而不是只显示“请联系客服”。 | P01 在 Royal Mail 异常时通过电话客服解决；具体升级路径为 Product Assumption。 |
| BR-023 | 任一用户可见状态都应回答“现在是什么”“下一步由谁做”“用户是否需要行动”。 | P01 的常规查询依赖客服；这是 V1 的核心信息透明度规则。 |

## 规则待验证清单

以下规则不应在作品集中伪装成已确认的业务政策：

- 预报是否为所有 Package 的必经步骤；
- 仓库匹配、验货、拍照、可合箱和锁定的实际时点；
- 计费重量、价格、税费、人工打包费及 Quote 有效期；
- 支付渠道、支付成功确认、取消/退款和出库承诺；
- 清关、承运商、物流事件、签收和末端异常的真实数据来源；
- 是否允许服务偏好、其费用及可用条件。
