# 小程序端说明

本目录是正式微信原生 TypeScript 小程序代码。它承接已冻结的 V1 用户任务流；不包含仓库、付款或物流的真实第三方集成。

## 目录结构

```text
miniprogram/
├── app.ts                         # 小程序启动：开发环境健康检查与全局状态
├── app.json                       # 页面注册、窗口配置、首页/包裹/转运 TabBar
├── app.wxss                       # 全局基础样式
├── config/
│   └── env.ts                     # development / test API Base URL、Demo 用户标识
├── pages/
│   ├── home/                      # 首页：待办 → 当前运输 → 包裹概览 → 中国仓信息
│   ├── packages/                  # 包裹列表、状态筛选、多选合箱入口
│   ├── package-detail/            # 包裹状态、到仓信息、异常说明
│   ├── package-declare/           # 最小包裹预报表单
│   ├── shipments/                 # 转运单进行中 / 历史列表
│   ├── shipment-create/           # 已选包裹、英国地址与提交转运单
│   └── shipment-detail/           # 状态、报价/付款、物流 Timeline、异常与地址
├── services/
│   ├── api.ts                     # 统一 GET / POST / DELETE、错误映射、用户请求头
│   ├── home.ts                    # 首页聚合数据 DTO 与请求
│   ├── packages.ts                # Package DTO、筛选、详情和预报请求
│   └── shipments.ts               # Shipment DTO、草稿、提交、付款和详情请求
├── typings/
│   └── index.d.ts                 # IAppOption 等全局 TypeScript 声明
├── project.config.json            # 可公开的小程序开发工具配置
├── sitemap.json                   # 小程序 sitemap 配置
└── tsconfig.json                  # TypeScript 检查配置
```

每个页面目录使用微信原生四文件结构：

| 文件 | 职责 |
| --- | --- |
| `index.ts` | 页面状态、事件处理、API 调用和导航 |
| `index.wxml` | 页面结构与中文用户文案 |
| `index.wxss` | 页面样式 |
| `index.json` | 页面标题等局部配置 |

## 页面与任务流

| 页面 | 核心任务 | 主要数据来源 | 主要去向 |
| --- | --- | --- | --- |
| 首页 | 找到待办、在途转运单、包裹状态和仓库地址 | `GET /home` | 包裹筛选、转运单详情、复制仓库地址 |
| 包裹列表 | 判断包裹是否到仓、可否合箱；选择多个包裹 | `GET /packages` | 包裹详情、预报、创建转运单 |
| 包裹详情 | 理解单个包裹的状态、下一步和异常 | `GET /packages/:id` | 返回包裹列表 |
| 预报包裹 | 提交国内运单号与商品描述 | `POST /packages` | 新建包裹详情 |
| 转运单列表 | 查找进行中或历史转运单 | `GET /shipments` | 转运单详情 |
| 创建转运单 | 确认包裹、填写英国地址、提交 | `POST /shipments`、`POST /shipments/:id/submit` | 转运单详情 |
| 转运单详情 | 查看状态、报价、模拟付款、履约 Timeline 与异常 | `GET /shipments/:id`、`POST /shipments/:id/payments` | 包裹详情、返回转运列表 |

## 数据流与职责边界

```text
页面
  ↓ 调用
services/*.ts
  ↓ 使用统一请求与中文错误映射
services/api.ts
  ↓ HTTP
Fastify API
  ↓
领域服务 / 状态机 / SQLite
```

- 页面不硬编码中文状态逻辑；后端 DTO 返回 `statusLabel`、`statusDescription` 和 `nextAction`。
- 小程序只调用用户 API；Mock Ops 仅供开发和演示时通过受保护后端接口触发。
- Payment、Warehouse、Tracking 与 Exception 的外部事实来源在 V1 中为模拟；界面会使用中文说明，不展示英文内部状态码。

## 本地运行与联调

1. 先在仓库根目录启动 API：

   ```bash
   npm run dev:server
   ```

2. 使用微信开发者工具导入本目录 `miniprogram/`。

3. 模拟器联调默认使用 `config/env.ts` 中的：

   ```ts
   development: "http://127.0.0.1:3000"
   ```

4. 真机调试时：

   - 将 `server/.env` 中的 `HOST` 配置为 `0.0.0.0`；
   - 将 `config/env.ts` 中 development 的地址临时改为 `http://<Mac 局域网 IP>:3000`；
   - 仅在本地调试时按微信开发者工具要求关闭或配置合法域名校验；
   - 调试结束后不要提交局域网 IP。

## 检查

在仓库根目录运行：

```bash
npx tsc --project miniprogram/tsconfig.json --noEmit
```

## 不应提交的本机文件

- `project.private.config.json`：个人开发工具配置；
- 局域网 IP、`.env`、SQLite 文件与日志；
- 包含个人信息、完整订单或聊天记录的截图和原始研究资料。
