# IF.Land System

IF.Land System 是面向线下黑客松现场的协同与展示系统。它为已报名选手提供 Builder 号登录、移动端组队协作、队伍状态同步、全局通知和 PWA 安装入口，同时为现场投屏提供公开只读的大屏页面。

系统采用 Next.js App Router 实现前后端一体化服务，数据层通过 `data-service` facade 统一访问 `MockDataSource` 或 `FeishuDataSource`。开发和测试默认使用本地 mock 数据；真实现场环境可通过 `USE_FEISHU=true` 切换到飞书多维表格。

## 核心功能

- Builder 号登录：选手输入 Builder 号登录，后端用 HttpOnly Cookie 维护登录态。
- 飞书 OAuth 绑定：支持通过飞书授权获取 open_id，并与 Builder 号绑定。
- 个人大厅：展示头像、姓名、角色、自我介绍、联系方式、队伍状态和全局红条通知。
- 组队流程：自由人可邀请其他 Builder；系统自动建队、锁定名额、处理待接受邀请。
- 队长权限：队长可邀请队员、修改队名、修改一句话宣言、切换队伍状态。
- 邀请排他清理：用户接受某队邀请后，会从其他所有队伍的 pendingInvites 中移除。
- 离队申请：普通队员可提交离队申请，系统写入异常标记供管理员处理。
- 现场大屏：公开访问 `/screen`，展示倒计时、跑马灯、队伍状态和在场人数。
- PWA：生产构建启用 PWA 注册，适合移动端添加到主屏幕。
- 头像上传：当前支持本地直存，TOS 变量预留给后续对象存储接入。

## 技术栈

- Next.js 16 + React 19 + TypeScript
- App Router API Routes
- Tailwind CSS 4
- Base UI / shadcn 风格基础组件
- Vitest 单元与 API 测试
- Playwright E2E 测试
- 飞书开放平台 + 飞书多维表格

## 项目结构

```text
src/app/                 页面与 API routes
src/app/login            Builder 号登录页
src/app/dashboard        选手个人大厅
src/app/screen           现场大屏
src/components/          页面组件与 UI 组件
src/contexts/            前端鉴权上下文
src/lib/data-service.ts  数据访问 facade，保留旧导出入口
src/lib/data-source/     Mock / Feishu 数据源实现
src/lib/feishu.ts        飞书 Base 底层 API client
src/lib/feishu-oauth.ts  飞书 OAuth client
src/mocks/mock_data.json 本地 mock 数据
e2e/                     Playwright 测试
docs/                    PRD、测试说明、飞书联调记录
```

数据访问链路：

```text
API route -> src/lib/data-service.ts -> DataSource -> MockDataSource / FeishuDataSource
```

## 运行环境

建议使用 Node.js 20 或更高版本。

首次安装依赖：

```bash
npm install
```

创建本地环境变量文件：

```bash
cp .env.example .env.local
```

默认不需要填写飞书变量即可启动 mock 模式。

## 环境变量

### 数据源切换

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `USE_FEISHU` | 否 | 设置为 `true` 时使用飞书数据源；为空或其他值时使用本地 mock 数据。 |

### 飞书开放平台与多维表格

仅在 `USE_FEISHU=true` 时需要配置。

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `FEISHU_APP_ID` | 是 | 飞书应用 App ID。 |
| `FEISHU_APP_SECRET` | 是 | 飞书应用 App Secret。 |
| `FEISHU_BASE_APP_TOKEN` | 是 | 飞书多维表格 App Token，通常来自 Base URL 中的 `B...` 部分。 |
| `FEISHU_TABLE_ID_USERS` | 是 | 用户表 Table ID。 |
| `FEISHU_TABLE_ID_TEAMS` | 是 | 团队表 Table ID。 |
| `FEISHU_TABLE_ID_SYSTEM` | 是 | 系统控制台表 Table ID。 |
| `FEISHU_OAUTH_REDIRECT_BASE` | 否 | 飞书 OAuth 回调域名，开发默认 `http://localhost:3000`。 |

飞书 Base 需要准备 3 张表：用户表、团队表、系统控制台。字段设计详见 `docs/PRD_and_Data.md` 和 `docs/FEISHU_API_REFERENCE.md`。

### 头像对象存储预留

当前头像上传以本地直存为主；以下变量为后续火山 TOS 接入预留。

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `TOS_AK` | 否 | 火山 TOS Access Key。 |
| `TOS_SK` | 否 | 火山 TOS Secret Key。 |
| `TOS_REGION` | 否 | 火山 TOS 区域。 |
| `TOS_BUCKET` | 否 | 火山 TOS 存储桶。 |

## 启动方式

### Mock 模式

适合本地开发、单元测试和 E2E。

```bash
npm run dev
```

访问：

- 首页：http://localhost:3000
- 登录页：http://localhost:3000/login
- 选手大厅：http://localhost:3000/dashboard
- 现场大屏：http://localhost:3000/screen

Mock 用户数据在 `src/mocks/mock_data.json` 中维护，可使用预置 Builder 号进行登录。

### 飞书模式

先在 `.env.local` 中填入飞书变量，并设置：

```bash
USE_FEISHU=true
```

然后启动：

```bash
npm run dev
```

