# Product Roadmap & Release Plan

> **Current status: V1 Completed**  
> 本文使用版本驱动的产品路线，而不是日期承诺。它说明当前 V1 为什么构成一个合理的 MVP、哪些能力已经完成、哪些仍为模拟，以及产品在获得更多证据后如何迭代。

## 0. How to Read This Plan

本路线图遵循以下链路，而非以“功能数量”定义完成度：

```text
Research
→ User Problem
→ Product Goal
→ MVP Scope
→ Release
→ Validation
→ Iteration
```

- **Completed**：已进入当前代码与演示流程，并通过对应工程或人工验收。
- **Simulated**：用户可体验该阶段，但外部事实由受保护的 Mock Ops / Demo Data 产生，不是实际商业系统接入。
- **Planned**：有明确的产品方向或现有 P1 依据，但尚未承诺进入下一版本。
- **Future**：长期候选能力，需先满足业务、研究或外部依赖前提。

V2 与 V3 是两条不同的规划轨道，不是必须依次发生的版本序列：**V2 是 Customer Experience Expansion track（用户体验扩展轨道）**，**V3 是 Operations & Real-world Enablement track（运营与真实业务启用轨道）**。下一阶段先走哪条轨道，取决于目标与新增证据：若目标是继续验证用户体验，优先评估 V2；若目标是进入真实业务试运行，部分 V3 能力会成为上线前置条件，并可能早于或与 V2 的候选能力并行推进。

现有研究包含一位匿名用户 P01 的探索性访谈及一次 UT01 探索性可用性测试。它们提供方向性证据，不是统计代表性结论，也不等同于市场验证。

---

## 1. Product Vision

### 产品是什么

中英集运微信小程序是一个面向个人用户的**跨境集运过程自助信息与决策入口**。它以 Package（单件包裹）和 Shipment（一次转运）为核心，帮助用户从中国仓地址开始，完成包裹确认、合箱、报价、付款、出库确认、运输追踪和异常理解。

### 面向谁

V1 的首要设计对象是：**在英国、周期性购买多个中国电商商品并需要集运的中国留学生个人用户。**

长期居英华人与高频中国电商购买者是合理的后续研究对象，但其优先级尚未被现有研究充分验证。

### 核心场景与愿景

用户在多个中国电商平台下单后，包裹分批送往中国仓。用户需要判断哪些包裹已真正归属自己、这次要寄哪些、付款后是否真的离仓，以及运输异常时要做什么。

当前产品希望替代的低效行为是：在电商订单、物流网站、微信客服和末端承运商之间反复切换、手工盘点和等待人工回复。

长期愿景不是“堆叠物流功能”，而是在真实业务和外部数据可用时，逐步建立一个可信的个人跨境集运体验：用户可以理解事实、完成必要决策，并在需要行动时获得明确指引。

---

## 2. Core User Problem

以下问题来自现有 Discovery 结论与 P01 的真实经历。它们描述当前研究所观察到的方向，不外推为所有用户的普遍行为。

| Core problem | 当前证据与边界 | 用户影响 |
| --- | --- | --- |
| 多平台购买后，多个 Package 需要被人工盘点 | P01 最近一次转运涉及约 10–20 件来自多个平台的包裹；其描述人工核对订单“很麻烦”。 | 难以判断本次是否已齐件、哪些应等待、哪些可寄。 |
| 国内物流签收后，到仓、归属与可合箱状态仍不清楚 | P01 仍会向客服确认仓库是否收到并归入个人集合。 | 用户无法仅凭国内物流签收判断下一步。 |
| 多个 Package → 一个 Shipment 需要人工协调 | P01 会主动决定何时合箱、选取或排除哪些包裹。 | 用户缺少一个清晰、可控的“本次转运”决策点。 |
| 付款后是否实际离仓不够透明 | P01 在付款后仍会通过客服确认离仓。 | 容易将付款事实误解为已发货，或继续依赖人工查询。 |
| 国际运输信息分散 | P01 会在物流网站、客服和英国末端承运商之间切换查询。 | 用户难以在一个位置理解当前阶段与后续预期。 |
| 异常时缺少可行动的信息 | P01 曾遇英国末端状态停滞，最终自行联系承运商。 | 用户需要自行判断影响、升级时机和支持对象。 |

报价本身不是当前研究中最强的痛点证据；但最终重量、报价和付款是完成一次转运交易闭环的必要事实，因此被纳入 V1。

---

## 3. Core Jobs To Be Done

