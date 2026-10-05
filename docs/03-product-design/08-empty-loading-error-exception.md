# Empty、Loading、Technical Error 与 Business Exception

> 状态体验的目标是避免把“没有数据”“正在加载”“系统无法获取数据”和“真实业务被阻塞”混为一谈。尤其在转运场景中，**Technical Error ≠ Business Exception**。

## 四类状态的定义

| 类型 | 定义 | 用户应理解为 | 产品应做什么 |
| --- | --- | --- | --- |
| Empty State | 当前没有与该页面任务相关的实体或结果 | “我还没有开始 / 当前没有符合条件的内容” | 解释该页面用途，并提供下一步任务入口。 |
| Loading State | 已请求数据，正在等待结果 | “信息正在获取，暂未能判断业务状态” | 保留页面语义，不显示虚构业务状态。 |
| Technical Error | 产品、网络或模拟数据服务无法完成请求 | “暂时无法加载信息，不代表我的 Package / Shipment 出现业务问题” | 明确说明加载失败，提供重试并保留已知数据。 |
| Business Exception | 已确认的 Package / Shipment 业务问题阻断或影响流程 | “我的某个实体发生了具体问题，可能需要行动” | 显示影响、原因（如有）、当前处理状态、下一步和支持指引。 |

## 核心页面状态设计

| 页面 / 场景 | Empty State | Loading State | Technical Error | Business Exception |
| --- | --- | --- | --- | --- |
| Home：新用户 / 无 Package | 展示 Warehouse Information 与“预报第一个 Package”起点 | 加载待办与概览，不用默认“全部正常” | 说明首页信息暂无法加载；可重试；仍可进入已缓存的仓库说明 | 将待付款或 Exception 置于 Action Required；链接到关联实体 |
| Package List：无 Package | 说明预报用途；提供“新增预报” | 加载 Package 集合和状态计数 | 说明列表加载失败；可重试；不把失败说成包裹丢失 | 在列表上标记具体 `EXCEPTION` Package；保留可进入详情的上下文 |
| Package List：筛选无结果 | 说明当前筛选下没有 Package，例如“暂无可合箱 Package” | 更新筛选结果中 | 说明筛选结果暂无法加载 | 不适用；Exception 应出现在“需处理”筛选中，而非伪装为空结果 |
| Package Detail | 不适用；若实体不存在，说明链接可能失效并返回列表 | 加载该 Package 的状态和事件 | “暂时无法加载 Package 信息”，可重试；不改写 Package 状态 | 显示 Package 影响、所需信息和下一步；不允许其被合箱 |
| Shipment Creation | 无可用 Package 时说明“暂无可合箱 Package”，链接回 Package List | 加载可选择 Package 与草稿 | 无法加载时不允许提交不完整 Shipment；保留用户已选草稿（如可得） | 选中的 Package 若失去可用性，解释原因并要求重新确认 |
| Shipment List | 无 Shipment 时引导从可合箱 Package 创建；不展示营销推荐 | 加载 Shipment 状态与最近事件 | 说明 Shipment 列表暂无法加载；可重试 | 用状态标记具体 Shipment；不要只在列表顶部显示无上下文警告 |
| Shipment Detail / Quote | 无 Quote 时，若尚在处理则说明“Warehouse 处理中”，而非空白 | 加载状态、Quote 与 Timeline | “暂时无法加载 Shipment 信息”；不能将其显示为已签收或异常 | Quote / Payment / Dispatch / Tracking 中的具体问题以 `EXCEPTION` 呈现 |
| Payment | 不适用；只有 Quote 就绪才可进入 | 显示 Payment 结果确认中，阻止重复发起 | 技术确认失败时保留“结果暂未确认”，不自动标记支付失败或成功 | 业务性付款失败回到 `AWAITING_PAYMENT`，说明可重试或需要的下一步 |
| Fulfillment Timeline | 早期尚未离仓时解释“离仓后将出现运输事件” | 加载事件；不补造时间线 | 说明 Timeline 暂无法加载，保留最近已知状态 | 以 Shipment `EXCEPTION` 呈现已确认的运输、清关或派送问题 |

## Technical Error 处理原则

1. 不将网络加载失败改写为“Package 异常”或“Shipment 异常”。
2. 不在加载或失败时显示推测性的 Tracking Event、预计到达或签收结果。
3. 优先保留已知且带时间的状态，清楚标示“最新信息暂未更新”。
4. 提供重试；若失败持续，提供不带承诺的支持入口方向。
5. 对 Payment，结果未知时应保持“确认中 / 暂未确认”，避免重复支付或错误进入 `PAID_AWAITING_DISPATCH`。

## Business Exception 的最小信息结构

每一个 Business Exception 必须包含：

```text
发生什么：具体问题描述
影响什么：Package 或 Shipment 的哪个阶段无法继续
当前状态：业务方是否正在处理
你需要做什么：明确动作，或“当前无需操作”
如何获得帮助：上下文明确的支持对象 / 入口
```

### 示例边界

| 情况 | 正确分类 | 正确表达 |
| --- | --- | --- |
| 页面无法加载 Package 列表 | Technical Error | “暂时无法加载 Package 信息，请重试。” |
| Warehouse 已收货但无法匹配用户归属 | Package Business Exception | “Package 暂无法确认归属，需补充/核对的信息是……” |
| 模拟 Payment 请求超时，结果未知 | Technical Error / Pending Confirmation | “付款结果暂未确认，请勿重复操作。” |
| Payment 被明确判定未成功 | Shipment Business Exception 或付款结果 | “付款未完成，Shipment 尚未出库；可重新发起付款。” |
| 英国派送状态确认异常 | Shipment Business Exception | “派送阶段出现问题，当前影响是……；下一步是……。” |

## 范围边界

V1 只定义异常信息与下一步，不构建完整客服工单、赔付、退款或承运商争议处理。异常的价值是让用户不必面对无意义的“请联系客服”，而不是假装所有问题都可在小程序自助解决。
