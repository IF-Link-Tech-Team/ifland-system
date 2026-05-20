🤖 黑客松现场系统 - AI 开发者全局规矩 (docs/AGENTS.md / .cursorrules)
0. 你的角色 (Role)
你现在是一位顶级的全栈工程师，负责为一个黑客松活动开发"现场协同与展示系统"。 你的编码风格必须：极简、健壮、移动端优先、严格遵循安全规范。不要过度工程（Over-engineering），不要引入不需要的庞大依赖库。

1. 强制技术栈 (Tech Stack)
除非人类明确要求更改，否则必须严格使用以下技术栈：

前端框架：Next.js (App Router) + TypeScript + React
UI 与样式：Tailwind CSS + Shadcn UI (默认采用暗黑赛博朋克主题) + Lucide Icons
中转后端 (Proxy)：Next.js API Routes (Serverless Functions) 或轻量级 Node.js / Express
数据库：飞书多维表格 (Feishu Base) API
状态管理：React Context 或 Zustand (保持轻量)
2. 系统路由规范
系统仅包含 3 个纯粹路由，全部遵循极简设计：

路由	鉴权	说明
/login	❌ 免鉴权	选手登录入口，输入 Builder 号即可进入系统
/dashboard	✅ 需鉴权	核心大厅，组队、接受邀请、修改队名等全部操作均在当前页以 Modal / Inline 方式完成，不跳新页面
/screen	❌ 免鉴权	大屏端，纯公开只读页面，仅展示倒计时和全场队伍状态，不可写
2.1 登录态方案（Phase 1 — Cookie 方案）
登录成功：中转后端 POST /api/auth/login 校验 Builder 号成功后，在响应 Header 中设置 Set-Cookie: auth_token={builderId}; Path=/; HttpOnly。同时 Response Body 必须返回完整的用户信息 { builderId, name, role, teamId }，以便前端一次性写入 React Context，避免登录后额外调用 /api/user/me。
后续请求：前端所有 /api/... 请求自动携带该 Cookie。中转后端从 Cookie 中解析 auth_token 得到当前 builderId，作为当前操作用户身份。绝不依赖前端在 Request Body 或 URL 参数中传递 builderId，防止越权。
退出登录：后端返回 Set-Cookie: auth_token=; Path=/; HttpOnly; Max-Age=0 清除 Cookie。
Phase 2 预留：正式版切换为飞书 SSO 或 JWT Token 时，仅需修改 /api/auth/login 的实现逻辑和 Cookie 命名，前端业务逻辑 0 改动。
3. 🛡️ 架构与安全红线 (CRITICAL SECURITY RULES)
这是本系统最核心的底线，绝对不允许违反：

严禁前端直连飞书：前端代码 (src/app, src/components 等) 中绝对不允许出现飞书 API 的 URL、App ID 或 App Secret。
强制代理模式 (Proxy Pattern)：前端必须向中转后端 API 路由发送请求。所有的飞书 API 密钥（FEISHU_APP_ID, FEISHU_APP_SECRET）必须存在 .env.local 中，并且只能在服务端代码中读取。中转后端在内部隐藏对飞书的调用细节，前端不感知飞书 API 的存在。
PWA 支持：必须配置 next-pwa 或类似工具，确保应用符合 PWA 安装标准（提供 manifest.json 和 service worker）。
4. API 路径规范
所有前端请求统一走标准 RESTful 风格，废弃 必须请求/api/feishu/...`` 的旧规则。

4.1 统一响应格式
所有 /api/... 路由必须返回标准 JSON 结构，前端 Toast 提示统一依赖此格式：

成功响应：{ "ok": true, "data": { ... } } — data 字段包含业务数据。
失败响应：{ "ok": false, "error": "错误信息说明" } — error 字段为人类可读的中文错误描述，前端直接用于 Toast 展示。
例外：POST /api/auth/login 成功时 Response Body 直接返回用户信息对象（不包裹在 { ok, data } 中），以便前端一次性写入 Context。
4.2 路径列表
方法	路径	说明
POST	/api/auth/login	登录校验，输入 Builder 号
GET	/api/user/me	获取当前用户完整信息
GET	/api/team/invites/received	获取当前用户收到的所有邀请列表
POST	/api/team/invite	队长发起邀请（Body: { targetBuilderId }）
POST	/api/team/invite/accept	被邀请方接受邀请（Body: { teamId }）
POST	/api/team/invite/reject	被邀请方拒绝邀请（Body: { teamId }）
PUT	/api/team/name	队长修改队名（Body: { teamId, name }）
PUT	/api/team/slogan	队长修改宣言（Body: { teamId, slogan }）
PUT	/api/team/status	队长切换队伍状态（Body: { teamId, status }）
POST	/api/team/leave-request	队员申请离队（打异常标记）
GET	/api/system/status	大屏 / Dashboard 轮询全局状态（通知 + 倒计时）
GET	/api/screen/teams	大屏获取全场队伍列表
POST	/api/upload/avatar	头像上传（Phase 1：本地直存；Phase 2：TOS）
5. 🚧 Phase 1 开发模式 (Mock First)
目前系统处于 Phase 1（本地 Demo 开发期），飞书 API 尚未正式打通。你必须遵循以下 Mock 规则：

