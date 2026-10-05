# V1 核心业务闭环

> 本流程定义用户端需要理解的最小闭环。P01 支持其中的多 Package、合箱、称重报价和付款后离仓查询行为；仓库动作、支付、运输、清关和英国末端事件的真实接入方式仍是 Product Assumption。作品集 MVP 中这些外部事件应明确以模拟数据表达。

## 核心闭环

```text
Warehouse Information
→ Package Declaration
→ Package Arrival & Confirmation
→ Consolidation
→ Shipment Submission
→ Warehouse Processing
→ Quote
→ Payment
→ Dispatch
→ International Transit
→ UK Delivery
→ Delivered
```

## 分阶段流程

| Stage | User Goal | User Action | System Action | Business Action | Output |
| --- | --- | --- | --- | --- | --- |
| 1. Warehouse Information | 获得可用于国内购物的收件信息 | 查看并复制中国仓地址及专属识别信息 | 展示 Warehouse 地址、填写说明与预报提示 | Warehouse 维护真实地址与识别规则 **[Product Assumption]** | 可用的仓库收件信息 |
| 2. Package Declaration | 让待到仓的 Package 可被识别 | 提交最小预报信息：运单号、商品信息/截图 | 创建 Package 记录，状态为 `DECLARED` | 仓库按真实规则使用预报匹配 Package **[Product Assumption]** | 已预报 Package |
| 3. Package Arrival | 知道国内包裹是否到达 Warehouse | 查看到仓进度；必要时补充信息 | 记录到仓事件，区分“已到仓待匹配”与“可合箱” | 仓库实际收货、核对归属与可处理性 **[Simulated in V1]** | `ARRIVED_PENDING_MATCH` 或 `READY_FOR_SHIPMENT` Package |
| 4. Package Confirmation | 盘点本次可寄的物品是否齐全 | 查看 Package 列表、到仓/归属状态与不可用原因 | 汇总可选择和仍等待的 Package | 无额外人工动作；有异常时由仓库标记原因 **[Product Assumption]** | 用户可判断是否开始合箱 |
| 5. Consolidation | 决定本次要寄哪些 Package | 选择一个或多个可用 Package；可表达服务偏好 | 创建 Shipment 草稿，不锁定 Package 的最终归属 | 真实服务可用项、限制与费用由仓库定义 **[Product Assumption]** | `DRAFT` Shipment |
| 6. Shipment Submission | 将选择转成一次明确转运请求 | 填写英国地址，确认 Package 和偏好，提交 Shipment | 固化选择，Shipment 进入 `SUBMITTED`；Package 进入 `IN_SHIPMENT` | 仓库接收处理请求 **[Simulated in V1]** | 已提交的 Shipment |
| 7. Warehouse Processing | 知道仓库正在处理什么 | 查看处理状态和可修改边界 | Shipment 进入 `WAREHOUSE_PROCESSING`；必要时显示 Exception | 仓库验货、打包、称重、检查限制 **[Simulated in V1]** | 等待最终重量与 Quote |
| 8. Quote | 在付款前核对费用事实 | 查看最终重量、费用项和总价 | 生成一个最终 Quote，Shipment 进入 `AWAITING_PAYMENT` | 仓库按实际计费规则产生报价 **[Simulated in V1]** | 可支付的 Quote |
| 9. Payment | 表达接受报价并完成支付 | 发起付款，查看付款结果 | 记录支付结果；成功后 Shipment 进入 `PAID_AWAITING_DISPATCH` | 支付渠道确认结果 **[Simulated in V1]** | 已支付但尚未离仓的 Shipment |
| 10. Dispatch | 确认 Shipment 已实际离仓 | 自助查看是否离仓及最近事件 | 收到离仓事件后进入 `DISPATCHED` | Warehouse 实际出库、交接机场/承运商 **[Simulated in V1]** | 已离仓 Shipment |
| 11. International Transit | 了解国际段所处阶段 | 查看最新事件与预计信息（如有） | 记录阶段事件，状态为 `INTERNATIONAL_TRANSIT` | 航空/干线承运商提供事件 **[Simulated in V1]** | 国际运输中 Shipment |
| 12. UK Delivery | 了解清关与英国末端派送情况 | 查看清关、英国派送和异常指引 | 依次显示 `CUSTOMS_CLEARANCE`、`UK_LAST_MILE`；异常时显示影响和下一步 | 清关方、英国末端承运商更新事件 **[Simulated in V1]** | 待签收的 Shipment 或 Exception |
| 13. Delivered | 确认本次履约完成 | 查看签收事实与最终 Shipment 状态 | 记录签收事件，Shipment 进入 `DELIVERED` | 末端承运商确认签收 **[Simulated in V1]** | 已签收 Shipment |

## 人工断点与 V1 的处理

P01 的主要断点不是“完全没有流程”，而是常规信息需经微信客服获得。V1 的处理原则是：

| 当前断点 | V1 的最小承接 | 不承诺的能力 |
| --- | --- | --- |
| 到仓后需问客服是否归属自己 | Package 到仓/归属/可合箱状态 | 自动识别准确率或真实仓库作业自动化 |
| 多订单要手工盘点 | Package 集合、等待状态和可选状态 | 自动读取所有电商订单 |
| 打包重量与离仓需问客服 | Quote、Payment、Dispatch 的独立状态与时间线 | 实时仓库数据接入 |
| 派送状态异常时需另行联系承运商 | 最小 Exception 信息、下一步与支持引导 | 完整承运商工单处理或赔付体系 |

因此，V1 应消除**常规查询的产品断点**，而不是假装所有仓库和承运商动作都能由用户端自动完成。
