# Wireframe 端到端 Walkthrough

> 以下以 Primary User 的一个模拟路径检验低保真信息与交互是否覆盖已冻结流程。Warehouse、Payment、Tracking 事件均为作品集 V1 的模拟事件；此 walkthrough 不把它们表述为真实服务接入。

## 正常路径：12 个 Package → 8 个 Package 的 Shipment → 英国签收

| Step | User Situation / Action | Wireframe Response | 状态与下一步检查 |
| --- | --- | --- | --- |
| 1 | 第一次打开小程序 | Home 显示开始使用、Warehouse 地址和三步说明 | 用户复制地址后前往外部电商；小程序不假装代替购物。 |
| 2 | 在淘宝、拼多多等平台下单后返回 | 从 Home / Package List 进入预报 | 预报页只要求国内运单号与最小商品识别信息。 |
| 3 | 依次预报 12 个 Package | 每件创建为“已预报，等待送往 Warehouse” | 成功反馈不把预报误写成到仓；重复运单会被拦截。 |
| 4 | Package 分批到达 | Package List 以筛选和分组显示：10 件“可合箱”、1 件“待到仓”、1 件“待确认” | 用户无需逐个进详情即可判断可用集合。 |
| 5 | 用户准备本次寄送 | 点击“开始合箱”，进入多选模式 | 非可合箱的 2 件可见但不可选，并有原因。 |
| 6 | 从 10 件可合箱 Package 中选择 8 件 | 固定底栏显示“已选择 8 件 · 还有 2 件可合箱未选择” | 系统提醒而不阻止；用户仍可按时机提交。 |
| 7 | 继续创建 Shipment | Shipment Creation 展示 8 件摘要、2 件未选择提示、英国地址 | 用户可以返回编辑、移除 Package 或补全地址；Package 此时尚未最终锁定。 |
| 8 | 提交 Shipment | 校验地址与 8 件 Package 仍可选；生成稳定 Reference | Shipment 为“已提交，等待 Warehouse 处理”；8 件 Package 锁定为“已加入本次转运”。 |
| 9 | 模拟 Warehouse 开始处理 | Shipment Detail 显示“Warehouse 正在处理”；不要求用户行动 | 用户能查看包含 Package，等待最终重量与 Quote。 |
| 10 | 模拟处理完成并生成 Quote | 顶部变为“最终报价已生成，请确认并付款”；Quote 区块前置 | 用户看到最终计费重量、费用项、总价和生成时间，然后发起模拟付款。 |
| 11 | 模拟 Payment 成功 | 页面进入“已付款，等待 Warehouse 发出” | 清楚写明尚未离仓；Timeline 不提前显示运输中。 |
| 12 | 模拟 Warehouse 实际出库 | 状态更新为“已离开 Warehouse”，Timeline 启用并显示离仓事件 | Payment 与 Dispatch 的事实被清楚拆分。 |
| 13 | 模拟国际运输、清关、英国派送事件 | Shipment Detail 按当前阶段把 Timeline 提至主区块 | 每一步说明当前阶段与下一预期，不要求用户寻找另一个物流页面。 |
| 14 | 模拟签收事件 | 状态变为“已签收”，展示签收与完整 Timeline 摘要 | Shipment 生命周期正常结束；可从 Shipment List 查看历史。 |

## Exception Path：英国末端派送停滞

| Step | 事件 / 用户动作 | Wireframe Response | 检查结论 |
| --- | --- | --- | --- |
| E1 | Shipment 已处于“英国派送中” | Detail 顶部显示当前末端阶段与最近 Timeline 事件 | 用户能先理解正常位置。 |
| E2 | 模拟 Tracking Exception 产生 | Shipment 进入“需要处理”；Exception 区块移动至状态头部之后 | 不再仅显示旧 Timeline，避免用户误解为仍正常派送。 |
| E3 | 用户查看异常 | 页面说明：已知事实 / 正在核实、影响签收、当前进展、是否需行动 | 用户不会只看到模糊的“异常”。 |
| E4 | 模拟场景要求用户无需操作 | 明确写“当前无需操作，正在核实”；必要时提供含 Reference 的支持指引 | 不强迫用户联系客服。 |
| E5 | 模拟问题解决 | 状态回到“英国派送中”，随后进入“已签收” | Exception 不作为终态；恢复路径可理解。 |

若某个模拟场景要求用户补充信息，则把“当前无需操作”替换为具体字段或资料要求；用户提交后仍显示“正在核实”，直至模拟业务事件确认恢复。

## Walkthrough 检查结果

| 检查项 | 结果 | 依据 / 调整 |
| --- | --- | --- |
| 用户每一步是否知道下一步 | 通过 | Home 的 Action Required、Shipment Detail 的 Next Action 和状态文案共同覆盖。 |
| 是否有找不到入口的操作 | 通过 | 地址从 Home；预报与合箱从 Package List；Quote/Payment/Tracking/Exception 都在 Shipment Detail。 |
| 10–20 Package 场景是否可用 | 通过 | 筛选、状态分组、不可选原因、固定选择底栏和“已选 / 可合箱未选”反馈避免逐件进入详情。 |
| 状态文案是否容易理解 | 通过 | 不暴露内部状态码；每个状态包含发生了什么、是否行动、下一步。 |
| Payment 与 Dispatch 是否容易混淆 | 通过 | 支付成功后使用“已付款，等待 Warehouse 发出”；Timeline 离仓节点保持未完成。 |
| Exception 是否 actionable | 通过 | 统一为发生什么、影响、用户动作、当前进展、支持五段结构。 |
| 是否有多余页面 | 通过 | Quote、Payment、Timeline、Exception 未拆页；仍为 7 个 P0 页面。 |
| 是否偷偷新增 MVP Scope | 通过 | 所有模拟事件、草稿、状态刷新、取消确认均服务既有状态机和已冻结 P0；没有增加新业务能力。 |

## 发现的纯交互问题与处理

1. **用户可能把“10 件可合箱”理解为必须全部寄出。**
   已在 Selection Mode 与 Shipment Creation 反复表达“还有 N 件可合箱未选择；可本次提交，也可返回调整”，只做提醒不阻止。

2. **Payment 成功容易被误读为已发货。**
   已将 Payment Success 后的首屏状态、Next Action 与 Timeline 统一为“已付款，等待 Warehouse 发出”，且不显示运输进度。

3. **异常信息若只放在 Timeline 中会被忽略。**
   已规定 Exception 发生时置于 Shipment Detail 顶部状态之后，并说明恢复路径。

## Post-MVP Consideration

本次 walkthrough 未发现必须新增的 P0 功能。以下仅作为后续验证方向，不进入当前 Wireframe：

- 是否需要按国内运单号搜索大量历史 Package；
- 是否需要在 P1 中提供更丰富的验货 / 装箱照片凭据；
- 是否需要根据真实业务验证地址格式、取消窗口、Quote 有效期与外部事件更新频率。
