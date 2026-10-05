# Product Design 总结

> 本阶段把 Discovery 和 MVP Definition 转换为 V1 的信息架构、任务流、页面边界与状态行为。没有进行视觉 UI、前后端、API 或数据库设计。

## 1. 推荐 TabBar

```text
首页｜包裹｜转运
```

- 首页：跨实体的待办、当前进展和新用户 Warehouse 起点；
- 包裹：预报、到仓确认、盘点和多选合箱；
- 转运：Shipment 的提交、Quote、Payment、Dispatch 与履约 Timeline；
- `我的`不进入 V1 TabBar，作为 P1 的二级入口，避免挤占高频核心任务。

## 2. 页面总数

**8 个页面：7 个 P0 + 1 个 P1。**

- P0：Home、Package List、Package Detail、Declare Package、Shipment List、Shipment Creation、Shipment Detail；
- P1：Profile / Settings。

Quote / Payment、Tracking、Address、Exception 不拆成独立页面，均放入关联实体的上下文，避免不必要跳转。

## 3. 核心页面

| 页面 | 核心职责 |
| --- | --- |
| Home | 告诉用户当前最需要处理什么。 |
| Package List | 让用户盘点 10–20 件 Package 的到仓、归属、可选性与异常。 |
| Shipment Creation | 将多个可用 Package 明确形成一次 Shipment。 |
| Shipment Detail | 回答“这次转运现在到底怎么样”，承接 Quote、Payment、Dispatch、Timeline 与 Exception。 |

## 4. Homepage 信息优先级

```text
Action Required
→ Current Journey
→ Package Overview
→ Warehouse Information
→ P1 Secondary Access
```

Exception 和待付款优先于一切普通信息；`PAID_AWAITING_DISPATCH` 属于当前进展而不是待办，必须明确“当前无需操作”。

## 5. Package 模块核心设计

- 以任务导向状态组织：等待到仓、待确认、可合箱、已加入转运、需处理；
- 清楚区分“Warehouse 已收货待匹配”和“已归属可合箱”；
- 只允许 `READY_FOR_SHIPMENT` 进入多选；
- 选择模式固定显示已选数量、未选可用件和不可选原因；
- Package 提交到 Shipment 前不被最终锁定，提交后显示关联 Shipment。

## 6. Shipment 模块核心设计

- 顶部始终成对呈现 Current Status 与 Next Action；
- `PAID_AWAITING_DISPATCH` 明确表达已支付但尚未实际离仓；
- Quote、Payment、Timeline、Included Packages、地址和 Exception 置于同一 Shipment Detail；
- Timeline 由 `DISPATCHED` 持续到 `DELIVERED`，不拆出独立物流页；
- Exception 优先展示影响、下一步和支持对象。

## 7. 关键 User Flow 决策

1. 获取 Warehouse 地址后，流程在外部电商下单处结束；不假装管理淘宝、拼多多下单。
2. Package 的物理到仓与归属确认分为 `ARRIVED_PENDING_MATCH` 和 `READY_FOR_SHIPMENT`，用户不能自行跳过匹配。
3. 多个 Package 只有在 Shipment 提交时才改变为 `IN_SHIPMENT`；草稿选择不提前锁定。
4. Quote 是 Payment 的必要前置事实，但不被错误定义为 P01 的首要痛点。
5. Payment 成功、实际 Dispatch 与最终 Delivered 是三个严格不同的 Shipment 事实。

## 8. 关键 Status → Action 设计

| 状态 | 用户应知道的关键信息 |
| --- | --- |
| `ARRIVED_PENDING_MATCH` | 仓库已收货，正在确认归属；当前无需自行确认，除非系统要求补充信息。 |
| `READY_FOR_SHIPMENT` | 已归属，可选择加入本次 Shipment。 |
| `AWAITING_PAYMENT` | 最终 Quote 已生成，需要核对并付款。 |
| `PAID_AWAITING_DISPATCH` | 付款成功，仍等待实际离仓；当前无需操作。 |
| `EXCEPTION` | 发生什么、影响什么、现在谁在处理、用户需做什么、如何获得帮助。 |

## 9. 当前仍存在的 Assumptions

