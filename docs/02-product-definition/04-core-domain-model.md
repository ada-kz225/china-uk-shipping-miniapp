# 核心业务模型

> 本文定义产品概念与关系，不定义数据库表、字段、接口或技术架构。带有真实仓库、支付或物流规则的关系均为 **Product Assumption**，除非 P01 的行为记录另有直接支持。

## 核心实体

| Entity | 定义 | 用户价值 / 业务意义 | 关键边界 |
| --- | --- | --- | --- |
| User | 使用转运服务的个人用户 | 拥有自己的 Package、Shipment、地址和状态信息 | V1 只处理个人用户，不处理企业/运营账户。 |
| Warehouse | 中国境内接收、处理和发出 Package 的服务节点 | 为用户提供收件信息，并产生到仓、处理、称重与离仓事实 | 多仓、仓内调度和作业系统不在 V1 范围。 |
| Package | 一件来自商家或国内快递、被送往 Warehouse 的独立实物包裹 | 是用户盘点、确认到仓和选择合箱的最小对象 | Package 不等于一次跨境寄送。 |
| Shipment | 用户选择一个或多个 Package 后形成的一次中国 → 英国转运请求 | 承载合箱、仓库处理、Quote、Payment、履约和签收 | 这是用户完成一次转运的核心实体。 |
| Quote | 针对一个 Shipment、在仓库处理后给出的最终应付金额说明 | 让用户在付款前核对重量、费用项和总价 | V1 只表达一个最终 Quote；真实计费公式为 Product Assumption。 |
| Payment | 用户针对一个 Shipment 的付款尝试与结果 | 区分“已付款”与“尚未离仓” | 真实支付渠道不在 V1 中接入。 |
| Address | 用户的英国收件信息 | 为 Shipment 提供目的地 | V1 保存本次 Shipment 的地址快照；地址复用是 P1 Assumption。 |
| Tracking Event | Shipment 履约过程中发生的可见事件 | 告知用户当前阶段、最近更新时间和下一步 | 外部事件的来源与准确性尚未确认。 |
| Exception | 阻断或影响 Package / Shipment 的异常事项 | 解释影响、所需用户动作与处理进度 | V1 提供最小信息与引导，不做完整工单系统。 |
| Operation Log | 对关键业务事实变化的内部记录 | 让状态、归属、重量、Quote、Payment、Dispatch 与 Exception 可追溯 | 不在用户端展示完整审计记录；用户只看到相关的状态与 Timeline。 |

## 关系模型

```text
User 1 ── N Package
User 1 ── N Shipment
User 1 ── N Address

Warehouse 1 ── N Package
Warehouse 1 ── N Shipment

Shipment 1 ── N Package
Shipment 1 ── 1 Quote
Shipment 1 ── 0..1 Payment (V1 的单次付款模型)
Shipment 1 ── N Tracking Event
Shipment 1 ── 1 Address snapshot
Shipment 1 ── N Operation Log

Package 0..N Exception
Shipment 0..N Exception
Package 1 ── N Operation Log
```

### Package 与 Shipment 的核心关系

```text
多个可处理的 Package
        ↓ 用户选择并提交
一个 Shipment
        ↓ 仓库处理、报价、支付、出库、履约
英国签收
```

- 一个 **User** 可以拥有多个 Package。
- 一个 **Shipment** 必须包含一个或多个 Package。
- 每个 Shipment 在提交后生成一个稳定 Reference，供用户在列表、详情、支持与后续事件上下文中辨识；它不代表已经获得真实承运商单号。
- 一个 Package 在任一时刻只能属于一个**有效 Shipment**，避免同一实物被重复发运。
- 用户在 Shipment 草稿中选择 Package 时，选择尚未最终锁定；提交后才形成有效归属。取消或在允许修改的窗口内撤回时，Package 可回到可选集合。具体窗口见 [07-business-rules.md](07-business-rules.md)。
- V1 不支持拆分一个物理 Package 到多个 Shipment；如真实业务允许拆箱/重包，属于后续业务规则与能力。

## 为什么必须拆分 Package 和 Shipment

### 它们解决不同用户问题

| 对比维度 | Package | Shipment |
| --- | --- | --- |
| 用户在意什么 | 是否到仓、是否归属自己、是否可选择 | 本次发什么、报价多少、是否付款、是否离仓、到哪里了 |
| 生命周期起点 | 中国电商发货/预报后 | 用户从多个 Package 中提交一次转运后 |
| 数量关系 | 一位用户可有多个 Package | 一次 Shipment 包含一个或多个 Package |
| 主要状态 | 预报、到仓、可合箱、已加入 Shipment、异常 | 草稿、处理、待支付、已支付、离仓、运输、签收、异常 |

P01 的真实行为正是先核对多个 Package 是否到仓，再决定本次哪些一起装箱、称重、付款和追踪。因此，若把所有内容都叫“订单”，会混淆到仓确认、合箱选择、付款和最终签收这些不同事实。

### 设计约束

- 不允许将“Payment 成功”直接写成 Shipment 已完成；
- 不允许将“已离仓”直接写成英国已签收；
- Package 状态用于解释仓库前的归属与可选择性；Shipment 状态用于解释一次跨境履约；
- Package 进入有效 Shipment 后，用户应以 Shipment 的履约时间线为主要追踪入口。
- Operation Log 记录关键业务变化的来源、时间、前后值和原因（如适用）；用户 Timeline 是该内部记录的任务化视图，而不是完整审计后台。

## 模型假设与 V1 边界

| 项目 | 当前判断 |
| --- | --- |
| 一个 Shipment 对应一个最终 Quote | V1 Product Assumption；真实业务若允许重报/补款，后续扩展 Quote 版本。 |
| 一个 Shipment 对应零或一次成功 Payment | V1 简化；支付失败重试不产生新的业务 Shipment。 |
| 一个 Shipment 只有一个英国收件地址快照 | V1 Product Assumption；真实地址校验、改址规则待确认。 |
| 仓库与物流事件可进入系统 | 作品集以 Simulated Event 表达；真实接入能力待确认。 |
| Package 照片可关联 Package 或 Shipment | P01 观察支持照片价值；仓库是否稳定提供是 Product Assumption。 |
| Operation Log 记录关键变更 | V1 P0 supporting capability；至少记录来源/操作方、时间、前后值和原因（如有）。 |