1. **当多个国内 Package 陆续到达中国仓时，我想确认它们是否到仓并归属自己，从而判断本次是否可以合箱。**
2. **当有一批可处理 Package 时，我想批量选择本次要寄出的物品并建立一个 Shipment，从而控制这次发什么、何时发。**
3. **当 Shipment 已称重、报价和付款后，我想确认是否实际离仓及后续履约，从而不把付款误认为已发运。**
4. **当运输或包裹出现问题时，我想知道发生什么、影响什么、下一步做什么，从而避免面对无法行动的“异常”状态。**

这些 JTBD 是 V1 优先级的锚点。任何能力若不能服务于核心用户价值、核心闭环、运营前置或必要外部依赖，均不应因为“集运产品通常会有”而提前进入近期范围。

---

## 4. Product Capability Map

### 4.1 Customer-facing Mini Program

| Capability domain | Capability | Current status | Release direction | Notes |
| --- | --- | --- | --- | --- |
| Warehouse Information | 中国仓地址、个人识别码、复制地址 | Completed | V1 | 由首页聚合展示。 |
| Package Declaration | 国内运单号、商品描述预报与重复校验 | Completed | V1 | 用户端真实业务逻辑。 |
| Package Visibility | 列表、详情、状态筛选、到仓时间与重量 | Completed | V1 | 用户看到中文状态与下一步。 |
| Ownership / Matching Visibility | 已到仓待确认、可合箱、需处理 | Completed | V1 | 用户看结果；匹配事件本身为模拟操作。 |
| Multi-package Selection | 多选、不可选原因、未选可合箱提醒 | Completed | V1 | 针对 10–20 件 Package 场景设计。 |
| Shipment Creation | 草稿、英国地址、提交、取消、转运单号 | Completed | V1 | 地址为单次 Shipment 快照。 |
| Quote | 最终重量、计费重量、费用明细、总价 | Completed / Simulated | V1 | Quote 快照逻辑真实；重量与费率来源模拟。 |
| Payment | 用户发起付款、成功/失败结果、付款后状态 | Completed / Simulated | V1 | 不接入真实支付渠道。 |
| Dispatch Visibility | 已付款待出库与已从仓库发出区分 | Completed | V1 | Dispatch 事实由模拟 Ops 产生。 |
| Tracking Timeline | 国际运输、清关、英国派送、签收 | Completed / Simulated | V1 | Timeline 与顺序约束真实；事件来源模拟。 |
| Exception Communication | 包裹/转运单异常、影响、行动、进度、支持说明 | Completed | V1 | 用户不可自行标记解决。 |
| Home Dashboard | 待办、当前运输、包裹概览、仓库信息 | Completed | V1 | 优先展示 Action Required，不做功能九宫格。 |
| Address Management | 地址簿、默认地址、多地址复用 | Planned | V2 体验扩展轨道 | 当前仅保存 Shipment 地址快照。 |
| Notifications | 到仓、报价、出库、异常等主动通知 | Planned | V2 体验扩展轨道 | 需先验证通知触发时机与价值。 |
| Package Inspection / Photos | 验货、物品总览、装箱照片凭据 | Planned | V2 体验扩展轨道 | P01 表示照片对其核对商品状态和打包过程有帮助；是否应成为更广泛用户的优先能力仍待验证。 |
| Support Entry | 与当前实体关联的支持入口 | Planned | V2 体验扩展轨道 | 当前仅提供文字支持指引。 |
| Service Preferences | 加固、去包装、时效等有限偏好 | Planned | V2 体验扩展轨道 | P01 曾使用相关服务；需求范围、定价与责任规则仍是 Product Assumption。 |

### 4.2 Fulfilment / Operations Capability

| Operations capability | Current implementation | Current mode | Future need |
| --- | --- | --- | --- |
| Package receiving | 合法状态转换 | Mock Ops 触发 | 真实仓库操作入口或系统同步。 |
| Package matching | 归属状态转换与异常阻断 | Mock Ops 触发 | 仓库操作员匹配流程、证据与队列。 |
| Ownership validation | User / Package / Shipment 所有权校验 | Backend/domain implemented | 真实登录与授权模型。 |
| Duplicate prevention | 国内运单号去重、重复操作保护 | Backend/domain implemented | 保持并扩展为运营侧冲突处理。 |
| Shipment package locking | 提交时事务校验、锁定与释放 | Backend/domain implemented | Ops 修改时的权限和并发策略。 |
| Packing / final weight | 仓库处理中、最终重量与计费重量记录 | Mock Ops + backend validation | 仓库作业、照片、装箱与称重设备接入。 |
| Quote generation | Quote 快照、费用明细与不可变历史报价 | Backend/domain implemented；输入模拟 | 可配置费率、线路与人工审核。 |
| Payment gate | 成功付款才允许 Dispatch | Backend/domain implemented；付款模拟 | 真实支付回调、对账和退款规则。 |
| Dispatch | 出库事实与离仓时间 | Mock Ops + backend validation | 仓库出库确认与承运商交接。 |
| Tracking event management | 相邻阶段推进、事件历史与中文 Timeline | Mock Ops + backend validation | 承运商事件映射、延迟/重复/缺失处理。 |
| Exception blocking / resolution | 阻断、保存恢复状态、解决后恢复 | Backend/domain implemented；触发模拟 | Ops 处理队列、证据、责任归属与协作。 |
| Audit logging | 关键操作审计记录 | Backend/domain implemented | 面向运营人员的查询、筛选和审计界面。 |

