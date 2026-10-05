# 用户状态文案

> Internal State 只用于产品逻辑，不直接展示给用户。每条用户文案都应回答：发生了什么、用户需不需要操作、接下来会发生什么。状态后可附最近事件时间；没有真实事件时不伪装成实时更新。

## Package

| Internal State | User-facing Title | Explanation | User Action | Next Expected Event |
| --- | --- | --- | --- | --- |
| DECLARED | 已预报，等待送往 Warehouse | 已收到你的预报信息；这不代表 Package 已到仓。 | 暂无需操作；待国内物流发出后关注状态。 | Package 开始送往 Warehouse，或需要补充信息。 |
| INBOUND_TO_WAREHOUSE | 正在送往 Warehouse | Package 正在前往 Warehouse，尚未完成收货与归属确认。 | 暂无需操作。 | Warehouse 收货后，进入归属确认。 |
| ARRIVED_PENDING_MATCH | 已到 Warehouse，正在确认归属 | Warehouse 已记录收货，正在确认它是否属于你且可处理。 | 当前无需操作；若需要补充信息会明确通知。 | 确认归属后可合箱，或出现需处理问题。 |
| READY_FOR_SHIPMENT | 可合箱 | Package 已确认归属且可以选择加入本次 Shipment。 | 可在 Package List 选择；也可以等待更多 Package。 | 被加入 Shipment，或出现影响处理的问题。 |
| IN_SHIPMENT | 已加入本次转运 | 此 Package 已锁定在关联 Shipment 中，不可再次选择。 | 查看关联 Shipment 了解处理与运输状态。 | Warehouse 处理、报价、付款和后续履约。 |
| EXCEPTION | 需要处理 | 此 Package 暂时不能按正常路径继续。页面会说明影响和原因。 | 仅按明确指引补充信息或获取支持。 | 问题解决后回到适当阶段。 |

### Package 文案禁区

- 国内物流“已签收”不能替代“已到 Warehouse，正在确认归属”。
- “已到仓”不能替代“可合箱”。
- 不写“包裹丢失”“无法处理”等未经确认的断言；原因未知时写“正在核实”。

## Shipment

| Internal State | User-facing Title | Explanation | User Action | Next Expected Event |
| --- | --- | --- | --- | --- |
| DRAFT | 正在准备本次转运 | 你已选择部分 Package，但尚未提交给 Warehouse。 | 继续调整 Package 或填写英国地址。 | 提交 Shipment，或放弃草稿。 |
| SUBMITTED | 已提交，等待 Warehouse 处理 | Shipment 已提交，Reference 已生成；Warehouse 尚未开始处理。 | 当前无需操作；可查看本次包含的 Package。 | Warehouse 开始检查、打包和称重。 |
| WAREHOUSE_PROCESSING | Warehouse 正在处理 | Warehouse 正在检查、打包和称重，最终 Quote 尚未生成。 | 当前无需操作；若需补充信息会明确提示。 | 生成最终 Quote，或出现处理问题。 |
| AWAITING_PAYMENT | 最终报价已生成，请确认并付款 | 已生成本次最终计费重量、费用项和总价。 | 核对 Quote 后发起付款。 | 付款结果确认。 |
| PAYMENT_PROCESSING | 正在确认付款结果 | 已收到付款请求，正在确认结果。 | 请勿重复发起付款。 | 付款成功后等待出库；失败则回到待付款。 |
| PAID_AWAITING_DISPATCH | 已付款，等待 Warehouse 发出 | 费用已支付成功，但 Shipment **尚未实际离开 Warehouse**。 | 当前无需操作。 | Warehouse 确认实际出库后，更新为“已离开 Warehouse”。 |
| DISPATCHED | 已离开 Warehouse | Warehouse 已确认 Shipment 实际离仓，后续运输事件尚待更新。 | 当前无需操作；可查看 Timeline。 | 进入国际运输，或出现运输问题。 |
| INTERNATIONAL_TRANSIT | 正在国际运输 | Shipment 正在跨境运输中。 | 当前无需操作；查看最近 Timeline 事件。 | 进入清关，或出现运输问题。 |
| CUSTOMS_CLEARANCE | 正在清关 | Shipment 正在清关阶段；是否需用户行动以具体提示为准。 | 默认无需操作；仅按明确指引处理。 | 清关完成并交接英国末端，或出现问题。 |
| UK_LAST_MILE | 英国派送中 | Shipment 已进入英国本地派送阶段。 | 当前无需操作；等待签收或按异常指引处理。 | 签收，或出现末端派送问题。 |
| DELIVERED | 已签收 | 已收到签收事件，本次 Shipment 正常完成。 | 无需操作；可查看完整记录。 | 无；履约结束。 |
| EXCEPTION | 需要处理 | 当前问题影响 Shipment 的正常推进。 | 查看影响与明确下一步；不需要行动时会写明正在处理。 | 问题解决后恢复对应阶段。 |
| CANCELLED | 已取消 | Shipment 在实际离仓前已取消；页面说明关联 Package 的后续可用性。 | 查看相关 Package，需要时重新创建 Shipment。 | 符合规则的 Package 回到可合箱状态。 |

## 关键状态表达规则

### 已付款，等待 Warehouse 发出

该状态必须同时显示：

```text
现在发生了什么：付款已成功。
我需不需要做什么：当前无需操作。
接下来会发生什么：Warehouse 确认实际出库后，才会进入“已离开 Warehouse”。
```

禁止将它缩写为“已支付”“已发货”或“已完成”。

### Exception

Exception 标题不承担原因本身。详情必须紧跟：

```text
发生什么：<已知事实或“正在核实”>
影响什么：<具体 Package / Shipment 阶段>
你需要做什么：<明确动作，或“当前无需操作”>
当前进展：<处理中 / 等待你的信息 / 已解决>
下一步：<恢复目标阶段或支持方式>
```

### 模拟事件透明度

在作品集演示中，Warehouse、Payment 和 Tracking 更新可由模拟事件产生。页面将这些展示为“最近事件 / 更新于”，而非声称实时连接承运商、海关或支付渠道。
