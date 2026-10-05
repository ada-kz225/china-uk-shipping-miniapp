# Shipment Creation 低保真结构

> 该页只完成一项任务：将用户已经选择的多个可合箱 Package，连同本次英国收货地址，提交为一次明确 Shipment。它不是报价、支付或服务商城页面。

## 页面结构

```text
┌──────────────────────────────────┐
│ ‹ 确认本次 Shipment                │
│ 已选择 8 件 Package                │
├──────────────────────────────────┤
│ SELECTED PACKAGES                 │
│ • 国内单号 •••• 4821               │
│ • 国内单号 •••• 6173               │
│ • ... 共 8 件                [编辑]│
├──────────────────────────────────┤
│ 还有 2 件可合箱 Package 未选择      │
│ 你可本次提交，也可返回调整          │
│ [返回 Package 列表查看]            │
├──────────────────────────────────┤
│ UK DELIVERY ADDRESS                │
│ 收件人 *   [                      ]│
│ 联系电话 * [                      ]│
│ 邮编 *     [                      ]│
│ 详细地址 * [                      ]│
├──────────────────────────────────┤
│ 提交后                            │
│ · 将生成本次 Shipment Reference    │
│ · 已选 Package 将锁定到本次 Shipment│
│ · Warehouse 后续处理、称重并生成报价│
│ [提交 Shipment]                   │
└──────────────────────────────────┘
```

英国地址字段保持一次性填写。收件人、联系电话、邮编与详细地址是完成末端派送所需的最小地址信息；具体地址格式、校验方式和是否可保存为地址簿仍为 Product Assumption，不在此阶段扩展。

## 提交前必须确认

| 区域 | 用户需要确认的事实 | 设计处理 |
| --- | --- | --- |
| Selected Packages | 本次实际包含哪些 Package、数量是否正确 | 显示数量和最小辨识信息；点击“编辑”回到保留选择的 Selection Mode。 |
| Missing / Unselected | 是否有仍可合箱但未选择的 Package | 显示“还有 N 件可合箱未选择”；只提示，不阻止用户按自己的时机提交。 |
| UK Address | 本次 Shipment 的收件信息完整 | 提交前字段级校验；不显示未验证的时效或承运商承诺。 |
| 提交后影响 | Package 何时锁定、后续会发生什么 | 明示“提交后锁定至本次 Shipment，等待 Warehouse 处理与报价”。 |

## 关键操作

| 操作 | Trigger | System Response | User Feedback | Validation / Failure |
| --- | --- | --- | --- | --- |
| Back | 点击返回 | 保留已选择 Package 与已填地址草稿 | 返回 Selection Mode，不丢失当前选择 | 若用户主动放弃草稿，再要求确认 |
| Edit | 点击已选 Package 的编辑 | 返回选择模式，保留当前勾选 | 可继续增删可选 Package | 已不再 READY 的 Package 显示不可用原因并要求移除 |
| Remove Package | 在本页移除单件 | 从草稿选择中移除，不改变实体最终归属 | 更新选择数与未选择可合箱数 | 移除至 0 件时禁用提交并引导返回选择 |
| Submit | 点击提交 Shipment | 校验至少 1 件、地址完整、Package 仍可选；成功后创建 Shipment | 显示稳定 Reference，跳转 Shipment Detail | 任一 Package 被占用/异常时，指出具体 Package 并回到编辑 |

## 状态与锁定

- 在 Package Selection 与 Shipment Creation 的草稿期间，Package 仍属于可选集合，未被最终锁定。
- 用户成功提交后才生成稳定 Shipment Reference，Shipment 进入“已提交，等待 Warehouse 处理”，已选 Package 进入“已加入本次转运”。
- 因并发或模拟状态更新导致 Package 已不可选时，不静默替换选择；提交失败并说明哪一件需要返回调整。
- 提交后能否撤回只在 Warehouse 尚未开始处理的允许窗口内开放，属于已标记的 Product Assumption；不把通用编辑入口带入处理中的 Shipment。

## Validation Error

```text
┌──────────────────────────────────┐
│ 无法提交 Shipment                  │
│ Package •••• 4821 已不再可合箱      │
│ 原因：该 Package 正在处理问题       │
│ 请返回调整选择后再提交              │
│ [返回调整]                         │
└──────────────────────────────────┘
```

校验失败后保留其余用户输入；不让用户重新填写完整地址或重新勾选所有 Package。
