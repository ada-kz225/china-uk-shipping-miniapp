# Technical Design Summary

> 本文汇总 V1 的技术设计与其当前实现状态。项目现为 **V1 Completed**；初始计划中未落地的具体 contract 已在对应章节标记为 **Initial / Proposed Design**，当前实现以代码为准。

## 1. 推荐技术栈

- 微信原生小程序 + TypeScript；
- Node.js 22+ + TypeScript + Fastify；
- Zod 输入校验；
- SQLite + `better-sqlite3` 直接 SQL access / SQL migration；
- Vitest + Fastify API tests；
- Seed Script + 受保护的单事件 Mock Ops routes。

该方案是面向单人 Portfolio MVP 的模块化单体：足以实现真实核心规则，又不引入未被范围需要支撑的基础设施。

## 2. Overall Architecture

小程序通过 REST API 访问服务端。当前开发 / Demo 环境使用 `X-Demo-User-Id` 提供演示身份；服务端随后完成归属、输入、领域规则和事务校验，再持久化到 SQLite。Mock Ops 只作为外部事实的模拟来源，使用同一服务层推进状态。中文 presenter 在 API DTO 层将内部状态映射为用户文案。

## 3. Core Data Model

- `users`、`warehouses`：数据归属与中国仓地址组合；
- `packages`：国内包裹预报、到仓、归属与可合箱；
- `shipments`、`shipment_packages`：一次转运与 Package 锁定；
- `addresses`：每次转运的英国收件地址快照；
- `quotes`、`payments`：最终费用快照与模拟付款尝试；
- `tracking_events`：出库后的连续履约时间线；
- `exceptions`：阻断、下一步与恢复目标；
- `audit_logs`：关键业务事实的内部追溯。

数据库以唯一索引、部分唯一索引、外键与事务防止重复预报和重复锁定；实体保留 `version` 字段，当前 V1 未实现完整的客户端乐观锁协议。

## 4. API Modules

| Module | Main responsibility |
| --- | --- |
| Home / Warehouse | 首页聚合与中国仓收件信息。 |
| Package | 列表、详情、预报与最小证明。 |
| Shipment | 草稿、地址、提交、列表、详情与取消。 |
| Payment | 用户发起模拟付款与读取结果。 |
| Detail DTO | 在转运单详情中返回 Quote、时间线和异常。 |
| Mock Ops | 仅开发 / Demo 的受保护事件命令。 |

没有为 Quote、Tracking 或 Exception 创建额外用户页面或无用途的 API 资源。

## 5. State Machine Implementation

- Package 从预报、送仓、待匹配、可合箱到已加入转运；异常可按记录的状态恢复；
- Shipment 从草稿、提交、仓库处理、报价、付款、等待出库、出库、国际运输、清关、英国派送到签收；
- `PAID_AWAITING_DISPATCH`、`DISPATCHED` 与 `DELIVERED` 在技术上是三个不同状态；
- 所有转换经 Service 校验，非法跳转和用户任意状态提交都会被拒绝；
- 状态变化与关键事实同事务写入 AuditLog；履约阶段同时生成中文 TrackingEvent。

## 6. Mock Ops 机制

Seed 提供一组固定的状态展示与异常数据（19 件 Package、6 个 Shipment）。内部 Mock Ops routes 只在非生产环境开放、需要独立密钥，并调用真实服务方法。它可模拟仓库收货、匹配、称重、报价、付款结果、出库、运输事件、异常与解决，但不能直接改表或跳过闸门。

## 7. Testing Strategy

测试从 Unit → SQLite Integration → API → 小程序页面回归 → PRD E2E 验收逐层覆盖。重点测试：

- 状态转换与非法转换；
- 运单去重、ownership、Package 锁定与释放；
- Quote Snapshot、付款 / 出库闸门；
- Exception 阻断与恢复；
- 12 件预报 → 10 件可合箱 → 选择 8 件 → 转运 → 报价 → 付款 → 出库 → 签收；
- Package 与 Shipment 的异常路径；
- 全量中文用户 DTO 和错误提示。

## 8. Development Phases

1. 初始化；
2. Domain / Database / Seed；
3. Package Management；
4. Shipment Consolidation；
5. Quote + Payment Simulation；
6. Dispatch + Tracking；
7. Exception；
8. Home / Refresh；
9. 质量收口与演示。

每个阶段以领域规则、真实 API、页面承接和测试通过为完成条件，而不是只完成静态 UI。

## 9. Technical Risks

| Risk | Mitigation / boundary |
| --- | --- |
| 真实业务规则未验证 | 明确为 Product Assumption；使用 Mock，而不伪装为真实接入。 |
| 用户将付款误解为出库 | 独立状态、Dispatch 闸门、中文 DTO 和 E2E 断言。 |
| 并发重复锁定 Package | 提交事务、部分唯一索引、version 和 idempotency key。 |
| Demo 数据失真或不可复现 | 固定 Seed 数据、Mock source、无真实个人数据。 |
| 单人项目过度工程化 | 模块化单体、SQLite、无微服务 / 消息队列 / 真实 SDK。 |
| 状态码泄漏到用户界面 | 中央 copy mapper、API contract test、中文 UI review。 |

## 10. Consistency Check

| PRD requirement | Domain / Schema | API / service | Page / test |
| --- | --- | --- | --- |
| FR-001 仓地址 | User + Warehouse | `GET /home` 中的 `warehouse` 聚合字段 | 首页；地址复制检查。 |
| FR-002 / 003 Package 预报与可见性 | Package、AuditLog | PackageService + Package API | 预报 / 列表 / 详情；去重、归属测试。 |
| FR-004 / 005 合箱与地址 | Shipment、ShipmentPackage、Address | Draft / submit service | 包裹多选、创建转运单；10 选 8 验收。 |
| FR-006 锁定与 Reference | Shipment、ShipmentPackage、AuditLog | submit transaction | 创建成功与并发锁定测试。 |
| FR-007 / 008 转运可见性 | Shipment、Quote、Payment、Tracking、Exception | Shipment list / detail DTO | 转运列表 / 详情；中文状态检查。 |
| FR-009 / 010 重量与 Quote | Shipment、Quote | QuoteService + Mock Ops | 详情报价区块；无重量不能报价。 |
| FR-011 / 012 付款与出库 | Payment、Shipment、TrackingEvent | Payment / Dispatch service | 付款区块；付款不等于出库测试。 |
| FR-013 运输 / 签收 | TrackingEvent、Shipment | TrackingService | 详情时间线；顺序与签收测试。 |
| FR-014 异常 | Exception、AuditLog | ExceptionService | 详情异常区块；阻断 / 恢复测试。 |
| FR-015 / 016 首页与状态反馈 | 聚合 DTO、copy mapping | Home API / error middleware | 首页、加载 / 错误 / 刷新检查。 |

**检查结论：**

- 没有发现 PRD P0 Requirement 缺少技术承接；
- 没有设计只为 REST 形式而存在、却无页面或业务调用的用户 API；
- 所有用户可见状态都有合法事件来源；Mock 事件同样受状态机约束；
- 不存在需要直接改数据库才能推进的演示路径；
- 未引入 P1 / P2 或范围外功能。

## 11. Readiness

**Implemented and validated in V1。**

当前实现遵守的边界是：Mock 不绕过业务规则、用户可见文案保持中文、Prototype 保持独立，并已完成对应自动化与人工验收。未来迭代仍应以代码、测试和新的产品证据共同更新本摘要。
