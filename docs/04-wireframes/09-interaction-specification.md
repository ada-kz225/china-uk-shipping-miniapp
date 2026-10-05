# 关键交互规则

> 本文定义已冻结 P0 中的交互反馈和失败边界，不新增功能。所有状态变更遵守既有 Package / Shipment 状态机；模拟事件同样必须按状态顺序发生。

## Package Multi-select

| 项目 | 定义 |
| --- | --- |
| Trigger | 用户在 Package List 点击“开始合箱”，或从 Home 的可合箱概览进入。 |
| System Response | 进入选择模式；仅可勾选“可合箱” Package；保留其他 Package 但显示不可选原因。 |
| User Feedback | 固定底栏显示“已选择 N 件”与“可合箱但未选择 M 件”；每次勾选立即更新。 |
| Failure Case | 无可选 Package 时不进入空选择页；选择中若某 Package 状态变化为不可选，标记该件并要求用户调整。 |

规则：至少选择 1 件才能继续；M 大于 0 只提醒不阻止；退出选择模式默认保留本次勾选，只有主动放弃才清空。

## Shipment Submit

| 项目 | 定义 |
| --- | --- |
| Trigger | 用户在 Shipment Creation 点击“提交 Shipment”。 |
| System Response | 校验至少 1 件、英国地址最小字段、每件 Package 仍为可合箱且未被其他有效 Shipment 占用。通过后创建 Shipment、生成稳定 Reference，并锁定已选 Package。 |
| User Feedback | 显示“已提交，等待 Warehouse 处理”与 Reference，并进入 Shipment Detail。 |
| Failure Case | 地址缺失时字段级提示；Package 已不可选时列出具体对象并保留其余草稿；重复提交时返回已创建的 Shipment，而不新建第二次。 |

## Quote Confirmation

| 项目 | 定义 |
| --- | --- |
| Trigger | Shipment 进入“最终报价已生成，请确认并付款”。 |
| System Response | 展示本次 Quote 快照：最终计费重量、费用项、总价、生成时间；不同时展示未确认的预估价。 |
| User Feedback | 用户在付款前清楚知道“此报价用于本次付款”；Payment CTA 明确为模拟。 |
| Failure Case | Quote 不完整、过期或存在阻塞 Exception 时，不开放 Payment CTA；显示原因与恢复路径。 |

此处的“确认”是用户核对并进入付款，不新增独立的“接受报价”流程或状态。

## Simulated Payment

| 项目 | 定义 |
| --- | --- |
| Trigger | 用户在 Quote 区块点击“确认并模拟付款”。 |
| System Response | 进入“正在确认付款结果”，锁定重复点击；模拟成功后记录 Payment 结果并转为“已付款，等待 Warehouse 发出”。 |
| User Feedback | 成功时明确“付款成功，但尚未实际离开 Warehouse”；失败时明确“未确认成功，尚未出库”。 |
| Failure Case | 模拟失败、取消或结果未知时回到待付款，保留同一 Quote；不得推进至 Dispatch。 |

## State Refresh

| 项目 | 定义 |
| --- | --- |
| Trigger | 用户重新进入 Home / List / Detail、手动下拉刷新，或小程序回到前台。 |
| System Response | 读取当前实体状态与最近事件；模拟事件仅在预设操作或演示流程中发生。 |
| User Feedback | 显示“最近更新于”；无新事件时写“尚无新事件”，而不是制造进度。 |
| Failure Case | 加载失败显示 Technical Error 和“重试”，保留上一次已成功加载的状态标识（如有），不把业务实体标成 Exception。 |

## Exception Resolution

| 项目 | 定义 |
| --- | --- |
| Trigger | Package 或 Shipment 出现业务 Exception；或用户完成页面明确要求的补充信息。 |
| System Response | 显示影响、下一步、进度与支持信息。用户提交所需信息后，实体仍维持 Exception，直到模拟业务处理事件确认解决。 |
| User Feedback | “已提交补充信息，正在核实”或“当前无需操作，正在处理”；解决后说明恢复到哪个状态。 |
| Failure Case | 用户未完成必填补充信息时不提交；处理未成功时保留 Exception 和最近进展，不让用户自行点击恢复。 |

## Back / Cancel

| 场景 | Trigger | System Response | User Feedback | Failure Case |
| --- | --- | --- | --- | --- |
| 预报表单返回 | 点击返回 | 有未提交输入时确认是否放弃 | “离开后本次未提交内容将丢失” | 继续编辑则不离开 |
| Package 选择返回 | 返回 | 保留勾选以便继续；主动放弃才清空 | 显示当前已选数量 | 放弃前二次确认 |
| Shipment 草稿返回 | 返回 | 保留选择与已填地址草稿 | 回到上一步可继续调整 | 主动放弃草稿前确认 |
| 已提交 Shipment 取消 | 在允许窗口点击取消 | 二次确认并检查 Warehouse 是否未开始处理 | 说明关联 Package 是否回到可合箱 | 已进入处理 / 已离仓时不提供自助取消，显示限制与支持指引 |

取消窗口和处理时点是 Product Assumption；Wireframe 只表达已冻结规则，不宣称真实业务政策。

## Loading

| 场景 | 页面表现 | 禁止行为 |
| --- | --- | --- |
| 首次加载列表 | 骨架保留筛选与列表密度 | 不用空状态替代加载中 |
| 提交 / 付款中 | 主按钮进入进行中且锁定，保留当前输入与 Quote 内容 | 不允许重复点击或跳转到成功状态 |
| Timeline 刷新 | 在原 Timeline 上展示轻量加载提示 | 不清空已知事件后显示“暂无物流” |

## Double Submit Prevention

| Trigger | System Response | User Feedback | Failure Case |
| --- | --- | --- | --- |
| 连续点击提交预报 | 首次请求进入进行中后锁定；以运单号去重 | 显示提交中或已有 Package | 结果未知时引导刷新已有记录，不允许盲目再建 |
| 连续点击提交 Shipment | 提交进行中锁定；以草稿/Package 组合校验幂等 | 成功后只显示一个 Reference | 网络结果未知时查询是否已创建，不生成第二 Shipment |
| 连续点击付款 | Payment Processing 期间锁定 CTA | 显示正在确认付款结果 | 未确认成功前保持待付款，不出库 |

## Destructive Action Confirmation

| Action | 确认文案应说明 | 确认后 | 取消后 |
| --- | --- | --- | --- |
| 放弃预报草稿 | 未提交内容将丢失 | 返回上一页并清空未保存输入 | 留在表单 |
| 放弃 Package 选择 / Shipment 草稿 | 本次已选 Package 与地址草稿将被放弃，Package 仍不被锁定 | 清空草稿，回到 Package List | 保留草稿 |
| 移除已选 Package | 该 Package 不会出现在本次 Shipment | 更新选中数与未选可合箱数 | 不改变选择 |
| 取消已提交 Shipment | 仅在未开始处理的允许窗口；关联 Package 将按规则恢复可选 | Shipment 进入已取消，Package 回到可合箱 | 保持当前 Shipment |

**不需要确认的操作**：查看详情、切换筛选、单次勾选/取消勾选、打开 Timeline。避免让日常盘点产生过多确认弹窗。
