# Ads SDK

[English](README.md) | 中文

在你的应用中接入广告创作：Agent 对话、商品与素材管理、脚本与分镜生成，以及视频任务。

**预览版本：`0.1.0-preview.6`**

- **TypeScript 客户端：** 让前端连接 Ads Agent 并使用已保存的资源，包含 React hooks。
- **Go Admin SDK：** 在后端签发用户令牌并管理 Skills。
- **Playground：** 在本地用可视化工作区和 Agent 对话体验创作流程。

**从旧版本升级？** 请参阅文档页面《升级到 preview.5》（`pnpm docs:build` 后的 `docs/customer/migration.html`）和 [CHANGELOG](CHANGELOG.md)：部分调用已移除，提示词文字必须提到每个附带的文件。

## 试用 Playground

需要 Node.js 22.13 或更高版本、pnpm 11.7.0、Go 1.22+，以及客户的 Admin API key。

在本仓库中运行：

```sh
pnpm install --frozen-lockfile
cp ads-agent-playground/.env.example .env
```

在 `.env` 中填写凭据：

```dotenv
NUVA_CUSTOMER_API_KEY=your-customer-admin-api-key
NUVA_EXTERNAL_USER_ID=your-test-user-id
```

请使用你自己应用中的用户 ID。本地 Go 服务器负责签发并刷新该用户的访问令牌；Admin key 只保存在服务器上。

Playground 默认使用 staging 服务（`NUVA_ENVIRONMENT=sandbox`）。要使用正式环境，请在 `.env` 中设置环境和对应的 Admin API key：

```dotenv
NUVA_ENVIRONMENT=production
NUVA_CUSTOMER_API_KEY=your-production-customer-admin-api-key
```

显式设置的 `NUVA_AGENT_URL` 和 `NUVA_API_URL` 优先于所选环境；删除它们即可使用环境默认值。在页面的 **Connection settings** 中修改 URL 不会改变服务器的令牌签发方。修改环境、Admin key 或用户身份后，请重启 Playground。

启动：

```sh
pnpm playground
```

打开 [http://127.0.0.1:8995/](http://127.0.0.1:8995/)。

创建商品并上传参考图，然后在对话中用 **@** 提到它，请 Ads Agent 写一个脚本。审阅脚本，把它拍成分镜，并在工作区渲染片段。界面默认中文，可在页头用 **中文 / English** 切换。

安装、操作和排错见 [Playground 指南](ads-agent-playground/README.md)。

## 在应用中接入 SDK

### TypeScript

从 SDK 包安装：

```sh
pnpm add /path/to/nuva-sdk-0.1.0-preview.6.tgz
```

创建客户端时提供 `getAccessToken` 回调，由它调用你自己的已认证后端。预览版默认使用 staging 服务。返回 `{token, expiresAt}`，SDK 会在需要时刷新访问令牌。

从 [TypeScript 指南](typescript/README.md) 或 [React 示例](docs/examples/react-usage.tsx) 开始。

### Go

```sh
go get github.com/Nuva-Lab/ads-sdk/go@v0.1.0-preview.6
```

用 [Go Admin SDK](go/README.md) 签发用户令牌并注册 Skills。Admin API key 保存在你的后端，后端把用户令牌返回给已登录用户的前端。

## 指南与示例

| 我想要… | 从这里开始 |
| --- | --- |
| 连接客户端并处理认证 | [TypeScript 指南](typescript/README.md) |
| 构建 Agent 对话、流式回复和审阅 | [React 示例](docs/examples/react-usage.tsx) |
| 创建商品、上传图片、读取已保存的产物 | [Store 示例](docs/examples/store-usage.ts) |
| 生成脚本、分镜和视频片段 | [创作示例](docs/examples/creation-chain.ts) |
| 签发用户令牌并管理 Skills | [Go Admin 指南](go/README.md) |

SDK 包中附带可浏览的 HTML 文档（中英文）。要在本仓库中查看，请安装 Python 3 并运行：

```sh
pnpm docs:build
python3 -m http.server 8992 --bind 127.0.0.1 --directory docs/customer
```

打开 [http://127.0.0.1:8992/frontend.html](http://127.0.0.1:8992/frontend.html)。侧边栏链接到 Agent、Store 和 Go Admin 参考文档。

## 构建与测试

```sh
pnpm build
pnpm test
pnpm --dir ads-agent-playground typecheck
pnpm --dir ads-agent-playground test
```

测试使用本地 fixtures。通过 Playground 运行生成会使用你连接的服务，并产生真实的任务。

遇到集成问题，请[提交 issue](https://github.com/Nuva-Lab/ads-sdk/issues)，并附上 SDK 版本和复现步骤。