飞书模式下，用户、队伍和系统配置都会读写飞书多维表格；前端不会直接接触飞书密钥。

### 生产构建

```bash
npm run build
npm run start
```

`npm run build` 使用 `next build --webpack`，生产模式会启用 PWA 注册。

## 常用脚本

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动开发服务器。 |
| `npm run build` | 生产构建。 |
| `npm run start` | 启动生产服务。 |
| `npm run lint` | ESLint 检查。 |
| `npm run typecheck` | TypeScript 类型检查。 |
| `npm run test` | 运行 Vitest 单元与 API 测试。 |
| `npm run test:watch` | 以 watch 模式运行 Vitest。 |
| `npm run test:e2e` | 运行 Playwright E2E 测试。 |

## CI/CD 自动部署

仓库包含 GitHub Actions workflow：`.github/workflows/deploy.yml`。

触发方式：

- 推送到 `main` 分支时自动部署。
- 在 GitHub Actions 页面手动运行 `Deploy` workflow。

需要在 GitHub Actions Secrets 中配置：

| Secret | 说明 |
| --- | --- |
| `SERVER_HOST` | 服务器公网 IP 或 GitHub Actions runner 可访问的域名。 |
| `SERVER_PORT` | SSH 端口，通常是 `22`。 |
| `SERVER_USER` | SSH 用户，例如 `ubuntu`。 |
| `SERVER_SSH_KEY` | 用于登录服务器的私钥。 |
| `DEPLOY_PATH` | 服务器部署目录，例如 `/var/www/ifland-system`。 |

部署流程：

```text
checkout code -> rsync source to server -> npm ci -> npm run build -> pm2 restart
```

服务器需要提前准备：

- Node.js 20 或更高版本
- npm
- pm2
- rsync
- 可被 `SERVER_USER` 写入的部署目录
- 部署目录 `current/` 下的 `.env.local`

当前 workflow 使用独立 PM2 进程名 `ifland-system`，并让 Next.js 监听 `3731` 端口，避免和同服务器上的 `compass-app` 服务冲突。若使用 `/var/www/ifland-system` 作为 `DEPLOY_PATH`，实际代码会同步到 `/var/www/ifland-system/current`。workflow 会尝试通过 `sudo mkdir -p` 创建目录并将 owner 改为当前 SSH 用户；若服务器没有免密 sudo，需要先手动创建目录并授权。

## 测试与验收

推荐提交前运行：

```bash
npm run typecheck
npm run test
npm run lint
npm run build
npm run test:e2e
```

当前测试覆盖包括：

- Mock 数据读写与组队业务规则
- 登录、鉴权、用户信息、组队邀请、接受/拒绝邀请
- 队名、宣言、队伍状态、离队申请
- 系统状态、大屏队伍列表、强制解散触发
- 数据源选择与 `data-service` facade 兼容性
- 登录、组队和大屏 E2E 流程

更完整的测试矩阵见 `docs/TESTING.md`。

## 主要 API

| 路由 | 说明 |
| --- | --- |
| `POST /api/auth/login` | Builder 号登录。 |
| `DELETE /api/auth/login` | 退出登录。 |
| `GET /api/user/me` | 获取当前登录用户。 |
| `GET /api/team/my` | 获取当前用户队伍与队友。 |
| `POST /api/team/invite` | 发起组队邀请，必要时自动建队。 |
| `POST /api/team/invite/accept` | 接受邀请并清理其他队伍邀请。 |
| `POST /api/team/invite/reject` | 拒绝邀请。 |
| `GET /api/team/invites/received` | 获取当前用户收到的邀请。 |
| `PUT /api/team/name` | 队长修改队名。 |
| `PUT /api/team/slogan` | 队长修改一句话宣言。 |
| `PUT /api/team/status` | 队长修改队伍状态。 |
| `POST /api/team/leave-request` | 队员提交离队申请。 |
| `GET /api/system/status` | 获取系统跑马灯与倒计时配置。 |
| `GET /api/screen/teams` | 获取大屏队伍列表。 |
| `POST /api/upload/avatar` | 上传头像。 |

## 飞书配置要点

1. 创建飞书开放平台应用，获取 `FEISHU_APP_ID` 和 `FEISHU_APP_SECRET`。
2. 创建飞书多维表格 Base，并建立用户表、团队表、系统控制台 3 张表。
3. 为应用授予读取、写入多维表格记录以及 OAuth 相关权限。
4. 将 Base App Token 和各表 Table ID 写入 `.env.local`。
5. 若使用飞书 OAuth，将 `FEISHU_OAUTH_REDIRECT_BASE` 设置为线上域名，并在飞书后台配置对应回调地址。

字段名称和关联字段格式必须与文档保持一致，否则 FeishuDataSource 无法正确解析用户、队伍和系统配置。

## 开发注意事项

- `src/lib/data-service.ts` 是 API route 的稳定入口，不建议在 route 中直接依赖具体数据源实现。
- 新增数据访问能力时，优先补充 `DataSource` 接口，再分别实现 mock 与 feishu。
- Mock 模式会读写 `src/mocks/mock_data.json`，测试会在运行前后重置该文件。
- `/dashboard` 由 `src/proxy.ts` 保护；未登录访问会重定向到 `/login`。
- `/screen` 是公开只读页面，不需要登录。
