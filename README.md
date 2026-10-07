# 中英集运微信小程序

一个从 0 到 1 完成产品研究、设计、原型验证与工程实现的个人产品作品集 MVP。它面向在英国、需要把多个中国电商包裹集中寄往英国的个人用户，帮助用户自助管理包裹、创建转运单，并持续了解履约进度。

> 当前状态：**V1 Portfolio MVP — 自动化质量门禁已通过，等待最终微信开发者工具人工回归。**

## 为什么做

一次探索性真实用户访谈（P01）显示：受访者在一次转运中会管理约 10–20 件来自多个中国电商渠道的包裹。国内物流显示签收后，受访者仍需向客服确认是否已入仓并归属自己；合箱前还要手工核对多个订单；付款后则要继续询问是否实际离仓。

本项目不把单一样本外推为普遍结论。它将这些观察作为 **Assumption-led MVP** 的设计依据，聚焦验证一条清晰的自助信息与决策闭环，而不是模拟完整物流公司系统。

## 核心用户问题

1. 多个包裹分批到仓后，无法快速确认是否已入仓、归属自己并可合箱。
2. 包裹盘点与多包裹合箱需要跨电商订单和人工客服反复核对。
3. 称重、报价、付款、实际离仓等关键状态缺乏连续的自助可见性。
4. 英国末端运输异常时，用户需要知道发生了什么、影响什么以及下一步怎么做。

## 产品过程

```text
Research
→ MVP Definition
→ Product Design
→ Clickable Prototype
→ Usability Test
→ Technical Design
→ Development
→ Quality & End-to-End Testing
```

| 阶段 | 产出 |
| --- | --- |
| Research | 问题背景、目标用户假设、P01 探索性访谈、假设校准与需求优先级 |
| MVP Definition | 核心 JTBD、领域模型、业务规则、状态机与范围边界 |
| Product Design | 信息架构、核心任务流、页面清单、状态到行动设计 |
| Prototype | 7 个 P0 页面的低保真可点击原型 |
| Usability Test | UT01 真实探索性测试及两项定向交互改进 |
| Technical Design | API、SQLite、状态机、Mock Ops、测试与错误处理设计 |
| Development | 微信原生小程序、Fastify 服务、SQLite、状态约束与测试 |

完整过程文档见 [docs](docs/)。产品复盘见 [Product Retrospective](docs/08-retrospective/product-retrospective.md)。

## V1 核心闭环

```text
中国仓地址
→ 包裹预报
→ 到仓 / 匹配 / 可合箱
→ 选择多个包裹
→ 创建并提交转运单
→ 仓库处理 / 最终重量 / 报价
→ 模拟付款
→ 实际出库
→ 国际运输 / 清关 / 英国派送
→ 签收
```

关键业务约束：

- `Package` 与 `Shipment` 是两个独立实体；多个 Package 可组成一个 Shipment。
- 一个 Package 同时只能属于一个有效 Shipment。
- “已付款，等待仓库发出”不等于“已从仓库发出”；只有“已签收”才代表完整履约结束。
- 异常会阻断不合法的后续推进；由模拟运营操作解决后，工作流恢复至记录的原状态。

## V1 功能

- 首页聚合：待处理事项、当前运输、包裹概览与中国仓地址；
- 包裹预报、列表、筛选、详情、状态与异常说明；
- 10–20 件包裹场景的多选、未选提醒与不可选原因；
- 转运单草稿、英国地址、提交、取消与包裹原子锁定；
- 最终重量、费用快照、模拟付款，以及付款与出库的状态区分；
- 阶段级运输 Timeline：出库、国际运输、清关、英国派送、签收；
- Package / Shipment 异常的影响、下一步、当前进度与支持说明；
- 仅开发 / 演示环境可用的受保护 Mock Ops，用于产生模拟仓库、付款与物流事件。

## 产品截图（占位）

本仓库不提交包含真实个人信息或真实订单的截图。演示时建议将脱敏截图放入 `docs/assets/screenshots/`，并在此处补充：

