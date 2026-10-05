# V1 MVP 范围

> 优先级从“能否完成一次可理解的 Package → Shipment 闭环”出发，不以功能数量为目标。  
> `Real` 指可由产品本身直接承载的用户任务逻辑；`Simulated` 指依赖外部仓库、支付或物流数据、在作品集 MVP 中需使用明确标记的模拟事件；`Simplified` 指仅保留完成闭环所需的最小规则，不代表真实业务规则完整实现。

## P0：完成核心闭环所必需

| Capability | Related Problem | User Need | Priority | MVP Implementation | Evidence Level |
| --- | --- | --- | --- | --- | --- |
| 仓库地址与填写说明 | 包裹无法进入转运流程 | 获得正确的中国仓收件信息 | P0 | Simplified | Directionally supported |
| Package 预报（订单截图/运单号的最小信息） | 仓库难以识别 Package 归属 | 让仓库可匹配自己的 Package | P0 | Simplified | Directionally supported |
| Package 列表与到仓/归属状态 | 到仓确认和订单盘点依赖人工 | 知道哪些 Package 已到仓、已归属、仍在等待 | P0 | Real | Interview-supported |
| Package 选择与一次 Shipment 草稿 | 多个 Package 难形成明确的一次寄送 | 选择本次寄出的 Package | P0 | Real | Interview-supported |
| Shipment 提交、稳定 Reference 与处理状态 | 合箱与仓库处理通过人工协调 | 明确已提交什么、是哪一次 Shipment、当前正在等待什么 | P0 | Real | Interview-supported |
| 英国收货地址（一次性填写并保存订单快照） | 目的地信息缺失会阻断履约 | 提供本次 Shipment 的收件信息 | P0 | Simplified | Assumption |
| 仓库处理、重量与最终 Quote | 付款前需确认可核对的费用事实 | 查看处理后的重量、总价和费用项 | P0 | Simulated | Interview-supported |
| 支付动作与结果状态 | 完成交易闭环 | 确认已发起/已完成支付 | P0 | Simulated | Directionally supported |
| 已支付与已离仓的独立状态 | 付款后离仓状态需向客服查询 | 区分付款和实际出库 | P0 | Simulated | Directionally supported |
| 最小履约追踪（国际运输、清关、英国派送、签收） | 用户需要知道 Shipment 是否继续推进 | 获取阶段级进度和最终签收 | P0 | Simulated | Directionally supported |
| 最小异常信息与下一步指引 | 末端异常时不知如何行动 | 知道问题影响、需要做什么、联系谁 | P0 | Simplified | Directionally supported |

## V1 Supporting Operations P0

以下能力不增加用户页面，但没有它们，Package / Shipment 的用户可见状态没有可信的产生和约束来源。它们不等于完整 WMS、客服系统或真实外部接入。

| Supporting Capability | 为什么是 P0 | V1 Mode |
| --- | --- | --- |
| User、Package、Shipment 的归属与访问范围 | 个人 Package 集合和 Shipment 必须只属于对应用户。 | Real product logic |
| 预报引用去重与重复操作保护 | 防止同一国内运单或重复提交产生多件 Package / 多次 Shipment。 | Real product logic |
| Warehouse 收货与匹配事件 | `ARRIVED_PENDING_MATCH` 和 `READY_FOR_SHIPMENT` 必须由明确事件产生。 | Simulated operation |
| Shipment Package 归属锁定与允许释放 | 防止一个 Package 同时进入多个有效 Shipment；允许符合规则的取消后恢复可选。 | Real product logic |
| 打包完成与最终计费重量记录 | Quote 不能在没有处理完成和最终重量依据时生成。 | Simulated operation |
| Quote 快照 | 保留付款时所见的重量、费用项、总价、生成时间和版本/来源。 | Simulated operation |
| Payment 结果记录与 Dispatch 闸门 | 防止 Payment 成功直接被误写为已离仓；Dispatch 需满足已付款、已完成处理且无阻塞问题。 | Simulated operation |
| Tracking Event 记录与阶段映射 | 连续 Timeline 需要阶段、时间、来源和用户语言解释。 | Simulated operation |
| Exception 阻塞、解决与恢复 | 业务问题需阻止相关状态继续，并在解决后恢复正确阶段。 | Simulated operation |
| Critical Operation Log | 对状态、归属、重量、Quote、Payment、Dispatch 和 Exception 的关键变化保留来源、时间、前后值与原因。 | Real product logic |

## P1：明显改善体验，但不阻塞首次闭环

| Capability | Related Problem | User Need | Priority | MVP Implementation | Evidence Level |
| --- | --- | --- | --- | --- | --- |
| Package 验货、物品总览、装箱照片凭据 | 用户需确认商品状态和打包过程 | 查看仓库处理证据 | P1 | Simulated | Interview-supported |
| 关键状态通知 | 用户可能反复查看或等待客服 | 在到仓、报价、离仓、异常等节点及时获知 | P1 | Simplified | Assumption |
| 地址簿与默认地址 | 重复寄送可能重复填写 | 复用常用英国地址 | P1 | Simplified | Assumption |
| 上下文明确的支持入口 | 少数问题仍需人工处理 | 在异常或规则不清时找到正确支持渠道 | P1 | Simplified | Directionally supported |
| 有边界的服务偏好 | 易碎、体积占用、紧急程度会影响处理选择 | 表达加固、去包装或运输时效偏好 | P1 | Simplified | Interview-supported |

## P2：增强能力，后续再判断

| Capability | Related Problem | User Need | Priority | MVP Implementation | Evidence Level |
| --- | --- | --- | --- | --- | --- |
| 常用操作偏好复用 | 重复操作成本 | 下次快速使用相同服务偏好 | P2 | Simplified | Assumption |
| 历史 Shipment 对比与费用回顾 | 重复使用时的回溯需求 | 查看过去记录 | P2 | Simplified | Assumption |
| 细化的异常进度记录 | 异常过程可能不透明 | 查看复杂问题的处理历程 | P2 | Simulated | Assumption |

## Out of Scope

完整边界见 [08-out-of-scope.md](08-out-of-scope.md)。V1 明确不把优惠券、积分、会员、完整客服系统、完整 WMS、多国线路、多仓调度、真实微信支付或真实国际物流 API 放入范围。

## P0 范围校验

每项 P0 都对应至少一个核心问题或 JTBD：

| P0 能力组 | 承接的 JTBD / 问题 |
| --- | --- |
| 仓库信息、预报、Package 状态 | JTBD 1；到仓归属不明、人工盘点 |
| Package 选择、Shipment 提交、Reference、地址 | JTBD 2；多个 Package → 一次 Shipment |
| 重量、Quote、支付、离仓 | JTBD 3；付款与实际履约状态混淆 |
| 阶段追踪与最小异常指引 | JTBD 3；状态停滞时需要下一步 |
| Supporting Operations P0 | 所有 P0 用户状态均需要可追溯的产生、约束与恢复路径 |

没有独立问题或 JTBD 承接的能力不进入 P0。照片凭据和服务偏好虽有 P01 行为证据，但不阻塞首次闭环，因此保持 P1。
