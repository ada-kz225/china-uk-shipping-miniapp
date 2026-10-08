# 技术决策记录

> 本文记录 V1 的关键取舍，重点解释为何方案适合已冻结的 Portfolio MVP，而不是建立复杂 ADR 流程。

## TD-001：使用原生微信小程序 + TypeScript

**Decision**：正式客户端采用微信原生小程序与 TypeScript。  
**Why**：目标交付是微信小程序，P0 仅 7 页；直接使用平台能力可减少跨端抽象和依赖。  
**Trade-off**：未来跨端复用有限；当前不以 Web / App 覆盖为目标。  
**Scope boundary**：不改变“微信是否为最佳商业入口”仍是 Product Assumption。

## TD-002：使用 TypeScript 模块化单体 API

**Decision**：使用 Node.js、TypeScript、Fastify，单一 API Server 承载路由、服务和 Mock Ops。  
**Why**：领域实体数量有限，但规则关联紧密；单体能低成本保证事务与状态一致性。  
**Trade-off**：不具备独立横向扩展的服务边界；V1 没有此需求。  
**Rejected**：微服务、消息队列、事件总线集群，会提高开发和演示复杂度而不改善当前闭环。

## TD-003：使用 SQLite 关系型数据库

**Decision**：V1 使用 SQLite + migration。  
**Why**：Package、Shipment、Quote、Payment、锁定与审计具有强关系和事务需求；SQLite 能本地复现并支持唯一 / 外键 / 事务。  
**Trade-off**：不适合多实例高并发生产部署；如果后续真实运营需要再迁移 PostgreSQL。  
**Rejected**：纯前端 local storage 无法可信地执行归属、锁定、付款出库闸门和审计。

## TD-004：状态变化必须经 Service / Event，不直接更新数据表

**Decision**：用户 Route、Mock Ops 与未来 Adapter 均调用领域服务；禁止通用 update endpoint。当前 Seed 为可重复的演示初始化，使用受控 SQL 写入固定状态数据，不作为用户或运营操作入口。
**Why**：避免 `PAID_AWAITING_DISPATCH` 被直接改为 `DISPATCHED`，或同一 Package 被重复锁定。  
**Trade-off**：Demo 事件需要多一层 command；换来可演示、可测试和可追溯的真实规则。  
**Rejected**：通过管理脚本直接改状态，会绕过 Portfolio MVP 的核心价值。

## TD-005：将仓库、支付与物流设为 Mock Adapter

**Decision**：外部事实使用受保护的 Mock Ops / Payment adapter，而不是连接真实服务。  
**Why**：项目没有已验证的真实合作方、计费、清关或支付规则；模拟可完整展示状态机而不虚构接入。  
**Trade-off**：不代表实时数据；README、界面说明和 DTO source 必须保持透明。  
**Rejected**：伪造真实承运商响应或硬编码状态，会误导作品集读者。

## TD-006：草稿不锁定，提交时原子锁定

**Decision**：Package 在多选 / 草稿阶段仍为可合箱；只有提交成功时锁定。  
**Why**：符合已冻结产品规则，避免用户浏览 / 返回时占用包裹；提交事务能处理并发。  
**Trade-off**：提交时可能发现 Package 已被占用，需给用户中文调整提示。  
**Rejected**：选择即锁定会造成无意义占用与复杂过期释放。

## TD-007：Quote 使用不可静默改写的 Snapshot

**Decision**：一个 Shipment V1 只生成一个 active Quote；金额、重量、时间和来源写为快照。  
**Why**：付款前需要稳定可核对的事实；付款后改价会破坏状态可信度。  
**Trade-off**：不支持重报、补款、退款等真实复杂情形，它们不在 V1。  
**Rejected**：每次读详情临时计算报价，难以审计且可能在付款前后变化。

## TD-008：中文文案由服务端 DTO 映射统一提供

**Decision**：保留内部英文 code，同时由 copy mapper 输出中文标题、说明和下一步。  
**Why**：保证“已付款，等待仓库发出”不被不同页面简写为“已发货”，并避免英文状态码泄漏。  
**Trade-off**：映射表需要契约测试维护。  
**Rejected**：由每个页面自行拼文案，易造成状态解释不一致。

## TD-009：Prototype 与正式代码隔离

**Decision**：保留 `prototype/` 作为冻结的 HTML 原型，正式代码位于独立小程序与服务端目录。  
**Why**：Prototype 是任务流验证工具，生产实现需要真实 API、状态和测试；复用静态脚本会带来数据和规则混乱。  
**Trade-off**：部分交互要重新实现；这是有意的实现分层。  