- 首页：待办优先级、当前运输、包裹概览与仓库地址；
- 包裹页：10–20 件包裹的筛选与多选状态；
- 创建转运单：已选包裹、未选提醒与英国地址；
- 转运单详情：报价、已付款待出库、Timeline 与异常卡片。

## 技术架构

```text
微信原生小程序（TypeScript）
          │ HTTP
          ▼
Fastify API（TypeScript + Zod）
          │
          ▼
SQLite（Migration + Seed）
          │
          ├─ Domain Service / State Machine
          ├─ Repository / Audit Log
          └─ Mock Ops（模拟仓库、付款、物流、异常）
```

- Frontend：微信原生小程序、TypeScript；
- Backend：Node.js、Fastify、TypeScript；
- Validation：Zod；
- Database：SQLite；
- Testing：Vitest；
- 所有用户可见文案为中文；英文状态码仅用于内部业务逻辑。

## 项目结构

```text
china-uk-shipping-miniapp/
├── miniprogram/       # 微信原生小程序
├── server/            # Fastify API、领域服务、SQLite、Mock Ops、测试
├── docs/              # 从研究到技术设计与复盘的产品文档
├── prototype/         # 已冻结的低保真可点击原型
└── package.json       # Workspace 脚本
```

## 本地运行

前置条件：Node.js 22+、npm、微信开发者工具。

```bash
npm install
cp server/.env.example server/.env
npm run dev:server
```

服务默认监听 `http://127.0.0.1:3000`（以 `server/.env` 为准）。健康检查：

```bash
curl http://127.0.0.1:3000/health
```

微信开发者工具导入 `miniprogram/` 目录。若使用真机或局域网调试，请：

1. 将 `server/.env` 的 `HOST` 设置为本机可访问地址，例如 `0.0.0.0`；
2. 将 `miniprogram/config/env.ts` 的开发环境 API 地址改为本机局域网 IP；
3. 仅在本地开发时按微信开发者工具要求处理合法域名校验。

真实上线必须使用安全的 HTTPS 服务、真实身份认证与受控配置；它们不属于此 Portfolio MVP。

## 运行 Demo 数据

```bash
# 清空并重建 server/data/dev.sqlite（显式确认才会执行）
CONFIRM_DB_RESET=1 npm run db:reset

# 写入可重复执行的演示数据
npm run db:seed
```

Seed 提供 19 件不同状态的 Package、6 张不同阶段的 Shipment、报价、付款、运输事件、异常和审计记录，可直接演示首页、包裹、转运、报价、Timeline 与异常状态。

## Testing

```bash
npm run check:server
npm run test:server
npx tsc --project miniprogram/tsconfig.json --noEmit
```

测试覆盖数据库约束、状态机、Package / Shipment / Quote / Payment / Dispatch / Tracking / Exception / Home API，以及完整 Happy Path 与 Exception Path。测试使用内存或独立临时 SQLite 数据库，不污染开发数据库。

## MVP 边界与模拟依赖

以下能力在 V1 中使用模拟事件或数据，而非真实商业接入：

- 仓库收货、匹配、称重、打包与出库；
- 付款结果；
- 国内、国际、清关与英国末端物流事件；
- 客服、承运商与外部电商平台数据。

核心领域规则并非模拟：包裹归属、状态转换、转运单包裹锁定、报价快照、付款与出库闸门、异常阻断与恢复均由服务端约束。

## Future Work

- 用更多真实中英寄送 / 集运用户验证当前假设；
- 评估微信小程序相对网站 / App 的入口适配性；
- 接入真实认证、支付、仓库作业与物流数据源；
- 验证照片凭据、状态通知、地址簿和有限增值服务的优先级；
- 完成更多设备、网络失败和长列表规模下的可用性测试。

## 文档导航

- [Discovery Research](docs/01-research/)
- [Product Definition](docs/02-product-definition/)
- [Product Design](docs/03-product-design/)
- [Wireframes](docs/04-wireframes/)
- [V1 PRD](docs/05-prd/v1-prd.md)
- [Usability Testing](docs/06-usability-testing/)
- [Technical Design](docs/07-technical-design/)
- [Product Retrospective](docs/08-retrospective/product-retrospective.md)