V1 已具备支撑用户状态的核心领域规则，但没有完整 Ops UI 或 WMS。Mock Ops 的价值是让模拟外部事件也经过同一服务层、状态机与审计约束，而不是直接修改数据库。

### 4.3 External Integrations

以下能力不按普通“用户功能待办”处理。在作品集 V1 中它们可以保持模拟；但一旦目标变为真实业务试运行，认证、支付、仓库事件来源、物流事件来源及相应运营规则需要按具体业务模式评估为 **Production / business readiness prerequisites（生产/业务就绪前置条件）**，并可能构成 release gate。

| External capability | V1 status | Future direction | Why not earlier |
| --- | --- | --- | --- |
| WeChat Login | Not implemented；Demo 用户身份 | V3 真实业务启用轨道；真实试运行时评估为 gate | 真实身份、账户合并与安全边界尚未定义。 |
| WeChat Pay | Simulated | V3 真实业务启用轨道；真实收款前为 gate | 支付主体、合规、回调、对账与退款规则均是额外业务前提。 |
| Warehouse system | Mocked | V3 真实业务启用轨道；真实仓库事件前为 gate | 尚无仓库合作、数据契约或操作流程验证。 |
| Domestic courier tracking | Mocked | V3 真实业务启用轨道；按试运行范围评估 | 需授权、事件质量与包裹匹配规则。 |
| International logistics tracking | Mocked | V3 真实业务启用轨道；按试运行范围评估 | 需承运商数据、事件映射和异常策略。 |
| Customs events | Mocked | V3 真实业务启用轨道；按试运行范围评估 | 涉及合规责任与真实事件来源。 |
| UK last-mile tracking | Mocked | V3 真实业务启用轨道；按试运行范围评估 | 需承运商能力、单号映射与服务规则。 |
| Notifications | Not implemented | V2 体验扩展轨道；渠道接入另行评估 | 应先验证哪些事件值得主动打扰用户。 |

### 4.4 Platform / Business Capabilities

| Capability | Roadmap horizon | Product rationale |
| --- | --- | --- |
| Ops Console / Warehouse Operator Interface | V3 真实业务启用轨道 | Portfolio V1 不建设完整后台；真实试运行所需的最小运营操作面需按流程和风险另行定义。 |
| Customer Service Platform | Future | 当前优先减少常规查询；完整工单依赖团队、SLA 和知识库。 |
| Refund / Claims | Future | 依赖责任、保险、证据、财务与合规规则。 |
| Pricing Configuration | V3 真实业务启用轨道 | 依赖真实线路、成本、体积重与例外规则；若真实报价上线，它可能是业务 gate。 |
| Multi-route / Multi-warehouse | Future | 需先验证单仓单线路模型与实际履约网络。 |
| Multi-country | Future | 不应在中国→英国核心价值未验证前扩张。 |
| Membership / Coupon / Promotion | Future | 属于商业扩展，不解除首次核心任务阻塞。 |
| Analytics / Operational Reporting | Future | 需要真实使用和运营数据后定义有效指标。 |

---

## 5. V1 Definition

### 5.1 V1 Product Goal

让用户在不持续依赖人工客服查询常规状态的情况下，完成一次中英集运的核心旅程：确认可用 Package、形成 Shipment、理解最终报价、完成模拟付款、确认实际出库、追踪至签收，并在异常时理解下一步。

### 5.2 V1 User Journey

```text
Warehouse Information
→ Package Declaration
→ Warehouse Arrival / Matching
→ Ready for Shipment
→ Select Multiple Packages
→ Create Shipment
→ Warehouse Processing
→ Final Weight
→ Quote
→ Payment
→ Paid Awaiting Dispatch
→ Dispatch
→ International Transit
→ Customs
→ UK Last Mile
→ Delivered
```

异常路径贯穿 Package 和 Shipment：

```text
Normal state
→ Blocking Exception
→ 用户查看发生什么 / 影响 / 下一步 / 进度 / 支持
→ Ops resolve
→ 恢复到记录的合法原状态
```

### 5.3 Why This Is a Valid V1