- 微信小程序是否优于网站/App作为主要商业入口；
- 是否每个 Package 都必须预报，以及实际匹配/验货规则；
- Warehouse、Quote、Payment、Dispatch、Tracking Event 的真实数据来源、时效与可靠性；
- 运费公式、支付渠道、取消规则、清关和末端承运商规则；
- 多 Package 规模、合箱决策和异常需求在更多用户中的普适程度；
- P1 的照片、通知、地址簿、服务偏好和支持入口的优先级。

## 10. End-to-End Walkthrough：Primary User

以下 walkthrough 使用一个与 P01 任务相近、但不等同于其真实订单的**模拟场景**：英国留学生先后购买 12 个中国电商 Package，准备选择其中 10 个创建一次 Shipment。

| 步骤 | 用户路径 | 状态 / 信息是否清楚 | 下一步是否清楚 | 设计检查 |
| --- | --- | --- | --- | --- |
| 1 | 在 Home 复制 Warehouse 地址，前往外部电商购物 | 清楚：这是外部购买起点，不创建假订单 | 清楚：下单后回来预报 | 有入口；外部流程边界清楚 |
| 2 | 逐个预报 12 个 Package | 清楚：每件为 `DECLARED`，不等于已到仓 | 清楚：等待送仓 | 有入口；需后续验证是否所有件均必须预报 |
| 3 | Package 分批到仓 | 清楚：部分为 `ARRIVED_PENDING_MATCH`，部分为 `READY_FOR_SHIPMENT`，未到件仍可见 | 清楚：只有 Ready 件可合箱；可等待其他件 | 无需问客服才能理解状态；真实事件在 V1 为模拟 |
| 4 | 用户盘点后选择 10 件 | 清楚：选择模式显示已选 10 件、未选可用件和不可选原因 | 清楚：确认 Package 与地址后提交 | Package 与 Shipment 未混淆；不自动替用户合箱 |
| 5 | 提交 Shipment 并填写英国地址 | 清楚：10 件变为 `IN_SHIPMENT`，Shipment 为 `SUBMITTED` | 清楚：等待 Warehouse Processing | 地址为本次 Shipment 快照，不需要独立 P0 页面 |
| 6 | Warehouse 处理并生成 Quote | 清楚：`WAREHOUSE_PROCESSING` 后进入 `AWAITING_PAYMENT`；显示重量、费用和总价 | 清楚：核对并支付 | Quote 是基础交易能力，不被伪装为主要痛点 |
| 7 | 模拟 Payment 成功 | 清楚：进入 `PAID_AWAITING_DISPATCH`，不是已发货 | 清楚：等待 Warehouse 实际离仓 | Payment ≠ Dispatch 被明确保留 |
| 8 | 模拟离仓、国际运输、清关、英国派送 | 清楚：每一阶段位于同一 Shipment Timeline | 清楚：通常无需操作；有 Exception 才出现行动 | 无需在多个物流页之间切换 |
| 9 | Delivered | 清楚：仅签收事件进入 `DELIVERED` | 清楚：闭环结束，可查看历史 | Dispatch ≠ Delivered 被明确保留 |

### Walkthrough 发现的问题与边界

1. **没有新的无意义客服断点：** 到仓、重量、离仓和运输状态都有实体上下文入口；异常才提供明确支持指引。
2. **外部事件仍是关键 Assumption：** 没有真实 Warehouse / Payment / Tracking 接入时，状态必须作为 Simulated 展示，不能承诺实时。
3. **预报规则仍未确认：** Flow 支持预报，但“是否 12 件都必须预报”不能写成已证实业务事实。
4. **10–20 件的选择已被承接：** 多选、筛选、未选/不可选原因降低盘点遗漏风险；仍需后续可用性测试验证是否足够清楚。
5. **没有 MVP 外功能渗入：** 未增加会员、优惠、完整客服、仓库作业、真实支付或复杂增值服务。

## 下一阶段建议

在范围确认后，进入 **Interaction Design / Low-fidelity Wireframe Definition**：为已确定的 7 个 P0 页面定义任务布局、信息层级、关键组件和状态文案，并对 10–20 件 Package 的多选流程进行可用性测试。此时仍应保持外部事件模拟边界，之后才讨论视觉 UI 或开发。
