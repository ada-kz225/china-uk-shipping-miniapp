# Shipment Detail 低保真结构

> Shipment Detail 是一次转运的唯一事实中心。用户打开后必须立刻知道：现在在哪一步、自己要不要做什么、接下来会发生什么。页面不以模块数量取胜，而按当前状态动态调整信息优先级。

## 所有状态共用的顶部

```text
┌──────────────────────────────────┐
│ ‹ Shipment                        │
│ REF-••••                          │
│ [当前状态：用户可理解的状态标题]   │
│ [下一步：由谁做什么 / 是否需操作]  │
└──────────────────────────────────┘
```

- **Shipment Reference**：用于辨识与关联事件，不承诺是承运商真实单号。
- **Current Status**：只显示用户文案，例如“已付款，等待仓库发出”。
- **Next Action**：必须明确“你需要付款”“当前无需操作”“请补充信息”等，不能只显示时间线。

## 基础内容架构

```text
顶部：Reference + Current Status + Next Action
  ↓
条件优先区块：Exception 或 Quote / Payment
  ↓
当前履约说明 / 最近事件
  ↓
Tracking Timeline（离仓后优先）
  ↓
Included Packages
  ↓
Weight / Cost Details（Quote 出现后）
  ↓
UK Address
```

Exception 出现时，Exception 区块置于 Next Action 之后、任何常规 Timeline 之前。待付款时，Quote / Payment 区块置于履约说明之前。

## 关键状态下的页面变化

| Shipment State | 顶部状态与下一步 | 首个内容区块 | 次级信息 | Primary Action |
| --- | --- | --- | --- | --- |
| SUBMITTED | 已提交，等待 Warehouse 开始处理；当前无需操作 | 本次已提交的 Package 与 Reference | 地址、提交时间 | 查看包含 Package |
| WAREHOUSE_PROCESSING | Warehouse 正在检查、打包和称重；当前无需操作 | 当前处理说明与最近事件 | Included Packages、地址 | 无主按钮；有异常才转行动 |
| AWAITING_PAYMENT | 最终报价已生成，请确认并付款 | Quote：最终计费重量、费用项、总价、生成时间 | Included Packages、地址 | 确认并模拟付款 |
| PAID_AWAITING_DISPATCH | 已付款，等待 Warehouse 实际出库；当前无需操作 | Payment 成功事实 + “尚未离仓”强调 | 最近处理事件、Included Packages | 查看最近事件 |
| DISPATCHED | 已离开 Warehouse，等待后续运输事件 | 最近离仓事件 + Timeline | Included Packages、Quote 摘要 | 查看 Timeline |
| INTERNATIONAL_TRANSIT | 正在国际运输；当前无需操作 | Timeline 当前节点与最近事件 | Quote 摘要、地址 | 查看 Timeline |
| CUSTOMS_CLEARANCE | 正在清关；仅在明确要求时行动 | Timeline 清关节点；必要时的行动提示 | 最近事件、Included Packages | 查看要求或 Timeline |
| UK_LAST_MILE | 英国派送中；等待签收或异常事件 | Timeline 末端派送节点 | 地址、最近事件 | 查看 Timeline |
| DELIVERED | 已签收，本次转运完成 | 签收事实与完整 Timeline 摘要 | Included Packages、Quote 摘要、地址 | 查看历史 Shipment |
| EXCEPTION | 当前问题影响 Shipment；见下一步 | Exception：发生什么、影响、用户动作、处理进度 | 相关 Package、发生前 Timeline | 按明确指引处理 / 查看支持方式 |

## AWAITING_PAYMENT：Quote 与 Payment

```text
┌──────────────────────────────────┐
│ REF-••••                          │
│ 最终报价已生成，请确认并付款       │
├──────────────────────────────────┤
│ 最终计费重量  [模拟值]             │
│ 费用项                            │
│ · 运费             [模拟值]        │
│ · 必要处理费       [模拟值]        │
│ 总价               [模拟值]        │
│ Quote 生成时间     [模拟事件时间]  │
│ [确认并模拟付款]                  │
├──────────────────────────────────┤
│ 付款成功后仍需等待 Warehouse 实际出库│
└──────────────────────────────────┘
```

页面只呈现本次 Quote 快照，不允许在用户付款后静默改写。真实计费规则、币种、税费和 Quote 有效期不在 V1 假装为已确认政策。

## PAID_AWAITING_DISPATCH：防混淆结构

```text
┌──────────────────────────────────┐
│ REF-••••                          │
│ 已付款，等待 Warehouse 发出         │
│                                  │
│ 付款已成功。Shipment 目前尚未离开   │
│ Warehouse，当前无需操作。           │
│                                  │
│ 下一步：Warehouse 确认实际出库后，  │
│ 才会更新为“已离开 Warehouse”。      │
│ 最近事件：Payment 已确认            │
└──────────────────────────────────┘
```

此状态不显示“已发货”“运输中”或带方向性的运输进度；Timeline 中“离仓”节点仍是未完成状态。

## Tracking 状态：连续 Timeline

```text
┌──────────────────────────────────┐
│ TRACKING TIMELINE                 │
│ ● 英国派送中       当前             │
│ │ 最近事件：[模拟] 已交接本地派送   │
│ ○ 清关完成                         │
│ ○ 国际运输                         │
│ ○ 已离开 Warehouse                 │
├──────────────────────────────────┤
│ 无新事件时：尚无新事件，最后更新…   │
└──────────────────────────────────┘
```

Timeline 仅在实际离仓后提升至页面主区块。事件必须说明阶段与时间；没有外部事件时显示“尚无新事件”，不虚构航班、承运商或预计送达。

## Included Packages、Weight / Cost、Address

- **Included Packages**：默认仅展示数量与最小识别信息；需要核对时进入相应 Package Detail。
- **Weight / Cost Details**：仅从 Quote 生成后出现；在付款后作为已确认 Quote 摘要保留。
- **UK Address**：作为本次 Shipment 的地址快照，置于页面较后位置；不在运输中反复要求用户编辑。
- **异常关联**：若问题源于具体 Package，Exception 区块提供进入该 Package Detail 的上下文链接。