V1 不是“功能还不多的产品”，而是对当前核心价值作出的最小完整承诺：

1. **从用户问题出发。** P01 的单次经历为到仓归属、多个 Package 盘点、合箱、付款后离仓确认构成连续旅程的判断提供方向性支持；其适用范围仍需更多研究验证。
2. **覆盖了核心 JTBD。** 用户能够确认可用 Package、批量构建 Shipment，并区分报价、付款、出库和后续履约。
3. **闭环而非单点。** Package → Shipment → Quote → Payment → Fulfilment → Tracking → Exception 形成一次可走完、可恢复的旅程；没有把用户停在“已经付款”或“仅显示异常”的断点。
4. **范围受控。** 不把会员、优惠、完整客服、完整 WMS、真实支付或多国线路混入首次价值验证。
5. **设计先于实现。** V1 的范围来自 Research、MVP Definition、Wireframe、Prototype 和 Usability Test；工程实现用于检验业务规则能否被可靠执行，而不是反向决定产品边界。
6. **验证层级清楚。** Prototype 和 UT01 支持目标任务在单次探索性测试中的可完成性；端到端测试与人工回归支持实现质量。两者都不等同于市场成功或规模化用户验证。

---

## 6. V1 Scope: What Is Actually Included

### Customer-facing scope

- 首页：待办、当前运输、Package 概览、中国仓地址与复制；
- Package 预报、列表、筛选、详情、中文状态、到仓/匹配可见性；
- 多 Package 选择、不可选原因、未选可合箱提醒；
- Shipment 草稿、英国地址、提交、取消、稳定转运单号、列表与详情；
- 最终重量、计费重量、费用快照、模拟付款与失败/成功结果；
- “已付款待出库”与“已从仓库发出”的明确区分；
- 出库后的国际运输、清关、英国派送、签收 Timeline；
- Package / Shipment 异常的中文说明和行动指引。

### Backend / operational scope

- 状态机、输入校验、归属隔离、重复预报防护；
- 提交时的 Package 原子锁定与草稿释放；
- Quote snapshot、付款与 Dispatch 闸门、Tracking 事件顺序；
- Exception 阻断、解决、恢复及 Audit Log；
- 可重复 Seed Demo Data 与受保护 Mock Ops 命令。

### Simulated scope

- 仓库收货、匹配、称重、报价输入和出库；
- 支付结果；
- 国内/国际运输、清关、英国末端事件与签收；
- 承运商、客服、外部电商及仓库系统数据。

---

## 7. V1 Completion Criteria

### Product completion

- 核心 JTBD 均有产品承接；
- Happy Path 从仓地址到签收可完整走通；
- Package 与 Shipment Exception 均可阻断、说明、解决并恢复；
- 付款、实际出库与签收不被混为同一状态。

### UX completion

- 7 个 P0 页面均由真实后端 API 驱动；
- 所有用户可见状态、错误和操作文案使用中文；
- 10–20 件 Package 场景具备筛选、多选、不可选原因和未选提醒；
- UT01 完成四项核心任务；发现的连续选择回顶（Major）与移除位置（Minor）问题均已修改，并完成目标场景回归；
- 最终人工验收已通过。

### Engineering completion

- Fastify REST API、SQLite migration / seed、领域服务、状态机、结构化错误与中文 DTO；
- Mock Ops 不绕过领域服务或直接改表；
- Ownership isolation、Quote Snapshot、Package locking、付款/出库闸门、Tracking 顺序、Exception 恢复与 Audit Log 均已实现；
- 演示数据可 reset / seed 后重现不同状态的 Package、Shipment、Quote、Payment、Tracking 和 Exception。

### Validation completion

| Validation | Current V1 record | What it demonstrates | What it does not demonstrate |
| --- | --- | --- | --- |
| Server TypeScript | Passed | 服务端类型一致性 | 市场需求成立。 |
| Mini Program TypeScript | Passed | 小程序类型一致性 | 真机全设备体验。 |
| Vitest | **15 test files / 53 tests passed** | 领域、API、约束与回归质量 | 真实业务系统可用性。 |
| Happy Path E2E | Passed | 不直接改库即可从预报推进至签收 | 真实仓库、支付或承运商事件。 |
| Exception Path E2E | Passed | 阻断、恢复与 Timeline 保留 | 所有异常类型的运营策略。 |
| Final manual regression | Passed | 当前 Demo 的用户任务流与展示可验收 | 多用户、多设备与长期使用行为。 |

因此，**V1 Completed** 表示：当前 Assumption-led MVP 的产品闭环、交互边界和工程质量目标已完成；不表示产品已获得广泛市场验证或已具备真实商业运营条件。

---

