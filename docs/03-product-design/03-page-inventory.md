# 页面清单

> 页面由已冻结的 JTBD、核心用户流与实体状态推导，不反向以功能清单制造页面。Quote / Payment、Timeline、地址与 Exception 均优先保留在关联 Shipment 的上下文中。

| ID | Page | User Goal | Entry | Core Information | Primary Action | Entity | Priority |
| --- | --- | --- | --- | --- | --- | --- | --- |
| H01 | Home | 判断当前最需要处理的事，并快速进入正确任务 | TabBar；小程序启动 | Action Required、Current Journey、Package Overview、Warehouse Information | 处理待办；进入包裹/Shipment；复制仓库地址 | Cross-entity | P0 |
| P01 | Package List | 盘点哪些 Package 未到、已到、可合箱、异常或已加入 Shipment | `包裹` Tab；首页概览 | 状态、简要识别信息、最近更新、可选性、异常/关联 Shipment | 新增预报；筛选；多选可用 Package | Package | P0 |
| P02 | Package Detail | 理解一件 Package 的归属、状态、到仓信息及下一步 | Package List；首页待办 | 当前状态与说明、预报信息、到仓/归属事件、相关凭据、异常 | 查看异常；进入关联 Shipment；按异常指引更正必要信息 | Package | P0 |
| P03 | Declare Package | 建立可被 Warehouse 匹配的 Package 预报 | Package List；空状态；Home | 国内运单号、最小商品证明/信息、预报说明 | 提交预报 | Package | P0 |
| S01 | Shipment List | 查看所有正在处理、待付款、在途和历史 Shipment | `转运` Tab；首页 Current Journey | 稳定 Reference、当前状态、是否需要操作、最近事件、包含件数 | 查看 Shipment；继续草稿（如有） | Shipment | P0 |
| S02 | Shipment Creation | 将多个可用 Package 组成一次明确 Shipment 并提交 | Package List 选择模式 | 已选 Package、不可选原因、服务偏好（P1）、本次英国地址、提交确认 | 提交 Shipment 并生成 Reference | Shipment + Package + Address | P0 |
| S03 | Shipment Detail | 知道“这次转运现在到底怎么样”、该做什么和接下来发生什么 | Shipment List；Home 待办；创建成功 | Current Status、Next Action、Quote / Payment、Included Packages、Timeline、Address、Exception | 支付；查看 Package；遵循异常指引 | Shipment | P0 |
| M01 | Profile / Settings | 管理非阻塞性个人偏好与获取帮助 | Home 二级入口 | 基础身份展示、地址簿、通知偏好、支持入口 | 管理地址/偏好；进入支持 | User + Address | P1 |

## 有意合并而非新增的页面

| 候选独立页面 | V1 处理方式 | 合并原因 |
| --- | --- | --- |
| Quote / Payment | `Shipment Detail` 的条件区块 | Quote、Payment 和 Dispatch 只对同一个 Shipment 有意义。 |
| Tracking | `Shipment Detail` 的 Fulfillment Timeline | 用户不应在“订单”和“物流”之间寻找同一 Shipment。 |
| Address | `Shipment Creation` 内联填写；`Profile / Settings` 中提供 P1 地址簿 | 首次闭环只需本次地址，不需要独立 P0 地址管理页面。 |
| Exception Detail | Package / Shipment Detail 的上下文区块 | 异常必须说明它影响哪个实体和哪个阶段。 |
| Warehouse Address | Home 的新用户 / 无 Package 区块 | 获取地址是一次启动任务，不需要独立页面。 |

## Total MVP Pages

**8 个页面：7 个 P0 页面 + 1 个 P1 的 Profile / Settings 页面。**

这个数量的理由：

- P0 中每个输入、列表和实体详情都承担不可替代的主任务；
- 通过将 Quote、Payment、Tracking、Exception 与 Address 合并到正确实体上下文，避免额外 4–5 个跳转页面；
- `Profile / Settings` 只承接 P1，不影响首次闭环；若只实现严格 P0，体验可收敛为 **7 个页面**；
- 不存在营销、会员、客服、仓库运营等 MVP 外页面。
