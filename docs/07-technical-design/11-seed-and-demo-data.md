# Seed 与 Demo 数据设计

> Demo 数据用于复现 Prototype、PRD Scenario A/B 和开发测试；不代表真实仓库、真实价格、真实物流或真实客户数据。

> **Current V1 implementation note**：`npm run db:reset` 后运行 `npm run db:seed` 会写入一组固定 Demo 数据：1 个演示用户、1 个中国仓、**19 件 Package**（1 件已预报、1 件待确认、10 件可合箱、6 件已加入转运、1 件异常）、**6 个 Shipment**（仓库处理中、待付款、已付款待出库、国际运输中、已签收、异常），以及相应的地址、Quote、Payment、Tracking Event、Exception 和 Audit Log。当前脚本不接受 scenario 参数；实现位置为 `server/src/db/seed.ts`。

> 下文的多 scenario、15 件 Package、以及“Seed 只经 Event / Service 工厂写入”的描述是 **Initial / Proposed Design**，保留用于说明设计意图，不是当前 Seed 实现的事实。

## 1. Seed principles（Initial / Proposed）

- 使用匿名 Demo 用户、虚构地址、虚构运单和模拟金额；
- 每条记录的状态必须能由定义的状态机合法产生；
- 每个 Shipment 必须至少关联一件 Package；
- 不通过直接写最终状态绕过服务规则：Seed 可使用受控的领域事件工厂 / Mock Ops command；
- 每次执行可重置为固定场景，便于复测与截图演示。

## 2. Demo scenarios（Initial / Proposed）

| Scenario | Purpose | Data boundary |
| --- | --- | --- |
| `primary-journey` | 复现 12 件预报、10 件可合箱、选择 8 件、创建与推进 Shipment 的主路径。 | 一个匿名 Demo 用户，15 件当前待管理 Package。 |
| `shipment-gallery` | 让转运列表 / 详情展示不同履约阶段。 | 独立匿名 Demo 用户，防止干扰主路径的 10 件可合箱。 |
| `exception-path` | 演示 Package 归属异常和 Shipment 末端异常。 | 独立匿名 Demo 用户或独立数据集。 |

Demo 用户的切换仅用于本地开发会话，不是用户端功能。

## 3. Primary Journey Package Set（Initial / Proposed）

该场景恰好包含 15 件 Package，覆盖 10–20 件盘点的重点交互：

| 状态 | 数量 | 用途 |
| --- | ---: | --- |
| 正在送往仓库 | 1 | 验证“待到仓”与不可选原因。 |
| 已到仓，正在确认归属 | 2 | 验证到仓不等于可合箱。 |
| 可合箱 | 10 | 供用户选择其中 8 件，并明确提示剩余 2 件。 |
| 已加入本次转运 | 1 | 关联一个进行中的 Shipment，验证不可重复选择。 |
| 需要处理 | 1 | Package 异常路径，验证异常五段信息。 |

每件记录只含模拟商品摘要、脱敏模拟运单号、状态和最小事件。Demo 金额、时间和地址均为虚构。

## 4. Shipment Gallery（Initial / Proposed）

使用独立 Scenario 用户建立如下 Shipment，确保每张均有独立关联 Package：

| Shipment state | Purpose |
| --- | --- |
| 仓库正在处理 | 展示处理阶段与尚未有报价。 |
| 最终报价已生成，请确认并付款 | 展示 Quote Snapshot 与模拟付款入口。 |
| 已付款，等待仓库发出 | 验证付款不等于出库。 |
| 国际运输中 | 展示连续时间线中的在途状态。 |
| 已签收 | 展示历史记录与完整时间线。 |
| 需要处理 | 展示英国末端异常结构与恢复目标。 |

状态展示用中文；数据库保留对应内部 code。Quote 金额应标注为模拟示例，不声明真实计费规则。

## 5. Seed Procedure（Initial / Proposed）

推荐脚本：

| Command | Purpose |
| --- | --- |
| `npm run db:migrate` | 创建 Schema 与索引。 |
| `npm run db:seed -- --scenario=primary-journey` | 重置并生成主路径数据。 |
| `npm run db:seed -- --scenario=shipment-gallery` | 生成状态展示数据。 |
| `npm run db:seed -- --scenario=exception-path` | 生成异常场景数据。 |
| `npm run db:reset` | 仅本地删除 Demo 数据后重新迁移。 |

脚本执行中通过同一 Event / Service 工厂建立状态、TrackingEvent、Exception 与 AuditLog；迁移脚本负责表结构，Seed 不直接伪造不可达状态。

## 6. Acceptance Scenario Fixture（Initial / Proposed）

PRD 的主验收路径应可用同一 fixture 复现：

1. 用户预报 12 件 Package；
2. 受控事件推进 10 件至“可合箱”，其余 2 件保留在待到仓 / 待确认；
3. 用户选择 8 件，并看到还有 2 件可合箱未选择；
4. 提交转运单，验证 8 件 Package 锁定；
5. Ops 依次执行开始处理、记录重量、生成 Quote；
6. 用户发起模拟付款，Mock adapter 返回成功；
7. Ops 记录出库；
8. Ops 依次生成国际运输、清关、英国派送、签收事件。

异常 fixture 至少验证：创建异常会阻断下一步，用户不能自行解决，Ops Resolve 后只恢复至预先记录的正常状态。

## 7. Data Hygiene（Initial / Proposed）

- 所有手机号、地址、订单截图、运单号、参考号、金额与时间均为示例；
- 不向公开仓库提交本地数据库文件、用户上传文件或 token；
- 在 README 中说明哪些数据为 Mock，避免观者误认为系统连接真实物流或支付服务。
