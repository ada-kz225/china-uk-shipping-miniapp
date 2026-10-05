# 信息架构

> V1 的信息架构从用户需要立即回答的问题出发：Package 到仓了吗、是否齐全可合箱、我现在要做什么、Shipment 到哪一步、异常后怎么办。它不以仓库后台、营销能力或功能九宫格为组织方式。

## 任务优先级

| 用户问题 | 产品任务 | 最短入口 |
| --- | --- | --- |
| 我的 Package 到仓了吗？ | 查看 Package 到仓、归属与可选状态 | `包裹` Tab；首页的 Package 概览 |
| Package 是否齐了，可以合箱吗？ | 盘点可用/未到/异常 Package，并发起选择 | `包裹` Tab |
| 我有哪些事情需要处理？ | 查看待付款、异常、需要补充信息等动作 | `首页` Action Required |
| 我的 Shipment 到哪个阶段？ | 查看当前状态、下一步和连续 Timeline | `转运` Tab；首页 Current Journey |
| 异常以后我该做什么？ | 查看影响、所需动作与支持指引 | 关联的 Package / Shipment Detail |

## 推荐 TabBar：三项任务型入口

```text
首页             包裹             转运
Home             Packages         Shipments
```

| 一级入口 | 核心任务 | 为什么是一级入口 | 二级页面 / 状态 |
| --- | --- | --- | --- |
| 首页 | 判断“现在最需要处理什么” | 它聚合跨 Package 与 Shipment 的待办、在途进展和新用户起点；不是功能目录。 | Action Required、Current Journey、Package Overview、Warehouse Information、个人/帮助入口 |
| 包裹 | 确认、盘点、预报和选择多个 Package | P01 的主要摩擦发生在 Package 到仓确认与 10–20 件包裹的人工核对；这是合箱前的高频任务。 | Package List、Package Detail、Declare Package、选择模式、Shipment Creation |
| 转运 | 管理一次 Shipment 的提交、报价、付款和履约 | 用户付款后仍需知道是否离仓；Shipment 是承载 Quote、Payment、Tracking 与 Exception 的核心实体。 | Shipment List、Shipment Detail、Quote / Payment 区块、Timeline、Exception 区块 |

### 为什么不将“我的”设为第四个 Tab

`我的`中的个人资料、地址簿、帮助和设置不构成当前 P0 闭环。英国地址在创建 Shipment 时内联填写；地址簿、通知和支持入口属于 P1。因此它们作为二级入口进入，而不是与“包裹”“转运”争夺 TabBar 位置。

这不是“微信小程序永远不该有我的 Tab”的判断；而是 V1 为减少导航选择、突出当前任务所作的范围决定。

## 二级信息架构

```text
首页
├─ Action Required
│  ├─ Shipment Detail（待付款 / 异常 / 待补充信息）
│  └─ Package Detail（Package 异常）
├─ Current Journey
│  └─ Shipment Detail（当前运输 Timeline）
├─ Package Overview
│  └─ Package List（预设筛选）
├─ Warehouse Information
│  └─ 复制地址 → 外部电商下单（小程序流程结束）
└─ Profile / Settings（P1）
   └─ Address Book / Support（P1）

包裹
├─ Package List
│  ├─ Package Detail
│  ├─ Declare Package
│  └─ 多选可用 Package → Shipment Creation

转运
├─ Shipment List
└─ Shipment Detail
   ├─ Quote / Payment（同一详情内的上下文区块）
   ├─ Fulfillment Timeline
   ├─ Included Packages
   └─ Exception（同一详情内的上下文区块）
```

## 高频任务与低频能力的分层

| 层级 | 能力 | 设计理由 |
| --- | --- | --- |
| 一级 / 首屏任务 | 待付款、异常、Package 到仓/可合箱、进行中的 Shipment | 直接影响用户是否需要行动或能否推进闭环。 |
| 二级任务页 | 预报、Package Detail、Shipment Creation、Shipment Detail | 需要更多上下文或输入，但仍是 P0 主流程。 |
| 详情内区块 | Quote、Payment、Timeline、Included Packages、英国地址、Exception | 都服务同一个 Shipment，拆成独立页面会打断用户对“这次转运”的理解。 |
| P1 二级入口 | 地址簿、通知偏好、支持入口、照片凭据 | 改善体验但不阻塞首次闭环。 |

## 为什么不增加更多 Tab

- **不设“报价/支付”Tab：** 费用和付款只属于某一个 Shipment，脱离 Shipment 会失去上下文。
- **不设“物流”Tab：** 物流事件是 Shipment 生命周期的一部分；独立入口会迫使用户在“订单”和“物流”之间切换。
- **不设“客服”Tab：** 当前问题是减少常规状态查询的客服依赖；完整客服系统不在 V1 范围。
- **不设“服务/会员”Tab：** 服务偏好为 P1，优惠、积分和会员已在 Out of Scope。

## 信息架构原则

1. 用户从任何入口都应能回到关联的 Package 或 Shipment，而不是看到孤立状态。
2. 所有待操作事项优先汇聚到首页；状态本身仍以实体详情为唯一事实来源。
3. 一次 Shipment 的 Quote、Payment、Dispatch 与 Tracking 不拆散到多个页面。
4. 发生 Exception 时不创建无上下文的“异常中心”；Exception 绑定其影响的 Package 或 Shipment。
