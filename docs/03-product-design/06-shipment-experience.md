# Shipment 模块体验

> Shipment Detail 必须回答一个完整问题：**“这次转运现在到底怎么样？”** 它是一次用户选择后形成的跨境履约上下文，而不是 Package 列表或独立物流查询页。

## Shipment Detail 信息层级

| 层级 | 内容 | 用户要获得的答案 | 出现条件 |
| --- | --- | --- | --- |
| 1 | Current Status | 这次 Shipment 当前处于什么事实状态？ | 始终展示 |
| 2 | Next Action | 我现在要做什么，还是只需等待？ | 始终展示；若无操作则明确“当前无需操作” |
| 3 | Exception | 什么问题影响了我、我应怎么做？ | 有 `EXCEPTION` 时提升到最高优先级 |
| 4 | Quote / Payment | 最终重量、费用和付款结果是什么？ | `AWAITING_PAYMENT` 及之后；Payment 状态相关 |
| 5 | Fulfillment Timeline | 已发生什么、最近更新和下一阶段是什么？ | `DISPATCHED` 及之后；早期也保留最小事件记录 |
| 6 | Included Packages | 这次到底包含哪些 Package？ | 始终可查看，默认摘要 |
| 7 | UK Address | 寄往哪里？ | 已提交后可查看 |
| 8 | Processing Evidence | 照片或打包凭据 | P1；真实可用时才展示 |

Shipment Reference 始终与 Current Status 一同展示，用于让用户辨识本次 Shipment、理解关联 Timeline，并在需要支持时提供上下文。它不是对真实承运商追踪单号的承诺。

### 状态优先于信息平铺

- `AWAITING_PAYMENT`：Quote / Payment 是主任务，Timeline 降级为辅助信息。
- `PAID_AWAITING_DISPATCH`：首要信息是“付款成功，等待实际离仓；当前无需操作”，不显示误导性的“已发货”。
- `INTERNATIONAL_TRANSIT` / `CUSTOMS_CLEARANCE` / `UK_LAST_MILE`：当前阶段和最近事件优先，完整 Timeline 提供回溯。
- `EXCEPTION`：影响、下一步、处理状态优先于常规 Timeline。
- `DELIVERED`：签收事实和历史摘要优先，不再显示待办。

## Current Status 与 Next Action

所有 Shipment Detail 顶部必须成对呈现：

```text
Current Status：发生了什么
Next Action：用户现在是否需要做什么；若不需要，谁在处理、接下来预计出现什么事件
```

示例（状态文案方向，非视觉 UI）：

| State | Current Status | Next Action |
| --- | --- | --- |
| `SUBMITTED` | 已提交，等待仓库开始处理 | 当前无需操作；下一步为仓库处理。 |
| `AWAITING_PAYMENT` | 最终重量与 Quote 已生成 | 核对费用并完成付款。 |
| `PAID_AWAITING_DISPATCH` | 付款成功，仓库尚未实际离仓 | 当前无需操作；下一步是仓库确认离仓。 |
| `DISPATCHED` | 已离开仓库，已进入后续运输 | 查看 Timeline；下一步是国际运输事件。 |
| `EXCEPTION` | 当前问题影响 Shipment 继续推进 | 查看原因和所需动作；按指引完成或获得帮助。 |

## Included Packages

Included Packages 默认展示：Package 数量、可辨识摘要和链接。用户需要时再展开全部列表或进入 Package Detail。

它的作用是回答“本次装了什么”，并保持以下边界：

- Shipment 提交后 Package 归属清楚；
- 已加入其他有效 Shipment 的 Package 不会重复出现；
- Package 详情仍保留其到仓、预报和异常上下文；
- 若规则允许撤销/取消，应在 Shipment 的当前状态中说明，而不是在 Package 列表中制造重复操作。

## Weight / Quote / Payment

P01 没有将报价描述为主要痛点，因此这里的设计目标是**可核对**，而非复杂的价格教育：

- 稳定 Shipment Reference、最终计费重量；
- 明确费用项和总价；
- Quote 状态；
- Payment 发起、处理中、成功或失败的事实；
- Payment 成功后单独显示 `PAID_AWAITING_DISPATCH`。

不在 V1 中承诺真实运费计算、优惠、税费拆分、退款或支付渠道接入。

## Fulfillment Timeline

Timeline 是一次 Shipment 的单一连续履约记录：

```text
SUBMITTED → WAREHOUSE_PROCESSING → AWAITING_PAYMENT → PAID_AWAITING_DISPATCH
→ DISPATCHED → INTERNATIONAL_TRANSIT → CUSTOMS_CLEARANCE
→ UK_LAST_MILE → DELIVERED
```

每项事件应至少显示阶段、发生时间（如有）和用户语言说明。若当前数据为模拟，需明确标示；不能伪装成实时物流。

## UK Address 与 Exception

- **UK Address：** 已提交后作为 Shipment 快照供核对；不在详情中引入未确认的改址流程。
- **Exception：** 关联正在受影响的 Shipment 阶段，说明发生什么、影响什么、用户下一步和支持对象。它是详情中的条件性最高优先级区块，而不是独立异常页面。
