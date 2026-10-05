# 数据库 Schema 设计

> 物理表采用 snake_case。金额使用最小货币单位整数，重量使用克整数；所有时间以 UTC 存储，由小程序按中文界面格式展示。`version` 用于关键写操作的乐观并发保护。

## 1. 通用约定

| 项目 | 约定 |
| --- | --- |
| 主键 | `TEXT` UUID / UUIDv7，由服务端生成。 |
| 时间 | `created_at`、`updated_at` 为 UTC ISO 时间；不可由客户端指定。 |
| 金额 | `*_minor` 为整数；显示前按 `currency` 格式化。演示金额必须标识为模拟。 |
| 重量 | `*_g` 为正整数；用户显示单位由展示层统一处理。 |
| 枚举 | `status`、`state`、`source` 由服务端白名单校验；数据库用 `TEXT + CHECK`。 |
| 并发 | `packages.version` 与 `shipments.version` 在更新时比对；写成功递增。 |
| 删除 | 核心履约实体不物理删除；草稿可取消，关联以 `released_at` 保留历史。 |

## 2. Tables

### `users`（User）

| Field | Type | Required | Meaning / constraint |
| --- | --- | --- | --- |
| id | TEXT PK | 是 | 内部用户 ID。 |
| external_subject | TEXT | 是 | Demo / 未来微信身份的稳定 subject，UNIQUE。 |
| warehouse_recipient_code | TEXT | 是 | 用于拼接个人中国仓收件信息；不在日志中完整暴露。 |
| display_name | TEXT | 否 | 最小展示名；不存真实姓名作为示例数据。 |
| created_at / updated_at | TEXT | 是 | 服务端时间。 |

### `warehouses`

| Field | Type | Required | Meaning / constraint |
| --- | --- | --- | --- |
| id | TEXT PK | 是 | 仓库 ID。 |
| name | TEXT | 是 | 仓库中文名称。 |
| recipient_name | TEXT | 是 | 公共收件人字段。 |
| phone | TEXT | 是 | 仓库联系电话。 |
| address_line | TEXT | 是 | 中国仓完整地址。 |
| instructions | TEXT | 否 | 中文填写说明。 |
| is_active | INTEGER | 是 | 仅活动仓可返回地址。 |
| created_at / updated_at | TEXT | 是 | 服务端时间。 |

### `packages`

| Field | Type | Required | Meaning / constraint |
| --- | --- | --- | --- |
| id | TEXT PK | 是 | Package ID。 |
| user_id | TEXT FK | 是 | 指向 `users.id`。 |
| warehouse_id | TEXT FK | 是 | 目标中国仓。 |
| domestic_tracking_number | TEXT | 是 | 国内运单号，UNIQUE；服务端 trim / 标准化后写入。 |
| goods_description | TEXT | 否 | 最小商品说明。 |
| order_proof_ref | TEXT | 否 | 订单截图的受控文件引用；与说明至少其一存在。 |
| note | TEXT | 否 | 用户备注。 |
| status | TEXT | 是 | Package 内部状态。 |
| status_updated_at | TEXT | 是 | 最近状态变更时间。 |
| version | INTEGER | 是 | 默认 1；乐观锁。 |
| created_at / updated_at | TEXT | 是 | 服务端时间。 |

约束：`CHECK(goods_description IS NOT NULL OR order_proof_ref IS NOT NULL)`；`UNIQUE(domestic_tracking_number)`；`status` 必须为已定义 Package State。

### `shipments`

| Field | Type | Required | Meaning / constraint |
| --- | --- | --- | --- |
| id | TEXT PK | 是 | Shipment ID。 |
| user_id / warehouse_id | TEXT FK | 是 | 所属用户与处理仓。 |
| reference | TEXT | 否 | 成功提交后生成，UNIQUE；草稿阶段为空。 |
| status | TEXT | 是 | Shipment 内部状态。 |
| packing_completed_at | TEXT | 否 | Mock Ops 记录打包完成事实。 |
| final_chargeable_weight_g | INTEGER | 否 | 最终计费重量；生成 Quote 前必须为正数。 |
| dispatched_at | TEXT | 否 | 实际离仓事实，不等于付款时间。 |
| version | INTEGER | 是 | 默认 1；乐观锁。 |
| created_at / updated_at | TEXT | 是 | 服务端时间。 |

