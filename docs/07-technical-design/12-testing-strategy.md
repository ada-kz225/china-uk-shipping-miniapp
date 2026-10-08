# 开发测试策略

> 测试优先证明“状态和业务规则不能被绕过”，其次证明接口和小程序任务流正确。当前 Prototype 的 UT01 结果仅支持交互设计进入技术阶段，不能替代实现后的功能测试。

> **Current V1 implementation note**：本文件原本是开发前测试策略。V1 已完成，实际测试位于 `server/tests/`，覆盖数据库 Schema、Package、Shipment、Quote / Payment、Dispatch / Tracking、Exception、Home 与端到端路径；项目 README 记录当前运行命令。文中 Demo Session、scenario seed、提交幂等和部分计划中的覆盖项为 **Initial / Proposed Test Design**，不应被误读为当前测试 API 或实现细节。

## 1. Test layers

| Layer | Scope | Main purpose |
| --- | --- | --- |
| Unit Tests | State guard、领域服务、文案 mapper。 | 快速验证规则与边界。 |
| Repository / Integration Tests | SQLite migration、事务、唯一索引、关联释放。 | 验证数据层真的能守住约束。 |
| API Tests | Fastify routes + auth guard + services + test database。 | 验证请求、响应、错误与 ownership。 |
| Mini Program Integration Checks | 页面与 API 的加载、提交、刷新、中文提示。 | 验证 7 个 P0 页面能承接真实数据。 |
| End-to-End Acceptance | PRD Happy Path 与 Exception Path。 | 验证完整闭环没有绕过状态机。 |

不设虚构覆盖率目标；每项 P0 规则必须有明确测试用例和可复现 fixture。

## 2. Unit Tests

### 2.1 State transition tests

| Test group | Must prove |
| --- | --- |
| Package lifecycle | 预报、在途、到仓待匹配、可合箱、已加入转运、异常及合法恢复顺序。 |
| Shipment lifecycle | 草稿、提交、仓库处理、报价、付款处理中、已付款待出库、出库、运输、清关、末端、签收。 |
| Illegal transitions | 待付款不能直接出库；已付款待出库不能直接签收；非可合箱包裹不能锁定。 |
| Exception | Raise 保存 resume state；Resolve 只恢复到记录状态；用户没有 Resolve 方法。 |

### 2.2 Core service tests

| Service | Must prove |
| --- | --- |
| PackageService | 运单去重；最小商品信息；只有正确匹配才能可合箱；归属 guard。 |
| ShipmentService | 至少一件 Package；草稿不锁定；提交原子锁定；取消合规释放；已处理后不能自助取消。 |
| QuoteService | 无打包 / 无重量不可报价；金额快照正确；Quote 不可静默重写。 |
| PaymentService | 失败回待付款；同一 Shipment 不会出现两次成功；付款成功不出库。 |
| DispatchService | 缺少任何 eligibility 条件即拒绝出库；成功出库有 TrackingEvent。 |
| TrackingService | 只接受相邻阶段；签收只可从英国派送进入。 |
| AuditService | 每项关键动作至少有 actor、前后状态、时间。 |

### 2.3 Presentation / copy contract tests

- 每个 Package / Shipment 状态都返回非空中文 `title`、`explanation`、`nextAction`；
- 内部状态码不得出现在用户 DTO 的可渲染字段；
- Exception 必须有五段中文说明；
- 技术错误返回中文安全提示，不含 SQL、堆栈或内部 reason code。

## 3. Integration Tests

测试真实 SQLite Schema 与 transaction：

| Scenario | Expected result |
| --- | --- |
| 相同国内运单并发预报 | 仅一个 Package 成功写入；另一个得到重复提示。 |
| 两张草稿同时提交同一 Package | 仅一张 Shipment 获得有效关联；另一请求回滚。 |
| Shipment 提交中其中一件失效 | 不创建部分锁定；所有 Package 保持正确状态。 |
| 合规取消 | Shipment 取消、关联标记释放、Package 返回可合箱，且均有审计。 |
| Quote / Payment | Quote 生成后金额与重量冻结；付款成功不产生 `dispatched_at`。 |
| Dispatch | 满足全部门槛才写出库事件；否则事务不产生部分 TrackingEvent。 |
| Exception | 开放 Exception 阻止下一动作；解决后恢复正确状态和审计。 |
| Migration / seed | 空数据库迁移和各 scenario seed 均可重复执行。 |

