# 产品定义总结

> 本总结是 Discovery → Assumption-led MVP Definition 的决策快照。它基于一位独立真实受访者 P01 的探索性证据与明确标记的 Product Assumption；不代表已完成市场验证。

## 1. Primary User

V1 首要用户是：**在英国、购买多个中国电商商品并进行周期性转运的中国留学生个人用户。**

P01 直接支持这是一个真实起始场景；长期居英华人与其他高频中国电商购买者是 Secondary User 候选，不等于已确认人群优先级。

## 2. Core JTBD

1. 当多个国内 Package 陆续送达 Warehouse 时，确认它们是否到仓并归属自己，从而判断本次是否可以合箱。
2. 当有一批可处理 Package 时，选择本次要寄出的物品并提交一个 Shipment，从而控制这次发什么、何时发。
3. 当 Shipment 已称重、报价和付款后，自助确认是否离仓及后续履约，从而不把付款误认为已发运。

## 3. Top Product Problems

| Problem | Confidence |
| --- | --- |
| Package 到仓/归属无法自助确认，订单盘点需要人工跨工具处理 | Medium |
| 到仓确认、打包重量、离仓等关键状态依赖客服且受时差影响 | Medium |
| 多个 Package → 一次 Shipment 的选择仍通过人工协调 | Low |
| 英国末端异常时缺少可行动的信息 | Low |

报价清晰度不是 P01 的 Top Problem；重量、Quote 与 Payment 仍保留在 P0，因为它们是完成交易闭环的基础能力。

## 4. V1 Product Goal

验证用户是否能在一个连续入口中完成：确认 Package → 选择并提交 Shipment → 查看重量与 Quote → 支付 → 确认离仓 → 追踪至签收/异常下一步，并减少常规状态查询对人工客服的依赖。

## 5. P0 Capabilities

- Warehouse 地址与最小预报；
- Package 列表、到仓/归属状态和 Package 选择；
- Shipment 草稿、提交、英国收件地址和仓库处理状态；
- 最终重量、Quote、模拟 Payment 与付款结果；
- 已支付与已离仓的独立状态；
- 最小国际履约阶段、签收与 Exception 下一步指引。

## 6. P1 Capabilities

- Package 验货、物品总览、装箱照片凭据；
- 关键状态通知；
- 地址簿；
- 上下文明确的支持入口；
- 有限的加固、去包装、运输时效等服务偏好。

## 7. Out of Scope

- 优惠券、积分、会员、推荐和内容能力；
- 完整 WMS、多仓调度、多国家/多线路/自动比价；
- 企业账户、完整客服/工单、复杂增值服务、赔付退款；
- 真实微信支付、真实 Warehouse 同步、真实国际物流/承运商 API、自动读取电商订单。

这些范围要么不阻塞首个闭环，要么需要尚未确认的真实外部能力。详见 [08-out-of-scope.md](08-out-of-scope.md)。

## 8. Package → Shipment 核心关系

```text
User
 └─ N Package（预报 → 到仓 → 已归属 → 可合箱）
       ↓ 用户选择并提交
    1 Shipment（处理 → Quote → Payment → 离仓 → 运输 → 签收）
```

- 一个 Shipment 包含一个或多个 Package；
- 一个 Package 同时只能归属一个有效 Shipment；
- Package 解决“这件物品能否被本次选择”，Shipment 解决“本次寄送履约到哪里”。

## 9. 核心业务闭环

```text
获得 Warehouse 地址
→ 预报/确认 Package 到仓与归属
→ 盘点并选择 Package
→ 提交 Shipment
→ Warehouse 处理并产生 Quote
→ Payment 成功
→ 等待并确认 Dispatch
→ 国际运输 → 清关 → 英国派送 → Delivered
```

真实业务事件不可用时，作品集演示必须标为 Simulated。

## 10. Package State

```text
DECLARED
→ INBOUND_TO_WAREHOUSE
→ ARRIVED_PENDING_MATCH
→ READY_FOR_SHIPMENT
→ IN_SHIPMENT

任意适当阶段 → EXCEPTION → 解决后回到相应阶段
```

## 11. Shipment State

```text
DRAFT
→ SUBMITTED
→ WAREHOUSE_PROCESSING
→ AWAITING_PAYMENT
→ PAYMENT_PROCESSING
→ PAID_AWAITING_DISPATCH
→ DISPATCHED
→ INTERNATIONAL_TRANSIT
→ CUSTOMS_CLEARANCE
→ UK_LAST_MILE
→ DELIVERED

EXCEPTION：问题处理后恢复相应阶段
CANCELLED：仅限实际离仓前的允许窗口
```

`PAID_AWAITING_DISPATCH ≠ DISPATCHED ≠ DELIVERED`。

## 12. 当前 Product Assumptions

- 微信小程序是否比网站/App更适合作为主要入口；
- 多 Package 模式在其他用户中的频率、规模和优先级；
- 预报是否全部必需，以及仓库归属/验货/处理规则；
- Quote 公式、支付渠道、出库承诺、取消和退款规则；
- Warehouse、Payment、Tracking Event、签收和 Exception 的真实数据来源与准确性；
- 地址复用、通知、照片凭据、服务偏好和支持入口的优先级。

## 一致性检查：从证据到 MVP

| Discovery Evidence | Product Problem | User Need | JTBD | P0 Capability | Flow / State 承接 |
| --- | --- | --- | --- | --- | --- |
| P01 在国内签收后仍确认 Warehouse 收货/归属，且人工核对订单很麻烦 | 到仓归属与盘点不透明 | 查看 Package 是否到仓、归属、可选 | JTBD 1 | Package 预报、列表、到仓/归属状态 | Package `DECLARED` → `READY_FOR_SHIPMENT`；流程 2–4 |
| P01 有 10–20 个 Package，会选取/排除后合箱 | Package → Shipment 的选择需人工协调 | 选择本次 Package，形成明确 Shipment | JTBD 2 | Package 选择、Shipment 草稿/提交 | `READY_FOR_SHIPMENT` → `IN_SHIPMENT`；流程 5–6 |
| P01 付款后只能问客服是否离仓，且点名希望自助查询重量/离仓 | 仓库关键状态依赖客服 | 查看重量、Quote、Payment 与 Dispatch 的独立事实 | JTBD 3 | Quote、Payment、Dispatch 状态 | `AWAITING_PAYMENT` → `PAID_AWAITING_DISPATCH` → `DISPATCHED`；流程 7–10 |
| P01 曾遇英国派送状态停滞，电话联系承运商 | 异常缺少下一步 | 知道影响、行动与支持对象 | JTBD 3 | 最小 Tracking 与 Exception 指引 | `UK_LAST_MILE` → `EXCEPTION`；流程 11–13 |

### 范围检查结论

- 每项 P0 均能追溯到核心问题、JTBD 和最小闭环；没有为“丰富功能”保留的孤立 P0。
- P01 的照片凭据和服务偏好有行为证据，但不阻塞闭环，已进入 P1。
- 地址簿、通知和完整支持能力有合理方向但无足够优先级证据，已留在 P1。
- 真实支付、仓库和物流接入无法由当前证据确认，已用 Simulated 边界承接，而非伪装为 P0 的真实能力。