约束：`UNIQUE(reference)`；已提交或后续状态必须有 reference；重量如存在必须大于 0。

### `shipment_packages`

| Field | Type | Required | Meaning / constraint |
| --- | --- | --- | --- |
| id | TEXT PK | 是 | 关联记录 ID。 |
| shipment_id / package_id | TEXT FK | 是 | Shipment 与 Package。 |
| locked_at | TEXT | 是 | 提交时写入。 |
| released_at | TEXT | 否 | 合规取消时写入。 |
| release_reason | TEXT | 否 | 仅取消/释放的内部原因。 |
| created_at | TEXT | 是 | 服务端时间。 |

约束：`UNIQUE(shipment_id, package_id)`；部分唯一索引 `UNIQUE(package_id) WHERE released_at IS NULL`，从数据库层防止 Package 同时属于两个有效 Shipment。

### `addresses`

| Field | Type | Required | Meaning / constraint |
| --- | --- | --- | --- |
| id | TEXT PK | 是 | 地址 ID。 |
| user_id / shipment_id | TEXT FK | 是 | 所属用户和 Shipment。 |
| recipient_name | TEXT | 是 | 英国收件人。 |
| phone | TEXT | 是 | 联系电话。 |
| postcode | TEXT | 是 | 邮编。 |
| address_line | TEXT | 是 | 详细地址。 |
| created_at / updated_at | TEXT | 是 | 服务端时间。 |

约束：`UNIQUE(shipment_id)`。它是本次 Shipment 快照，不做 P1 地址簿。

### `quotes`

| Field | Type | Required | Meaning / constraint |
| --- | --- | --- | --- |
| id | TEXT PK | 是 | Quote ID。 |
| shipment_id | TEXT FK | 是 | 对应 Shipment，UNIQUE。 |
| version | INTEGER | 是 | V1 固定为 1，保留快照来源信息。 |
| chargeable_weight_g | INTEGER | 是 | 付款时展示的最终计费重量。 |
| shipping_fee_minor | INTEGER | 是 | 模拟运费。 |
| handling_fee_minor | INTEGER | 是 | 模拟打包/必要处理费。 |
| total_amount_minor | INTEGER | 是 | 两项费用之和。 |
| currency | TEXT | 是 | ISO 货币代码；演示值不代表真实政策。 |
| source | TEXT | 是 | 初始为 `MOCK_OPS`。 |
| generated_at | TEXT | 是 | 快照生成时间。 |
| created_at | TEXT | 是 | 服务端时间。 |

约束：重量大于 0；费用非负；`total_amount_minor = shipping_fee_minor + handling_fee_minor` 由服务端校验；创建后不可 UPDATE 金额或重量。

### `payments`

| Field | Type | Required | Meaning / constraint |
| --- | --- | --- | --- |
| id | TEXT PK | 是 | Payment Attempt ID。 |
| shipment_id / quote_id | TEXT FK | 是 | 对应 Shipment 与 Quote。 |
| status | TEXT | 是 | `PROCESSING`、`SUCCEEDED`、`FAILED`、`UNKNOWN`。 |
| amount_minor / currency | INTEGER / TEXT | 是 | 从 Quote 复制，防止展示漂移。 |
| provider | TEXT | 是 | V1 为 `MOCK_PAYMENT`。 |
| provider_reference | TEXT | 否 | 模拟结果引用。 |
| idempotency_key | TEXT | 是 | 对同一付款请求去重，UNIQUE。 |
| requested_at / resolved_at | TEXT | 是 / 否 | 发起与结果确认时间。 |
| failure_reason_code | TEXT | 否 | 内部失败原因，不能直接展示。 |
| created_at | TEXT | 是 | 服务端时间。 |

约束：一个 Shipment 只能有一条 `SUCCEEDED` Payment（部分唯一索引）；成功后不允许再创建成功支付。

### `tracking_events`