## 4. API Tests

| API area | Key checks |
| --- | --- |
| Session / ownership | 无会话被拒绝；A 用户读取 B 的 Package / Shipment 返回不可用，不泄露数据。 |
| Package | 列表 filter、详情所有权、预报字段、重复运单中文错误。 |
| Draft / submit | 草稿不锁定；地址字段校验；提交 idempotency；冲突 Package 的对象级中文信息。 |
| Shipment detail | 正确返回当前中文状态、下一步、Quote、Timeline、Exception；不改变状态。 |
| Payment | 仅待付款可发起；处理中不重复；成功后为“已付款，等待仓库发出”。 |
| Mock Ops | 无密钥 / 生产禁用时拒绝；合法 command 通过 service；非法 command 不能改数据。 |
| Errors | 400 / 409 / 422 / 5xx 具有安全中文 message。 |

## 5. End-to-End Acceptance

### Happy Path

用 PRD Scenario A 的 fixture 和真实 API 走以下断言：

1. 预报 12 件 Package；
2. 受控事件将其中 10 件变为可合箱；
3. 用户选择 8 件，确认另外 2 件仅为提醒；
4. 创建草稿、填写英国地址、提交；
5. 验证唯一 reference、8 件锁定、无第二张有效 Shipment；
6. Ops 开始处理、记录重量、生成 Quote；
7. 用户读取最终重量、费用项、总价并发起模拟付款；
8. 验证成功后状态为“已付款，等待仓库发出”，没有离仓事件；
9. Ops 实际出库，再依次进入国际运输、清关、英国派送、已签收；
10. 验证用户始终能读取中文状态与下一步。

### Exception Path

1. 在待匹配 Package 上创建异常；
2. 验证其不能被选择，详情有五段中文说明；
3. 验证用户没有“标记已解决”接口；
4. Ops 解决后，Package 仅恢复到待匹配或可合箱的已记录状态；
5. 在英国派送中 Shipment 创建异常；
6. 验证阻断签收、详情优先显示影响和下一步；
7. Ops 解决后恢复英国派送中，再由签收事件完成。

## 6. Mini Program Validation

在初始计划中，以下项目用于真实 API 手动验收 7 个 P0 页面；当前 V1 实际使用 `X-Demo-User-Id` 演示请求上下文，而非 Demo Session：

- 首页按待办优先级路由；
- 包裹列表可在 10–20 件场景筛选、多选且保留滚动位置；
- 创建转运单的“移除”操作在行右侧且可发现；
- 所有用户可见文案为中文；
- 付款成功与出库状态明确区分；
- 刷新只读取事实，不推进 Mock 状态；
- Exception 不是技术错误的替代展示。

复用 UT01 的四个 usability task 作为开发后的回归清单，但不把单一样本结论外推为质量证明。

## 7. Test Data and Automation

- 单元测试使用内存 fixture；
- Integration / API tests 使用临时 SQLite 文件和每例独立迁移；
- E2E 使用固定 seed scenario 与 Mock Ops commands；
- 不依赖真实支付、物流、微信账户、真实用户资料或公网服务；
- CI 至少执行 typecheck、unit、integration、API、migration/seed smoke test。

## 8. Definition of Test Readiness

进入发布演示前，必须满足：

- [ ] 所有 Package / Shipment 合法与非法转换均有测试；
- [ ] 主路径与异常路径可重复运行；
- [ ] 关键并发、去重、锁定和出库闸门通过；
- [ ] 7 个 P0 页面以真实 API 而非 Prototype 静态数据运行；
- [ ] Mock Ops 不可被普通用户会话调用；
- [ ] 用户可见状态与错误均为中文。
