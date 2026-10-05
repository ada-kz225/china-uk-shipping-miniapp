# REST API 设计

> API 以冻结的 7 个 P0 页面与业务动作为边界。用户端没有 Ops API，用户端也不能提交内部状态码。除登录会话与 Mock Ops 外，所有接口均要求当前用户会话。

## 1. 通用约定

| Item | Decision |
| --- | --- |
| Base path | `/v1`。 |
| Format | JSON；时间使用 ISO 8601 UTC；金额与重量返回原始值和中文展示值。 |
| Auth | V1 开发期使用 Demo Session；服务端从 token 得到 current user。未来可替换为微信登录交换。 |
| Ownership | 任何 `:id` 查找均附加 `user_id = currentUser.id`；越权与不存在同样返回不可用。 |
| Idempotency | 创建 Shipment、付款请求使用 `Idempotency-Key`；预报依赖运单唯一性。 |
| Presentation | 响应可含内部 `code` 供客户端逻辑判断，但必须同时提供中文 `title`、`explanation`、`nextAction`；界面不得渲染 code。 |
| Pagination | Package / Shipment 列表使用 `limit`、`cursor`；MVP 默认按最新更新排序。 |

### Response envelope

```json
{
  "data": {},
  "meta": { "requestId": "..." }
}
```

### Error envelope

```json
{
  "error": {
    "code": "PACKAGE_NOT_ELIGIBLE",
    "message": "部分包裹状态已变化，请返回调整后再提交。",
    "fieldErrors": [
      { "field": "packageIds", "message": "该包裹正在确认归属，暂不可选。" }
    ]
  },
  "meta": { "requestId": "..." }
}
```

`message` 和 `fieldErrors.message` 必须是中文。内部 `code` 仅用于客户端分支、日志与测试，不能直接展示。

## 2. Session / Demo Environment

| Method | Path | Purpose | Request / response | Validation / error |
| --- | --- | --- | --- | --- |
| POST | `/v1/session/demo` | 仅本地开发 / 演示中获取匿名 Demo 用户会话。 | Request: `demoUserKey`；Response: 短期 session token。 | 仅允许已配置 Demo user；生产配置必须关闭。 |
| GET | `/v1/session` | 读取当前用户最小信息。 | Response: anonymous display label、会话有效期。 | 未认证返回中文会话失效提示。 |

这不是新增用户页面或登录产品能力；它只为服务端所有权校验提供开发期身份。

## 3. Home 与 Warehouse

| Method | Path | Purpose | Request | Response | Business validation / error |
| --- | --- | --- | --- | --- | --- |
| GET | `/v1/home` | 首页聚合待处理、当前转运、包裹概览与仓地址摘要。 | — | action required、current shipment、package counts、warehouse summary。 | 每个子模块可独立失败；不把技术失败变成业务异常。 |
| GET | `/v1/warehouse-address` | 返回当前用户可复制的中国仓收件信息。 | — | 收件人、个人识别信息、电话、地址、中文说明。 | 仅活动仓可返回；不可用时返回“暂时无法获取中国仓地址，请稍后重试。” |

## 4. Package

| Method | Path | Purpose | Request | Response | Business validation / possible error |
| --- | --- | --- | --- | --- | --- |
| GET | `/v1/packages?filter=&cursor=&limit=` | 包裹列表与状态筛选。 | filter: `all`、`inbound`、`pending_match`、`ready`、`in_shipment`、`needs_action`。 | 包裹卡：脱敏运单号、商品摘要、中文状态、最近事件、可选性原因、关联转运单。 | 仅返回当前用户数据；未知 filter 返回中文参数提示。 |
| POST | `/v1/packages` | 提交 Package 预报。 | domesticTrackingNumber、goodsDescription / orderProofRef、note。 | 新建 Package 详情及中文成功反馈。 | 运单唯一；说明/订单证明至少一项；重复时返回已有 Package 摘要及中文提示。 |
| GET | `/v1/packages/:id` | 包裹详情。 | — | 预报信息、中文状态、最近事件、关联 Shipment、异常区块。 | 只读；无权/不存在不泄露实体。 |
| POST | `/v1/media/order-proofs` | 可选的订单截图上传，返回受控引用。 | 图片文件。 | `orderProofRef`。 | 仅在小程序选择图片时调用；限制类型/大小；商品说明仍可单独满足最小预报。 |

Package DTO 中的 `displayStatus` 结构：

```json
{
  "code": "READY_FOR_SHIPMENT",
  "title": "可合箱",
  "explanation": "包裹已确认归属，可以选择加入本次转运单。",
  "nextAction": "可选择加入本次转运单，也可以继续等待其他包裹。"
}
```

## 5. Shipment