| Field | Type | Required | Meaning / constraint |
| --- | --- | --- | --- |
| id | TEXT PK | 是 | 事件 ID。 |
| shipment_id | TEXT FK | 是 | 关联 Shipment。 |
| stage | TEXT | 是 | `DISPATCHED` 至 `DELIVERED` 的合法履约阶段。 |
| source | TEXT | 是 | V1 为 `MOCK_OPS`。 |
| user_title | TEXT | 是 | 中文 Timeline 标题。 |
| user_description | TEXT | 否 | 中文说明；不写未验证承运商事实。 |
| occurred_at | TEXT | 是 | 业务事件时间。 |
| created_at | TEXT | 是 | 记录时间。 |

约束：同一 Shipment 的阶段顺序由 TrackingService 校验；按 `occurred_at, created_at` 排序。

### `exceptions`

| Field | Type | Required | Meaning / constraint |
| --- | --- | --- | --- |
| id | TEXT PK | 是 | Exception ID。 |
| package_id | TEXT FK | 否 | Package 异常目标。 |
| shipment_id | TEXT FK | 否 | Shipment 异常目标。 |
| status | TEXT | 是 | `OPEN` 或 `RESOLVED`。 |
| is_blocking | INTEGER | 是 | 是否阻止下一状态。 |
| resume_state | TEXT | 是 | 解决后恢复的内部状态。 |
| user_title | TEXT | 是 | 中文问题标题。 |
| user_what_happened | TEXT | 是 | 中文“发生什么”。 |
| user_impact | TEXT | 是 | 中文“影响什么”。 |
| user_next_action | TEXT | 是 | 中文“你需要做什么”。 |
| user_progress | TEXT | 是 | 中文“当前进展”。 |
| user_support | TEXT | 是 | 中文支持指引。 |
| reason_code | TEXT | 否 | 内部原因代码。 |
| raised_at / resolved_at | TEXT | 是 / 否 | 生命周期时间。 |
| created_at / updated_at | TEXT | 是 | 服务端时间。 |

约束：`CHECK((package_id IS NOT NULL) != (shipment_id IS NOT NULL))`；同一实体同一时刻只允许一个阻塞 `OPEN` Exception，由服务端与部分唯一索引共同保证。

### `audit_logs`

| Field | Type | Required | Meaning / constraint |
| --- | --- | --- | --- |
| id | TEXT PK | 是 | 审计 ID。 |
| entity_type / entity_id | TEXT | 是 | 被记录的实体。 |
| action | TEXT | 是 | 内部业务动作。 |
| actor_type / actor_id | TEXT | 是 | `USER`、`MOCK_OPS`、`SYSTEM` 等及其标识。 |
| previous_state / next_state | TEXT | 否 | 状态转换前后值。 |
| before_data / after_data | TEXT | 否 | 最小 JSON 快照；不存敏感全文。 |
| reason | TEXT | 否 | 变更原因。 |
| request_id | TEXT | 否 | 关联 API 请求。 |
| created_at | TEXT | 是 | 只追加时间。 |

## 3. 必要索引与并发

| Index / mechanism | Purpose |
| --- | --- |
| `packages(domestic_tracking_number)` UNIQUE | 阻止重复预报。 |
| `shipments(reference)` UNIQUE | 生成稳定且唯一的转运单号。 |
| `shipment_package(package_id) WHERE released_at IS NULL` UNIQUE | 阻止一个 Package 同时锁入多个有效 Shipment。 |
| `packages(user_id, status, updated_at)` | 支撑包裹筛选和列表。 |
| `shipments(user_id, status, updated_at)` | 支撑进行中优先的转运列表。 |
| `tracking_events(shipment_id, occurred_at)` | 支撑详情时间线。 |
| `exceptions(package_id/shipment_id, status)` | 支撑阻塞校验与异常区块。 |
| `UPDATE ... WHERE id = ? AND version = ?` | 防止并发提交、取消或 Ops 事件覆盖。 |

提交 Shipment、生成 Quote、确认支付、出库、创建/解决异常必须在单个数据库事务中更新事实、状态、关联与 AuditLog。SQLite 写入事务使用立即锁定策略；冲突时 API 返回可理解的中文提示，而不是静默覆盖。