## 8. What V1 Does Not Include

以下能力未进入 V1，并不意味着 V1 不完整；它们属于不同类型的后续问题。

| Excluded capability | Category | Why excluded from V1 |
| --- | --- | --- |
| Real WeChat Login / Pay | External integration | 需要真实主体、合规、安全、回调和结算规则。 |
| Real warehouse / courier / customs / last-mile integration | External integration | 缺乏数据契约、合作与事件可靠性验证。 |
| Notification system | Experience enhancement | 核心状态先要可见，通知价值和触发规则需验证。 |
| Address book | Experience enhancement | 单次 Shipment 地址快照已支撑核心闭环。 |
| Package photos / inspection evidence | Experience enhancement | 有方向性证据，但不阻塞首次闭环。 |
| Full Ops Console / WMS | Operational scaling | 用户端价值可先验证，不应提前建设完整仓库系统。 |
| Customer service platform | Operational scaling | V1 优先减少常规查询，不假设完整服务组织。 |
| Refund / claims | Commercial / operational | 依赖责任、证据、财务与合规机制。 |
| Multi-country / multi-warehouse / multi-route | Scaling | 需要真实网络、定价和合规规则。 |
| Membership / coupon / promotion | Commercial expansion | 不解决当前核心 JTBD。 |

---

## 9. Release Roadmap

### How V2 and V3 relate

V2 与 V3 是围绕不同目标设置的**并行规划轨道**，不表示“完成 V2 后才能开始 V3”：

| Planning track | Primary question | When it takes priority | Release decision |
| --- | --- | --- | --- |
| **V2 — Customer Experience Expansion** | 在既有核心闭环上，哪些体验增强确实能减少重复操作或信息不确定性？ | 下一阶段目标是继续用户验证、可用性迭代或验证候选体验价值时。 | 根据新增研究、任务数据和可用性证据选择具体能力。 |
| **V3 — Operations & Real-world Enablement** | 若要真实提供服务，哪些认证、运营流程、外部数据和合规能力必须先具备？ | 下一阶段目标是进入真实业务试运行或真实收款/履约时。 | 先定义最小试运行范围，再将其中必要能力设为 release gates；不要求等待全部 V2 候选能力完成。 |

因此，V1.1 后的选择不是自动进入 V2：继续产品验证时优先进入 V2；准备真实业务试运行时，部分 V3 前置条件可以先行，或与已验证的 V2 能力并行推进。

### V1 — Core Customer Journey

**Status: Completed**

| Item | Definition |
| --- | --- |
| Objective | 验证个人用户能否通过一个连续入口完成中英集运核心信息与决策旅程。 |
| Scope | Package 可见性、合箱、Shipment、报价、模拟付款、出库、追踪、异常、首页聚合。 |
| Validation | P01 探索性研究、UT01 原型测试、53 项自动化测试、Happy / Exception E2E、最终人工回归。 |
| Why this release exists | 先解决“知道什么、能做什么、下一步是什么”，再讨论扩张、营销或真实外部集成。 |

### V1.1 — Product Polish & Portfolio Release

**Status: Planned; no new core business capability**

| Item | Definition |
| --- | --- |
| Objective | 提升 V1 作为稳定 Demo 和作品集的可展示性、可复现性与发布质量。 |
| Candidate scope | 更多设备/网络条件回归、视觉细节与状态文案走查、Demo 数据稳定性、脱敏截图、演示视频、文档与发布材料完善。 |
| Explicit boundary | 不新增完整支付、仓库、物流、客服、会员或其他大型业务能力。 |
| Entry condition | 保持 V1 核心状态机与范围不变。 |
| Exit evidence | 发布材料可复现；关键 Demo 流程在目标设备和网络条件下可稳定展示。 |

### V2 — Customer Experience Expansion Track

**Status: Planned; contingent on further user evidence**

| Item | Definition |
| --- | --- |
| Objective | 在不改变核心 Package → Shipment 模型的前提下，降低重复操作和信息不确定性。 |
| Candidate scope | 地址簿、关键状态通知、Package / 验货 / 装箱照片凭据、上下文支持入口、有限服务偏好、更清晰的追踪沟通。 |
| Why this track follows V1 | 这些能力可改善体验，但不阻塞 V1 的首次核心闭环；是否进入下一 release 取决于更多用户研究、任务数据和可用性证据。 |
| Validation needed | 验证哪些用户真正需要、何时需要、是否减少查询/沟通，以及是否引入新的理解负担。 |

### V3 — Operations & Real-world Enablement Track

**Status: Planned; dependent on operating model and partners**