禁止强行请求外部 API：在开发服务端接口时，不要尝试向真实的 open.feishu.cn 发送请求。
使用本地 Mock 数据：在根目录或 src/mocks 下维护一个 mock_data.json（结构参照 docs/PRD_and_Data.md 第 12 节），严禁深层嵌套。
模拟网络延迟：在 API 路由中读取 mock_data.json 时，人为增加 setTimeout(..., 500) 来模拟真实的飞书 API 延迟，以测试前端的 Loading 状态。
头像上传 (Phase 1 专属)：对于头像上传逻辑，Phase 1 阶段仅需将接收到的图片保存到本机的 /public/uploads 目录，并返回相对于 localhost 的静态资源 URL。必须将此逻辑封装在独立的 uploadAvatar() 函数中，以便未来一键切换至云端 OSS。
默认头像：未上传头像的用户，使用 DiceBear API 生成专属默认头像（如 https://api.dicebear.com/7.x/initials/svg?seed={builderId}）。
6. 组队核心逻辑约束 (必读)
请在实现组队功能时，严格遵循以下业务规则（详见 docs/PRD_and_Data.md 第 5.3 节）：

双向确认制：邀请不是即时生效的，被邀请方（B）需要主动"同意"才能加入队伍。
名额锁定：当前人数 + pendingInvites.length >= 3 时，队长的邀请按钮立即置灰禁用。
排他机制：B 接受甲队伍邀请时，系统自动将 B 从所有其他队伍的 pendingInvites 中剔除，使其他邀请自动失效。
受邀方交互：B 在 Dashboard 看到所有收到的邀请列表，可以"同意"或"忽略/拒绝"。
离队申请：点击"申请离队"后仅打异常标记，按钮立即变为"已申请离队（等待管理员处理）"并 Disabled，无需弹窗确认。
7. 编码风格与 UI 规范 (Coding & UI Standards)
TypeScript 严格模式：所有组件、API 参数、飞书返回的数据结构都必须定义清晰的 interface 或 type。严禁使用 any。
移动端优先 (Mobile First)：Tailwind 样式必须首先满足手机端竖屏展示（Hacker 的主要使用场景），然后使用 md: 和 lg: 前缀适配大屏投屏。
语言习惯：变量命名、函数命名、组件命名一律使用英文（例如 TeamDashboard, handleInvite）。但代码内部的业务注释必须使用中文。
用户提示：接口请求的成功、失败、加载中，必须通过 UI 组件（如 Toast, Skeleton）给予用户明确的反馈。
8. 任务执行与自动化工作流 (Workflow Protocol)
在执行人类指派的开发任务时，你必须遵循以下闭环流程：

阅读上下文：开始干活前，先读取 docs/PRD_and_Data.md 和 docs/TASKS.md。
渐进式提交：不要把整个系统写在一个文件里。按照组件化思想拆分代码。
自检测试：完成一个逻辑模块后，务必思考并发情况（例如：队伍已满 3 人时，是否有拦截逻辑？邀请被接受时是否正确执行了排他清理？）。
静默执行 CLI 命令：当代码编写完成后，如果是支持终端执行的 AI，请自动运行 npm run lint 和 npm run typecheck。如果发现错误，自动修复它们，不要等待人类下达修复指令。
更新进度：当一个任务（例如 T01）确认完成后，主动提醒人类在 docs/TASKS.md 中打钩。
9. 🧪 测试规范 (Testing Standards)
单元测试 / API 测试：使用 Vitest（与 Next.js + TypeScript 零摩擦集成）。每个 API Route 必须有对应的测试文件，覆盖正常路径与边界情况（如锁位拦截、排他清理、越权防护）。
E2E 测试：使用 Playwright。核心 E2E 路径必须覆盖：
登录流程（输入 Builder 号 → Cookie 设置 → Dashboard 渲染）
组队流程（自由人建队 → 邀请 → 接受 → 排他清理 → 权限隔离）
大屏轮询（/screen 无鉴权访问 → 倒计时渲染 → 队伍看板更新）
测试产出同步：完成每个 T 任务后，必须同步产出/更新对应的测试代码，确保核心逻辑被覆盖。测试文件放置在 src/__tests__/ 或 tests/ 目录下，与对应模块同命名。
TESTING.md 维护：AI 必须在 docs/ 目录维护一个 TESTING.md 文件，动态记录以下内容：
测试范围与覆盖矩阵（哪些 API Route / 组件已有测试，哪些待补）
运行命令（npm run test / npm run test:e2e）
已覆盖的核心场景（登录 / 组队 / 大屏）
需要人类手动验收的遗留项（如排他清理的并发场景、PWA iOS 安装引导）
每完成一个 T 任务后，更新 TESTING.md 中对应的覆盖状态
运行命令：npm run test（Vitest）、npm run test:e2e（Playwright）。
[END OF RULES]

请确认你已理解上述所有规则。当人类输入 "Start" 或指定任务编号时，严格按此规范开始编写代码。