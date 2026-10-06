# 中英转运微信小程序

一个从 0 到 1 设计并实现的个人 Portfolio MVP，面向需要从中国寄送多个包裹到英国的个人用户。项目文档完整保留了产品研究、用户验证、产品定义、交互设计、PRD、可点击原型与技术设计过程。

> 当前阶段：**Development — Phase 2：Package Management**
>
> 当前已完成 Package 预报、列表、详情、状态说明与受保护的 Mock Ops 状态推进。Shipment、报价、付款、物流、异常工作流与首页数据仍未开始实现。

## 当前能力

- 微信原生 TypeScript 小程序骨架；
- 三个中文 Tab：**首页、包裹、转运**；
- TypeScript + Fastify API 服务骨架；
- `GET /health` 健康检查；
- SQLite 可重复迁移、核心 Schema 与基础 Repository；
- 可重复执行的 Portfolio Demo Seed；
- Package Service、状态机、归属校验与关键审计记录；
- Package 用户 API：预报、列表、状态筛选与详情；
- 仅开发 / 演示环境可用的受保护 Mock Ops Package API；
- 小程序 Package 列表、详情、预报页，均使用真实后端 API；
- Vitest 健康检查、数据库约束、Package Service 与 API 测试；
- 小程序 API Client 与微信官方 TypeScript API 类型声明。

## 项目结构

```text
china-uk-shipping-miniapp/
├── miniprogram/                 # 正式微信小程序代码
│   ├── config/                  # 小程序开发 / 测试环境配置
│   ├── services/                # 统一 API Client 与 Package API
│   └── pages/                   # 首页、Package、转运与 Package 子页面
├── server/                      # Fastify API 服务
│   ├── src/
│   │   ├── config/              # Zod 环境配置
│   │   ├── db/                  # SQLite 连接、迁移、初始化与 Seed
│   │   ├── routes/              # Health、Package 与开发期 Mock Ops 路由
│   │   ├── services/            # 领域服务与状态机入口
│   │   ├── domain/              # 状态码、领域类型与状态机
│   │   ├── presenters/          # 中文用户 DTO 映射
│   │   ├── repositories/        # 数据访问层
│   │   └── utils/               # 通用错误与标识工具
│   └── tests/                   # Vitest 测试
├── docs/                        # 产品、设计、PRD 与技术设计文档
├── prototype/                   # 已冻结的独立可点击原型
└── package.json                 # Workspace 脚本
```

## 开发前置条件

- Node.js 22 或更高版本；
- npm；
- 微信开发者工具（用于载入 `miniprogram/`）。

## 启动 Backend

1. 在仓库根目录安装依赖：

   ```bash
   npm install
   ```

2. 复制环境示例：

   ```bash
   cp server/.env.example server/.env
   ```

3. 启动本地服务：

   ```bash
   npm run dev:server
   ```

默认服务地址为 `http://127.0.0.1:3000`，首次启动会创建 `server/data/dev.sqlite`。

4. 检查服务：

   ```bash
   curl http://127.0.0.1:3000/health
   ```

预期得到 API 与 SQLite 均已连接的健康状态。该接口不包含用户、包裹或转运业务数据。

## 运行测试

```bash
npm run test:server
```

自动化测试使用 SQLite 内存数据库或独立临时数据库，不会写入或污染 `server/data/dev.sqlite`。

可选的 TypeScript 检查：

```bash
npm run check:server
```

## 数据库命令

```bash
# 重复执行安全：创建或升级本地开发数据库 Schema
npm run db:init

# 写入可重复执行的演示数据
npm run db:seed

# 重置 server/data/ 下的本地数据库（需要显式确认）
CONFIRM_DB_RESET=1 npm run db:reset
```

Phase 1 的 Seed 使用虚构用户、地址、运单、金额与时间。它建立 19 件 Package、6 张不同阶段的 Shipment、Quote、Payment Attempt、Tracking Event、Exception 与 Audit Log，供后续页面和业务服务开发使用。

## 打开微信小程序

1. 打开微信开发者工具；
2. 选择“导入项目”；
3. 选择仓库中的 `miniprogram/` 目录；
4. 使用项目内的 `project.config.json`；当前使用体验版 AppID 配置；
5. 可切换 **首页、包裹、转运** 三个 Tab。

Package 页会请求开发环境 API。当前默认地址为 `http://127.0.0.1:3000`，定义在 `miniprogram/config/env.ts`；本地开发使用固定的匿名 Demo 用户身份，仅用于作品集联调。

### 本地网络说明

在微信开发者工具进行本地联调时，可能需要在本地设置中临时关闭“校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书”。真机或公开部署必须改用已配置的 HTTPS 服务地址；这不在当前 Phase 0 范围内。

## 当前未实现

以下能力已在 PRD 与技术设计中定义，但明确留在后续 Phase：

- Shipment 草稿、合箱、地址、锁定与提交 API；
- Quote、模拟付款和出库闸门业务逻辑；
- 国际运输、清关、英国派送与签收业务逻辑；
- Exception 工作流，以及 Shipment / Quote / Payment / Tracking 的 Mock Ops；
- 真实微信登录、真实微信支付、真实仓库 / 物流 API。

## 文档导航

- [产品研究](docs/01-research/)
- [产品定义](docs/02-product-definition/)
- [产品设计](docs/03-product-design/)
- [低保真 Wireframe](docs/04-wireframes/)
- [V1 PRD](docs/05-prd/v1-prd.md)
- [可用性测试](docs/06-usability-testing/)
- [技术设计](docs/07-technical-design/)

## 开发原则

- 严格按已冻结的 MVP Scope 开发，不新增能力；
- 所有用户可见内容使用中文；
- 外部仓库、支付与物流事件在 Portfolio MVP 中使用模拟，但 Package / Shipment 核心规则必须在服务端真实实现；
- Prototype 是独立的交互验证工件，正式代码不从中复制状态或静态数据；
- 不把模拟数据、Product Assumption 或作品集能力表述为真实运营服务。