| Item | Definition |
| --- | --- |
| Objective | 在明确的试运行范围内，将可验证的用户端 MVP 逐步补足真实业务运行所需的能力。 |
| Candidate scope | Ops Web Console、Warehouse Operator Workflow、运营异常处理、真实登录、真实支付、仓库系统同步、物流/清关/末端事件接入、价格配置。具体最小集合待真实业务模式确定。 |
| Relationship to V2 | 不以 V2 全部完成为前提。若要真实试运行，所需的认证、支付、仓库操作/事件、履约数据和运营控制应先作为 release gates 评估；体验扩展能力可并行或延后。 |
| Validation needed | 明确仓库流程、权限、数据契约、服务 SLA、支付/退款责任、承运商事件质量和合规边界。 |

### Future Platform Expansion

**Status: Future candidate; no release commitment**

- 多仓库、多线路、多国家和多币种；
- 完整客服 / 工单、售后、退款与理赔；
- 会员、优惠、促销、推荐和商业化策略；
- 运营报表、成本分析、增长分析与风控；
- 企业或代购账户。

这些方向只有在单仓单线路的个人用户价值、真实运营机制和数据基础被进一步验证后，才应重新评估。

---

## 10. Prioritisation Logic

路线顺序由以下原则共同决定：

| Principle | Question | Roadmap application |
| --- | --- | --- |
| User Value | 是否直接解除核心 JTBD 的阻塞？ | Package 可见性、合箱、出库与 Tracking 先于会员或优惠。 |
| Evidence | 是否有研究或可用性证据，证据边界是什么？ | P01 支持多包裹与自助状态方向；照片、通知和偏好留待 V2 继续验证。 |
| Dependency | 是否是后续能力的业务前置？ | Package 状态与 Shipment 锁定先于 Quote；付款闸门先于 Dispatch；Dispatch 先于 Tracking。 |
| Risk | 是否依赖未验证的外部规则或合作？ | 真实支付、仓库、清关和承运商数据进入 V3 真实业务启用轨道；若启动真实试运行，其中适用项应作为 release gate，而非普通功能排期。 |
| Complexity | 是否引入高运营、合规或维护成本？ | 完整 WMS、客服、理赔、多国能力不提前建设。 |
| Portfolio Value | 是否清楚体现问题、决策、闭环与验证？ | V1 优先完成可解释的端到端闭环，而非展示大量孤立功能。 |

### User-facing feature priority vs. production / business readiness prerequisites

这两类决策不能混用。前者回答“下一步最值得为用户增加什么体验”；后者回答“是否可以把模拟 Demo 变成真实服务”。

| Decision type | Typical items | Prioritisation basis | Release implication |
| --- | --- | --- | --- |
| **User-facing feature priority** | 地址簿、通知、照片凭据、支持入口、服务偏好 | 用户问题、JTBD、可用性与新增研究证据 | 作为 V2 候选能力排序；即使暂不实现，也不阻断 Portfolio V1 Demo。 |
| **Production / business readiness prerequisites** | 真实身份认证、真实支付、仓库接收/称重/出库操作、价格规则、承运商/物流事件、权限与审计、合规与支持流程 | 试运行的业务模式、合作方、资金流、履约责任、数据质量与合规风险 | 当目标是实际运营时，其中适用的最小集合是 release gates；不能仅作为“以后再做的功能”处理。 |

真实试运行所需的最小 gate 组合尚未定义，属于后续业务设计与合作验证范围；本文不假设必须一次接入所有外部系统。

### Why specific choices are sequenced this way

- **Tracking 早于 Membership：** 用户需要先知道 Shipment 是否真正推进；会员不改善首次核心履约判断。
- **Exception Handling 早于 Coupon：** 异常阻断主流程并影响信任；优惠只影响商业刺激。
- **模拟支付早于真实支付：** 先验证付款在状态机中的位置与用户理解，再承担支付主体、合规和结算复杂度。
- **用户端闭环早于完整 Ops Console：** 在 Portfolio V1 中，先确认用户需要什么可见事实，再以真实运营流程定义后台界面；若进入真实试运行，必要的最小 Ops 能力可成为先行 gate，并不等待完整 Console。
- **地址快照早于地址簿：** 单次收货地址足以完成 Shipment；地址复用是效率优化而非闭环前置。

---

## 11. Capability / Version Matrix

Legend: **Completed** = 已实现；**Planned** = 有方向、待验证或排期；**Future** = 长期候选；**—** = 不作为该版本目标。

矩阵中的 **V2 体验扩展轨道** 与 **V3 真实业务启用轨道** 表示能力的主要归属，不表示固定的 V2 → V3 时间顺序。若目标切换为真实试运行，真实支付、运营操作、价格配置及适用的外部事件来源均应先按实际运营范围评估为 `Pilot gate`。

