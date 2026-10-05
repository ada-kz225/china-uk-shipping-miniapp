# Home 低保真结构

> Home 的任务是回答“我现在最需要处理什么”。它不做九宫格，也不要求用户先理解 Package、Shipment、Quote 等模块边界。

## 信息优先级

1. **Primary Information：Action Required**
   只有需要用户当前行动的事项：待付款、需要补充信息的异常、需要处理的 Package 异常。按阻塞程度排序，每次突出一个主行动。
2. **Primary Information：Current Journey**
   正在履约的 Shipment；让用户快速知道“这次转运到哪里了”。
3. **Secondary Information：Package Overview**
   以数量概览未到仓、待确认、可合箱与需处理的 Package，并可跳转到预设筛选。
4. **Secondary Information：Warehouse Information**
   为新用户和下一轮国内购物提供地址复制入口；它在没有待办时可以成为主行动。

## 默认结构

```text
┌──────────────────────────────────┐
│ Home                             │
│ 你有 1 件事需要处理               │
├──────────────────────────────────┤
│ ACTION REQUIRED                  │
│ ┌──────────────────────────────┐ │
│ │ 待付款                         │ │
│ │ Shipment REF-••••             │ │
│ │ 最终报价已生成，请确认并付款   │ │
│ │ [查看报价并付款]              │ │
│ └──────────────────────────────┘ │
├──────────────────────────────────┤
│ CURRENT JOURNEY                  │
│ ┌──────────────────────────────┐ │
│ │ REF-••••  英国派送中           │ │
│ │ 最近更新：已交接本地派送       │ │
│ │ 下一步：等待签收或异常事件     │ │
│ └──────────────────────────────┘ │
├──────────────────────────────────┤
│ PACKAGE OVERVIEW          [查看] │
│ 待到仓  2   待确认  1             │
│ 可合箱 10   需处理  0             │
│ [开始盘点可合箱 Package]          │
├──────────────────────────────────┤
│ WAREHOUSE INFORMATION            │
│ 中国 Warehouse 收件信息           │
│ 用于国内电商下单                  │
│ [复制地址]                        │
└──────────────────────────────────┘
```

上图只表达层级；实际内容随用户状态变化。当前没有 Shipment 时，不保留空白的“Current Journey”占位。

## Action Required 规则

| 优先级 | 出现场景 | 卡片必须说明 | Primary CTA | 去向 |
| --- | --- | --- | --- | --- |
| 1 | 用户需要处理的阻塞性 Exception | 发生什么、影响什么、需要做什么 | 查看并处理问题 | 关联 Package / Shipment Detail 的 Exception 区块 |
| 2 | Shipment 待付款 | Reference、Quote 已就绪、总价或费用待确认 | 查看报价并付款 | Shipment Detail 的 Quote / Payment 区块 |
| 3 | Package 需要补充信息 | 哪件 Package、缺少什么、是否阻塞合箱 | 查看并补充信息 | Package Detail |
| 4 | 无阻塞待办且存在可合箱 Package | 可合箱数量；不承诺“已经齐全” | 盘点并开始合箱 | Package List 的“可合箱”筛选 |

若同时存在多件待办，首张卡片承载最高优先级行动；其余以“还有 N 件待处理”进入对应列表，不在 Home 展开成长列表。

## Current Journey

只展示最值得持续关注的一次非终态 Shipment，避免把 Home 变成 Shipment List。

| Shipment 状态 | 卡片焦点 | 点击后 |
| --- | --- | --- |
| SUBMITTED / WAREHOUSE_PROCESSING | 已提交或仓库正在处理；当前通常无需操作 | Shipment Detail |
| PAID_AWAITING_DISPATCH | 付款已成功，但尚未实际离仓 | Shipment Detail |
| DISPATCHED 及后续运输状态 | 当前运输阶段、最近事件、下一预期 | Shipment Detail Timeline |
| DELIVERED / CANCELLED | 不在默认 Home 展示 | Shipment List 历史记录 |

## Package Overview

- 数量必须能点击进入对应的 Package List 预设筛选，而不是只做统计。
- “可合箱”数量高亮为用户可采取行动的集合，但不暗示这些 Package 必须本次全部寄出。
- 不在 Home 展开每个 Package 的 Tracking Number；10–20 件的核对工作应在 Package List 完成。

## Warehouse Information

首次使用或没有任何 Package 时，Warehouse Information 位于首屏并成为 Primary CTA。

```text
┌──────────────────────────────────┐
│ 开始使用                          │
│ 1. 复制中国 Warehouse 收件信息    │
│ 2. 在国内电商填写该地址            │
│ 3. 回来预报国内运单号              │
│ [复制 Warehouse 地址]             │
└──────────────────────────────────┘
```

复制后显示“已复制。下单后回来预报 Package”，不试图在小程序内完成外部下单。

## Empty State

| 场景 | 页面表达 | 主行动 |
| --- | --- | --- |
| 无 Package、无 Shipment | 显示三步起点和 Warehouse 地址；说明下单后需要预报 | 复制 Warehouse 地址 |
| 已预报但尚无可合箱 Package | 显示“已预报 N 件，等待送往 Warehouse”；Package Overview 仍可进入列表 | 查看已预报 Package |
| 无待办、无在途 Shipment，但有历史 | 简短欢迎与 Package Overview；不把历史 Shipment 强行置顶 | 查看可合箱 Package 或 Warehouse 地址 |

## Exception State

- Action Required 顶部只显示需要用户参与的 Exception；无须用户行动的处理型问题在 Shipment / Package Detail 中显示“当前无需操作，正在处理”。
- 卡片不写泛化的“请联系客服”，而要写明关联对象、影响与下一步，例如“Package 末四位 1234 尚未完成归属确认：请补充订单截图”。
- 点击始终进入关联实体的 Detail，保留完整上下文。