| Method | Path | Purpose | Request | Response | Business validation / possible error |
| --- | --- | --- | --- | --- | --- |
| POST | `/v1/shipments/drafts` | 根据已选 Package 创建 / 恢复未提交草稿。 | packageIds。 | Draft ID、候选包裹、未选择可合箱数量、地址完成度。 | 包裹必须属于当前用户；草稿不锁定。 |
| PATCH | `/v1/shipments/:id/draft` | 编辑草稿中的包裹与一次性英国地址。 | packageIds、address。 | 更新后的草稿摘要。 | 仅 `DRAFT` 且属于当前用户；提交前仍会复校验。 |
| POST | `/v1/shipments/:id/submit` | 提交草稿并锁定 Package。 | Header: Idempotency-Key。 | Shipment 详情，含转运单号和中文状态。 | 地址完整；至少 1 件；所有 Package 仍可合箱；冲突时整笔回滚。 |
| GET | `/v1/shipments?scope=&cursor=&limit=` | 转运单列表。 | scope: `active` / `history`。 | 状态、下一步、最近更新、包裹数。 | 只返回 current user；待处理 / 待付款优先排序。 |
| GET | `/v1/shipments/:id` | 转运单唯一事实中心。 | — | 当前中文状态、下一步、包裹、地址、Quote、Payment 摘要、Timeline、Exception。 | 无权/不存在不泄露；读取不改变状态。 |
| POST | `/v1/shipments/:id/cancel` | 在允许窗口取消草稿或已提交转运单。 | Header: Idempotency-Key。 | 取消后的转运单和 Package 释放摘要。 | 仅 DRAFT / SUBMITTED / AWAITING_PAYMENT，且未开始仓库处理或出库。 |

没有用户端“直接改 Package 状态”“直接生成报价”“直接标记出库”的接口。

## 6. Quote / Payment / Tracking / Exception

Quote、付款、运输和异常不增加独立用户页面，因此优先随 `GET /v1/shipments/:id` 返回。只保留需要用户主动触发的付款动作：

| Method | Path | Purpose | Request | Response | Business validation / possible error |
| --- | --- | --- | --- | --- | --- |
| POST | `/v1/shipments/:id/payments` | 用户发起模拟付款。 | Header: Idempotency-Key。 | Payment 摘要和当前 Shipment DTO。 | 仅待付款、Quote 存在、无阻塞问题；请求中不允许指定成功 / 失败结果。 |
| GET | `/v1/shipments/:id` | 读取 Quote、付款结果、时间线和异常。 | — | 统一详情 DTO。 | 刷新只读，不推进 Mock 事件。 |

Payment adapter 可以异步返回结果；用户端收到 `PAYMENT_PROCESSING` 后轮询详情或在回到前台时刷新。成功时只显示“已付款，等待仓库发出”，绝不自动显示已出库。

## 7. Mock Ops Command API

| Method | Path | Purpose | Request | Response | Validation |
| --- | --- | --- | --- | --- | --- |
| POST | `/internal/mock-ops/commands` | 本地 / Demo 推进一个模拟事实事件。 | `command`、`entityType`、`entityId`、`payload`、`idempotencyKey`。 | 更新后的内部结果和审计 ID。 | 需要 `X-Demo-Ops-Key`；仅非生产环境；调用 Service，不可直写数据表。 |

允许的 `command` 白名单：`MARK_INBOUND`、`RECEIVE_PACKAGE`、`MATCH_SUCCEEDED`、`START_WAREHOUSE_PROCESSING`、`RECORD_WEIGHT`、`GENERATE_QUOTE`、`PAYMENT_SUCCEEDED`、`PAYMENT_FAILED`、`DISPATCH_SHIPMENT`、`ENTER_INTERNATIONAL_TRANSIT`、`ENTER_CUSTOMS_CLEARANCE`、`ENTER_UK_LAST_MILE`、`MARK_DELIVERED`、`RAISE_EXCEPTION`、`RESOLVE_EXCEPTION`。

该接口不由小程序 UI 调用，也不在发布环境暴露。

## 8. Status and Error Mapping Rules

- Route 从领域服务返回内部 result / error；
- Presentation mapper 生成中文 `message`、状态标题、解释和下一步；
- 业务校验错误使用 4xx，技术失败使用 5xx，但用户界面统一显示安全的中文提示；
- 支付、Shipment 提交使用 idempotency key；服务端为同一 key 返回先前结果；
- 时间线和异常中每条用户可见说明必须为中文，不能回显内部 reason code、数据库错误或外部原始响应。

## 9. API Coverage Check

| P0 页面 / 任务 | API support |
| --- | --- |
| 首页 / 复制仓地址 | `GET /home`、`GET /warehouse-address` |
| 包裹列表、筛选、详情 | `GET /packages`、`GET /packages/:id` |
| 预报 | `POST /packages`，可选 `POST /media/order-proofs` |
| 多选与创建转运单 | Draft create / update / submit API |
| 转运列表、详情 | `GET /shipments`、`GET /shipments/:id` |
| 报价、模拟付款、物流、异常 | Shipment Detail DTO + `POST /payments` |
| Mock 业务推进 | 非用户 API 的受保护 Mock Ops Command |

每个 endpoint 都有页面任务或业务流程承接；没有为形式完整性而添加无使用者的资源接口。

