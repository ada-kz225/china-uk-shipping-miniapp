# MVP 安全与数据校验

> V1 是 Portfolio MVP，不设计企业级风控或完整权限体系；但必须保护用户归属、避免重复履约，并保证状态与 Mock 事件不能被客户端伪造。

> **Current V1 implementation note**：演示身份来自 `X-Demo-User-Id` 请求头，而非 Demo Session token；Mock Ops 路径为 `/internal/mock/packages/*` 和 `/internal/mock/shipments/*`，而非 `/internal/mock-ops/*`。当前已实现的输入边界为 Package 的 `domesticTrackingNumber` + `description`、Shipment 的 `packageIds` / 英国地址，以及 Mock Ops 的重量、报价或付款结果输入。订单截图、`orderProofRef`、分页 cursor、Shipment submit idempotency 与完整 optimistic-lock protocol 均为 **Initial / Proposed Design**，未作为当前 V1 实现。

## 1. Access Boundary

| Control | MVP implementation | Why it matters |
| --- | --- | --- |
| Current user | `X-Demo-User-Id` 请求头解析为服务端 `currentUser`；请求 body 不接受可信 `userId`。 | 防止客户端切换他人身份。 |
| Package ownership | 所有 Package 查询、详情、草稿与提交校验 `package.user_id = currentUser.id`。 | 用户不能看到、选择或锁定他人的包裹。 |
| Shipment ownership | 所有 Shipment 列表、详情、付款、取消附加 `shipment.user_id = currentUser.id`。 | 用户不能读取或操作他人的转运单。 |
| Address ownership | Address 只能经所属 Shipment 读取或更新。 | 防止单独枚举他人地址。 |
| Not-found response | 越权与不存在都返回相同的中文不可用提示。 | 不泄露实体是否存在。 |
| Mock Ops separation | `/internal/mock/packages/*` 与 `/internal/mock/shipments/*` 需要独立密钥，且仅非生产环境注册。 | 用户端不可推进仓库、付款或物流状态。 |

未来微信登录只替换 Session adapter；领域服务的 ownership guard 不应变化。

## 2. Input Validation

| Input | Required validation | User-facing failure |
| --- | --- | --- |
| 国内运单号 | trim、非空、长度上限、允许字符白名单、标准化后唯一。 | 请填写有效的国内运单号。 / 该运单号已预报，无需重复提交。 |
| 商品描述 | `description` 必填、trim 后长度上限为 200。 | 请填写商品描述。 |
| 订单图片 | **Initial / Proposed**：当前 V1 未实现上传或 `orderProofRef`。 | 不适用。 |
| 英国地址 | 收件人、联系电话、邮编、详细地址均非空；设置合理长度上限。 | 请完整填写英国收货地址。 |
| Package IDs | 非空、去重、数量上限与 UUID 格式；服务端复核拥有者和状态。 | 部分包裹状态已变化，请返回调整后再提交。 |
| 金额 / 重量 | 仅 Mock Ops 可提交；整数、非负费用、正重量、总额一致。 | 用户端不展示 Ops 输入错误；记录安全日志。 |
| 分页 / 筛选 | `limit` 设上限；filter 使用白名单。 | 参数无效，请刷新后重试。 |
| Idempotency key | 必填、格式和长度受限；同 actor + action + key 唯一。 | 正在处理中，请勿重复操作。 |

小程序不能提交 `status`、`reference`、`dispatched_at`、`resume_state`、`payment result` 等服务端事实字段。

## 3. Business Validation Gates

| Gate | Server-side enforcement |
| --- | --- |
| Duplicate tracking number | Schema UNIQUE + `declarePackage` 预检；重复请求返回既有 Package 摘要，不创建第二条。 |
| Package eligibility | 仅 `READY_FOR_SHIPMENT`、当前用户拥有、无开放阻塞 Exception、没有有效 ShipmentPackage 关联。 |
| Package lock | Shipment 提交事务中创建关联；部分唯一索引作为最后防线。 |
| Duplicate Shipment submit | 当前 `submitShipment` 对已提交 Shipment 返回当前详情；提交过程以事务与 Package 关联唯一索引防止重复锁定。`Idempotency-Key` submit contract 为 Initial / Proposed。 |
| Quote snapshot | 仅打包和重量完成后生成一次；付款后禁止静默改价。 |
| Payment gate | 只接受 `AWAITING_PAYMENT`；同一 Shipment 只能有一次成功 Payment。 |
| Dispatch gate | 付款成功、Quote、打包、重量、无阻塞 Exception 与实际离仓事实缺一不可。 |
| Tracking gate | 只接受相邻履约阶段；不允许在出库前创建运输事件。 |
| Exception gate | 开放的阻塞 Exception 阻止相关正常状态转换；仅 Ops 可解决。 |

## 4. Concurrency and Replay Safety

| Risk | Mitigation |
| --- | --- |
| 两次快速提交转运单 | 按 `Idempotency-Key` 返回同一结果；以 `shipment.version` 和事务复核全部 Package。 |
| 两张草稿同时选择同一 Package | 草稿不锁定；提交时由部分唯一索引决定唯一成功者，另一方收到中文状态变化提示。 |
| 付款按钮重复点击 | 第一次请求创建 `PAYMENT_PROCESSING`；同 key 返回同一 Payment，其他请求被拒绝。 |
| Ops 重放事件 | **Initial / Proposed**：当前单事件 Mock Ops routes 未实现统一 command idempotency key。 |
| 旧页面覆盖新状态 | 写操作包含 version；冲突后客户端读取最新详情。 |

## 5. Data Handling

- Seed、截图样本、地址和手机号不得使用真实个人数据；
- 日志只记录必要实体 ID、错误码和 request ID；对运单号、地址、手机号作脱敏；
- API 不回传完整 AuditLog、其他用户信息或 Mock Ops 密钥；
- 使用 HTTPS 部署；本地开发 token、数据库和上传目录不提交至 Git；
- 不实现支付凭证、银行卡资料、护照信息或清关申报资料处理。

## 6. Out of Scope Security

V1 不实现企业级 RBAC、真实微信身份验证、支付签名验签、WAF、风控、合规留存、客服工单权限或多仓操作权限。它们不能被误写为已具备的真实业务能力。

## 7. Security Acceptance Checks

- [ ] 不能通过修改请求中的 ID 读取另一个 Demo 用户的 Package 或 Shipment；
- [ ] 重复国内运单不会新增第二件 Package；
- [ ] 两次提交不能把同一 Package 锁入两个有效 Shipment；
- [ ] 已付款但未出库的 Shipment 不能被任何用户接口推进为已从仓库发出；
- [ ] 用户接口无法创建 / 解决 Exception 或修改内部状态；
- [ ] Mock Ops endpoint 在生产配置中不注册；
- [ ] 后端原始错误、SQL、栈追踪和英文内部状态码不会进入用户界面。