| Capability | V1 | V1.1 | V2 体验扩展轨道 | V3 真实业务启用轨道 | Future |
| --- | --- | --- | --- | --- | --- |
| Warehouse Information | Completed | Polish | — | Real integration (pilot scope) | Multi-warehouse |
| Package Declaration | Completed | Polish | Improve from evidence | Real sync support (pilot scope) | — |
| Package Status / Matching Visibility | Completed | Polish | Better communication | Pilot gate: real warehouse events | — |
| Multi-package Selection | Completed | Device validation | Improve from evidence | — | — |
| Shipment Creation | Completed | Polish | Improve from evidence | — | — |
| Quote | Completed / Simulated | Demo clarity | UX refinement | Pilot gate: real pricing configuration | Multi-route pricing |
| Payment | Completed / Simulated | Demo clarity | — | Pilot gate: real WeChat Pay | Additional payment methods |
| Dispatch Visibility | Completed / Mock source | Polish | Better communication | Pilot gate: real warehouse dispatch | — |
| Tracking Timeline | Completed / Simulated | Device validation | Better tracking communication | Pilot gate: applicable real carrier events | Multi-carrier normalisation |
| Exception Communication | Completed | Polish | Contextual support entry | Ops exception workflow | Claims / dispute management |
| Home Dashboard | Completed | Polish | Personalisation only if evidenced | — | — |
| Address Book | — | — | Planned | — | — |
| Notifications | — | — | Planned | Channel integration | Preference management |
| Package / Inspection Photos | — | — | Planned | Warehouse capture workflow | Evidence archive |
| Service Preferences | — | — | Planned | Real service / pricing rules | Complex service catalogue |
| Ops Console | — | — | Discovery only | Minimum workflow may be a pilot gate | Expanded operations platform |
| Warehouse Operator Workflow | — | — | Discovery only | Pilot gate: scope-specific workflow | Multi-warehouse workflow |
| Real Payment | — | — | Discovery / feasibility | Pilot gate for real collection | — |
| Real Logistics Integration | — | — | Discovery / feasibility | Pilot gate as pilot scope requires | Multi-country integration |
| Claims / Refunds | — | — | — | Discovery only | Future |
| Multi-country / Multi-warehouse | — | — | — | — | Future |
| Membership / Promotion | — | — | — | — | Future |

`Polish` 和 `Device validation` 是 V1.1 的非业务扩展活动，不代表新增核心产品范围。

---

## 12. MVP vs Full Product

### MVP is not an incomplete product

MVP 是验证核心用户价值的**最小完整产品**。对于本项目，完整意味着用户不需要绕过系统、手工改数据或把“已付款”误当成“已发货”，即可完成从可用 Package 到 Shipment 签收的主路径，并理解异常路径。

MVP 不要求在首次版本中拥有所有商业能力、所有仓库工具或全部真实集成。若一个能力不解除当前核心 JTBD 的阻塞，或其前提尚未验证，就不应仅为“看起来完整”而进入 V1。

### Full product evolves in layers

```text
Core user value
├→ Customer Experience Expansion track
├→ Operations & Real-world Enablement track
└→ Commercial and scaling capability (when evidence and business readiness allow)
```

V1 只完成第一层和必要的领域规则。V2 是体验增强轨道；V3 是真实运营与外部集成的启用轨道。二者不构成绝对时序：继续用户验证时优先评估 V2；进入真实试运行时，适用的 V3 前置条件需要先作为 release gates 满足。长期平台能力仍需在真实业务基础上逐步定义。

---

## 13. Known Limitations

- 当前研究只有一位独立真实访谈参与者 P01；结论不能外推为广泛用户偏好或市场规模；
- UT01 同样为单一探索性样本，支持目标任务的可完成性，不代表普遍可用性；
- 微信小程序是当前 V1 的 delivery decision，是否是最佳商业入口仍是 Product Assumption；
- 仓库、支付、国内/国际物流、清关和英国末端事件均为模拟来源；
- SQLite 适合当前单实例 Portfolio MVP，不是多运营人员、跨地域高并发生产部署方案；
- 当前最终人工验收已通过，但系统化真机、多网络和更大包裹规模的覆盖仍有限；
- 当前没有真实业务指标，因此不能声称已减少客服成本、提升转化或验证留存。

---

## 14. Evidence and Design Learnings So Far

以下内容明确区分单样本证据与当前产品设计决策，不构成新的市场结论：

