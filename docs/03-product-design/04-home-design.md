# Home 设计：先回答“我现在要做什么”

> Home 不是功能入口集合。它的唯一职责是根据用户当前的 Package 与 Shipment 状态，帮助用户立即判断是否需要行动，并进入相应上下文。

## 首页信息优先级

| 优先级 | 信息区块 | 回答的用户问题 | 出现条件 | 主要去向 |
| --- | --- | --- | --- | --- |
| 1 | Action Required | 我现在必须做什么？ | 存在待付款、需要补充信息的 Package、阻塞性 Exception 或可提交的草稿 | 关联 Package / Shipment Detail 或 Creation |
| 2 | Current Journey | 我正在转运的 Shipment 到哪一步？ | 存在 `SUBMITTED` 至 `UK_LAST_MILE` 的活跃 Shipment | Shipment Detail Timeline |
| 3 | Package Overview | 我的 Package 是否到齐、可以合箱吗？ | 存在 `DECLARED`、`INBOUND_TO_WAREHOUSE`、`ARRIVED_PENDING_MATCH` 或 `READY_FOR_SHIPMENT` Package | 带预设筛选的 Package List |
| 4 | Warehouse Information | 我从哪里开始把中国购买的物品寄到仓库？ | 新用户、无 Package，或用户主动查看 | 复制地址；外部电商下单 |
| 5 | Secondary Access | 我需要管理地址、偏好或获得帮助吗？ | 用户主动进入 | Profile / Settings（P1） |

### 动态排序规则

1. 有阻塞性 `EXCEPTION` 时，Exception 在所有正常信息之前出现。
2. 有 `AWAITING_PAYMENT` 时，待付款优先于在途展示；这是用户必须完成的动作。
3. 已支付待出库时，不把“已支付”误呈现为完成，而展示 `PAID_AWAITING_DISPATCH` 的当前含义与“当前无需操作”。
4. 没有待办时，进行中的 Shipment 优先；没有 Shipment 时，展示 Package 状态；没有 Package 时，Warehouse Information 成为首要起点。

## Action Required

Action Required 只收纳用户现在需要决策或操作的事项，不把每一次状态变化都做成“待办”。

| 触发状态 | 用户需要理解 / 完成的事 | 首页应提供的直接入口 |
| --- | --- | --- |
| `AWAITING_PAYMENT` | 最终 Quote 已生成，需要核对并付款 | 对应 Shipment Detail 的 Quote / Payment 区块 |
| Package `EXCEPTION` | 某个 Package 无法按正常路径进入 Shipment | 对应 Package Detail 的异常区块 |
| Shipment `EXCEPTION` | Shipment 被问题阻塞或需要用户行动 | 对应 Shipment Detail 的异常区块 |
| `DRAFT` Shipment | 用户已选择部分 Package 但未提交 | 对应 Shipment Creation，继续完成 |
| `READY_FOR_SHIPMENT` Package | 可合箱 Package 已存在；是否立即创建 Shipment 由用户决定 | Package List 的“可合箱”筛选，而非强制待办 |

`PAID_AWAITING_DISPATCH`、`INTERNATIONAL_TRANSIT` 和 `CUSTOMS_CLEARANCE`通常不应出现在 Action Required，因为用户没有明确动作。它们属于 Current Journey，除非有 Exception。

## Current Journey

Current Journey 以**一条最相关的活跃 Shipment**为主，避免 Home 同时平铺所有运输细节。

应说明：

- 当前用户可理解的状态；
- 最近一个已知 Tracking Event；
- 下一预期阶段；
- 是否需要用户行动；
- 有多个活跃 Shipment 时，显示简要列表并进入 Shipment List。

它不承担完整 Timeline；完整事件留在 Shipment Detail。

## Package Overview

Package Overview 展示的是帮助合箱判断的数量与分组，而不是所有 Package 详情：

```text
待到仓 / 待归属确认 / 可合箱 / 已加入 Shipment / 需处理
```

对 P01 类型的 10–20 件场景，首页只提供概览和快捷筛选，避免把长 Package 列表塞进 Home。真正的盘点、多选和不可选原因都在 Package List 完成。

## Warehouse Information

对新用户或尚无 Package 的用户，Warehouse Information 是首页的主起点，内容仅包括：

- 中国仓收件地址；
- 必要的个人识别信息；
- 复制操作；
- “去国内电商下单”的明确外部边界；
- 预报下一步的简要提示。

用户复制地址并转到淘宝、拼多多等外部电商后，小程序流程在此暂时结束；产品不假装管理外部电商下单。

## Primary 与 Secondary Information

| Primary Information | Secondary Information |
| --- | --- |
| 待付款、Exception、草稿、Package 到仓/归属、当前 Shipment 状态、离仓事实 | 地址簿、通知偏好、历史记录、照片凭据、服务偏好、支持入口 |

## 非设计原则

- 不做九宫格“包裹、报价、物流、客服、优惠券、会员”等功能入口；
- 不把所有 Shipment Timeline 铺在首页；
- 不用“已支付”替代“已离仓”；
- 不把可合箱 Package 强迫视为立即需要操作，用户何时合箱是主动决策；
- 不用营销信息抢占待付款或 Exception 的注意力。
