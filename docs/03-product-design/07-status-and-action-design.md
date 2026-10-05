# 状态与行动设计

> 目标不是让用户记住状态码，而是让任何状态都回答三个问题：**现在发生了什么？我需不需要做什么？接下来会发生什么？** 状态码用于保证业务逻辑一致，用户看到的是与其任务相关的解释。

## Package State → Action

| State | User Meaning | What User Sees | Available Action | Next Expected Event |
| --- | --- | --- | --- | --- |
| `DECLARED` | 已预报，Warehouse 尚未确认收货 | “已预报，等待包裹送往仓库”；国内运单号与预报信息 | 查看预报；在允许窗口更正预报信息 | 国内包裹进入在途或 Warehouse 收货事件 |
| `INBOUND_TO_WAREHOUSE` | Package 正在送往 Warehouse | “正在送往仓库”；最近已知国内物流信息（如有） | 查看状态；无需合箱操作 | Warehouse 物理收货事件 |
| `ARRIVED_PENDING_MATCH` | Warehouse 已收货，但归属/可处理性尚未确认 | “仓库已收货，正在确认是否归入你的 Package”；最近更新 | 当前无需操作，除非系统明确要求补充信息 | 匹配成功进入可合箱，或出现 Exception |
| `READY_FOR_SHIPMENT` | 已归属且可以加入一次 Shipment | “已确认归属，可以合箱”；可选标记 | 加入多选；查看详情 | 用户选择创建/提交 Shipment，或继续等待其他 Package |
| `IN_SHIPMENT` | 已属于某次已提交 Shipment | “已加入转运”；关联 Shipment 标识与状态 | 查看关联 Shipment | Warehouse 处理、Quote、Payment、Dispatch 与后续履约由 Shipment 表达 |
| `EXCEPTION` | Package 无法沿正常路径继续 | 发生了什么、影响什么、当前处理状态、需要补充什么或联系谁 | 按明确指引补充信息 / 获得支持 | 问题解决后回到适当的 Package 状态 |

### Package 文案约束

- 不把国内物流“已签收”写成“已可合箱”；
- `ARRIVED_PENDING_MATCH` 不要求用户点击“确认收货”来替代 Warehouse 匹配；
- 只有 `READY_FOR_SHIPMENT` 才出现批量选择能力；
- `IN_SHIPMENT` 必须说明“属于哪次 Shipment”，避免用户误以为 Package 丢失；
- Exception 必须给出行动或“当前无需操作”，不能只显示红色状态。

## Shipment State → Action

| State | User Meaning | What User Sees | Available Action | Next Expected Event |
| --- | --- | --- | --- | --- |
| `DRAFT` | 已开始准备本次 Shipment，尚未提交 | 已选 Package 数、未选可用 Package、地址是否完成 | 增删 Package；填写/修改地址；提交或放弃草稿 | 用户提交，或取消草稿 |
| `SUBMITTED` | 已提交，等待 Warehouse 开始处理 | “已提交，等待仓库开始处理”；稳定 Shipment Reference 与本次包含的 Package | 查看内容；在允许窗口内取消 / 撤回（Product Assumption） | `WAREHOUSE_PROCESSING` 或处理前 Exception |
| `WAREHOUSE_PROCESSING` | Warehouse 正在检查、打包和称重 | “仓库正在处理”；当前处理阶段；可修改边界 | 当前通常无需操作；若有要求则按提示处理 | Quote 生成，或 Exception |
| `AWAITING_PAYMENT` | 最终重量与 Quote 已生成，等待付款 | 计费重量、费用项、总价、Quote 状态 | 核对 Quote；发起 Payment | `PAYMENT_PROCESSING` |
| `PAYMENT_PROCESSING` | 正在确认 Payment 结果 | “正在确认付款结果”；防止重复付款说明 | 等待结果；不要重复发起 Payment | 成功进入已付款待出库，失败回到待付款 |
| `PAID_AWAITING_DISPATCH` | Payment 已成功，但 Warehouse 尚未实际离仓 | “付款成功，仓库等待实际出库”；当前无需操作 | 查看最近事件；无需反复询问客服 | `DISPATCHED` 或出库阻塞 Exception |
| `DISPATCHED` | Shipment 已实际离开 Warehouse | “已离开仓库，进入后续运输”；最近离仓事件 | 查看 Timeline | `INTERNATIONAL_TRANSIT` |
| `INTERNATIONAL_TRANSIT` | 正在国际运输 | 当前阶段、最近 Tracking Event、下一预期阶段 | 查看 Timeline；通常无需操作 | `CUSTOMS_CLEARANCE` 或运输 Exception |
| `CUSTOMS_CLEARANCE` | 正在清关 | “正在清关”；最近事件与是否需要用户行动 | 通常无需操作；有明确要求时按指引处理 | `UK_LAST_MILE` 或清关 Exception |
| `UK_LAST_MILE` | 已进入英国本地派送 | “英国派送中”；最近事件和签收前状态 | 查看 Timeline；有异常再按指引处理 | `DELIVERED` 或末端 Exception |
| `DELIVERED` | 已签收，正常履约结束 | 签收事实与最终 Timeline 摘要 | 查看历史 Shipment | 无；闭环结束 |
| `EXCEPTION` | 当前问题影响 Shipment 继续推进 | 发生什么、影响阶段、当前处理状态、用户下一步、支持对象 | 完成明确动作或获得支持 | 问题解决后恢复相应阶段 |
| `CANCELLED` | Shipment 在实际离仓前已取消 | 取消事实、Package 的后续可用性说明 | 查看 Package；需要时新建 Shipment | 符合规则的 Package 回到 `READY_FOR_SHIPMENT` |

### `PAID_AWAITING_DISPATCH` 的强制表达

这是 V1 最重要的状态表达之一。它必须包含：

```text
现在发生了什么：付款已成功。
我需不需要做什么：当前无需操作。
接下来会发生什么：Warehouse 确认实际离仓后，Shipment 才会进入“已离仓”。
```

不得仅显示“已支付”或“已完成”，也不得使用“已发货”替代真实离仓事实。

## Cross-entity 状态规则

| 用户看到的场景 | 正确入口 / 行动 |
| --- | --- |
| 一个 Package 已 `READY_FOR_SHIPMENT` | 在 Package List 选择；尚无 Shipment 时不显示履约 Timeline。 |
| 一个 Package 已 `IN_SHIPMENT` | 跳转关联 Shipment 查看履约，而非再次选择。 |
| Shipment 出现 Exception，但某个具体 Package 是原因 | Shipment Detail 说明影响；可链接到对应 Package Detail。 |
| Package 出现 Exception，尚未进入 Shipment | Package Detail 处理；不把未发生的 Shipment 状态提前展示。 |

## 状态数据边界

- 所有用户文案应包含稳定 Shipment Reference、最近事件或更新时间（如有），但不伪装成实时数据；
- V1 中 Warehouse、Payment 与 Tracking Event 允许 Simulated，但状态转移顺序不能跳过；
- 无外部事件时，应显示“尚无新事件”而非臆造下一步已发生；
- 精确时效、航班、清关原因和承运商字段仍是 Product Assumption，不写成确定承诺。