1. **P01 方向性支持 Package visibility 是其决策前置。** 在 P01 的旅程中，国内签收后是否已归属个人、是否可合箱，决定其能否进入后续合箱决策；是否适用于其他服务模式仍待验证。
2. **Paid 与 Dispatched 的分离是证据支持的产品决策。** P01 在付款后仍查询是否离仓；UT01 能在无提示下判断“已付款，等待仓库发出”尚未出库。这支持当前状态表达，但不代表所有用户都不会混淆两者。
3. **多 Package 选择按 P01 观察规模设计。** P01 最近一次处理约 10–20 件 Package，因此筛选、多选、未选提醒、不可选原因和提交前校验被纳入设计。UT01 的连续选择摩擦已被观察和定向复测；该规模不是普遍用户画像结论。
4. **可行动的 Exception 是当前设计假设。** P01 曾遇到英国末端派送停滞并自行联系承运商；“发生什么、影响什么、下一步、进度、支持方式”的完整表达是据此形成的产品设计，而非已被广泛验证的用户偏好。UT01 仅支持该原型异常任务在单次测试中的可完成性。
5. **首页待办优先是信息架构决策。** 它服务于当前跨实体任务流，不应被表述为 P01 或 UT01 已证明的普遍偏好；后续需结合更多使用证据评估。

---

## 15. Decision Log Summary

| Decision | Why | Evidence / rationale |
| --- | --- | --- |
| 以微信小程序作为 V1 交付形态 | 为当前中文用户场景提供低摩擦移动入口 | 当前是 product delivery decision；是否为最佳长期入口仍待验证。 |
| V1 不做完整 Ops UI | Portfolio V1 先验证用户侧闭环 | 完整 WMS / Ops Console 依赖真实仓库流程和运营角色；若进入真实试运行，最小 Ops workflow 需另行作为 release gate 定义。 |
| Payment 使用模拟 | 保留付款在履约状态机中的真实位置 | 真实支付需要主体、合规、回调、对账和退款机制；若开始真实收款，它是业务就绪 gate，而非普通体验功能。 |
| Package 仅在 Shipment 提交时 lock | 用户在草稿阶段仍需要调整选择 | 支持可修改草稿；提交时以事务防止同件包裹重复占用。 |
| Paid ≠ Dispatched | 用户需要确认是否真正离仓 | P01 在付款后仍查询离仓；状态机与 UI 共同防止误读。 |
| Exception 阻塞状态推进 | 出现业务问题时不能假装主流程正常继续 | 保存异常前状态，解决后恢复到合法状态；E2E 已覆盖。 |
| 首页以 Action Required 为最高优先级 | 首页目标是帮助用户判断现在该做什么 | 当前信息架构决策：将异常、待付款、待确认和可合箱置于普通进度前；尚非已验证的普遍用户偏好。 |
| V1 以完整核心旅程结束，而非功能数量 | 产品价值来自可走通、可理解、可恢复的任务闭环 | Research → PRD → Prototype → UT01 → E2E → 人工验收形成可追溯链路。 |

---

## 16. Next Recommended Step

### Current state

**V1 Completed**：核心产品闭环、模拟边界、工程质量门禁和最终人工验收均已完成。

### Next release

下一阶段应是 **V1.1 — Product Polish & Portfolio Release**，而不是立即增加大型业务模块。重点是让当前 Demo、文档、截图和演示材料更稳定、更可理解、更容易被产品面试官复现和评估。

### Choosing the next track

V1.1 完成后，不预设 V2 必然先于 V3：

- 若下一阶段目标是继续收集用户证据、验证体验价值或优化任务完成效率，优先进入 **V2 Customer Experience Expansion track**；
- 若下一阶段目标是进行真实业务试运行、真实收款或真实履约，先定义试运行范围，并优先满足适用的 **V3 Production / business readiness release gates**；
- 两条轨道可以并行，但每项能力仍须有清晰目标、证据边界与依赖说明。

### Entry conditions for V2 Customer Experience Expansion track

进入 V2 前，应至少满足以下前提：

1. V1 的展示和演示数据稳定可复现；
2. 获取更多真实用户研究或可用性证据；
3. 明确地址簿、通知、照片、支持入口和服务偏好中哪些真正有优先级；
4. 不将工程测试通过误读为商业价值已经被验证；
5. 保持对真实外部集成、合规和运营规则的审慎边界。

### Entry conditions for a V3 real-world pilot

在声称可以真实运营前，至少需要为所选试运行范围明确：真实用户身份与授权方式、收款与对账责任、仓库操作与出库确认、价格与例外规则、必要的履约事件来源、支持与异常升级机制，以及相应的安全与合规边界。这些是待完成的业务设计与合作验证，不应由 Portfolio V1 的模拟能力替代。

这一路线确保产品从 MVP 演进为更完整的跨境集运体验时，始终由用户价值、证据、依赖和风险驱动，而不是由功能数量驱动。
