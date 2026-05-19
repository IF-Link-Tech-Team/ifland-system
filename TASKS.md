# 📋 黑客松现场系统 - 开发施工工单 (TASKS.md)

> **致 AI IDE 的执行指令：**
> 1. 请严格按照从上到下、从 T01 到 T10 的顺序执行任务。
> 2. 不要一次性跨越多个任务编写代码，每完成一个子项，请更新本文件中的复选框 `[x]`。
> 3. 当遇到 `[✋ 人类交互点]` 时，**必须立即暂停编码**，在聊天框中向人类汇报当前进度，并等待人类的指令、确认或测试结果后，方可继续下一个任务。
> 4. **全局测试约束**：完成每个 T 任务后，必须同步产出/更新对应的测试代码（Vitest 单元测试 + Playwright E2E 测试），确保核心逻辑被覆盖。同时在项目根目录维护 `TESTING.md`，动态记录测试范围、已覆盖场景与待验收项。详见 `AGENTS.md` §9。

---

## 🟢 阶段一：项目骨架与本地 Mock 闭环 (Phase 1)

### T01: 项目初始化与基础设施搭建

- [ ] 使用 `npx create-next-app@latest . --force` 初始化 Next.js (App Router, TypeScript, Tailwind) 项目（在当前目录初始化，如遇文件冲突优先保留已有的 markdown 文档）。
- [ ] 初始化 `shadcn/ui`，并安装常用的基础组件 (Button, Input, Card, Toast, Dialog/Modal)。
- [ ] 在全局样式中配置暗黑赛博朋克主题 (Dark Mode by default)。
- [ ] 创建 `src/mocks/mock_data.json`，严格遵循 `PRD_and_Data.md` 第 12 节的扁平化结构，预置 4 个测试用户 (Builder 号: `111`, `222`, `333`, `444`) 和 2 个测试队伍。
  - 用户 `111`：`teamId: "T-001"`（T-001 队长）
  - 用户 `222`：`teamId: null`（自由人）
  - 用户 `333`：`teamId: null`（自由人）
  - 用户 `444`：`teamId: "T-002"`（T-002 队长）
  - 测试队伍 `T-001`：`captainId: "111"`，`memberIds: ["111"]`，`pendingInvites: []`
  - 测试队伍 `T-002`：`captainId: "444"`，`memberIds: ["444"]`，`pendingInvites: []`
- [ ] **[✋ 人类交互点 - T01 验收 Checklist]**

  **请人类确认以下内容：**
  - [ ] `localhost:3000` 是否成功运行，页面是否呈现暗黑赛博朋克主题？
  - [ ] Shadcn UI 组件 (Button, Input, Card, Toast) 是否正常渲染无报错？
  - [ ] `mock_data.json` 中 4 个用户 + 2 个队伍的 JSON 结构是否符合扁平化规范（无深层嵌套）？
  - [ ] 如需预览主题色或组件库，请现在告知 AI。

---

### T02: 测试期极简登录模块

- [ ] 编写前端页面 `/login`，仅包含一个输入框 (Builder 号) 和登录按钮。
- [ ] 编写中转后端 API `POST /api/auth/login`，读取 `mock_data.json` 校验 Builder 号是否存在于 users 数组中。严格遵循 AGENTS.md §2.1 的 Cookie Auth 方案，实现 `Set-Cookie: auth_token={builderId}; HttpOnly` 并在 Response Body 返回完整用户信息 `{ builderId, name, role, teamId }`。
- [ ] 登录成功后，将用户信息存入 React Context（包含 builderId, name, teamId 等字段），并跳转至 `/dashboard`。
- [ ] 登录失败需触发 Toast 报错提示。

---

### T03: 用户个人大厅 (Dashboard) - 基础信息渲染

- [ ] 编写 `/dashboard` 页面骨架，适配移动端竖屏，使用 Tailwind `md:` 前缀预留大屏样式。
- [ ] 开发"个人名片"组件，从 Context 中读取并展示：头像（空则调用 DiceBear `api.dicebear.com/7.x/initials/svg?seed={builderId}`）、Builder 号、姓名、电话、角色标签、自我介绍。
- [ ] 开发"邀请列表"组件，调用 `GET /api/team/invites/received`，展示当前收到的所有邀请（每个邀请显示发送方队名和队长姓名），提供"同意"和"拒绝"两个操作按钮。
- [ ] 开发顶部小红条组件 (Red Banner)，调用 `GET /api/system/status` 获取 `marqueeNotice`，有值时显示红色滚动横幅，无值时隐藏。
- [ ] 增加一个"小房子"图标按钮，点击通过 `window.open('/screen', '_blank')` 在新标签页打开大屏页面。
- [ ] **[✋ 人类交互点 - T03 验收 Checklist]**

  **请人类在本地浏览器打开 `localhost:3000`，用 Builder 号 `222`（自由人）登录后确认：**
  - [ ] Dashboard 个人信息展示是否完整（头像、Builder号、姓名、电话、角色、简介）？
  - [ ] 头像是否为 DiceBear 自动生成的默认头像（因为 mock 数据中头像字段为空）？
  - [ ] 邀请列表组件是否正常渲染（当前无邀请，列表应为空状态）？
  - [ ] 小红条（目前应为空）是否正常隐藏？
  - [ ] 小房子图标按钮点击后是否成功在 new tab 打开 `/screen`？

---

### T04: 核心逻辑 - 组队事务与团队面板 (重点)

#### 4.1 Dashboard 组队区 — 互斥展示条件

- [ ] 在 `/dashboard` 中，根据当前用户的组队状态，展示以下**互斥的两组 UI**之一：

  - **条件 A — 自由人模式**（`teamId === null`）：展示**"自由人发起组队"**输入框组件。用户输入目标 Builder 号后调用 `POST /api/team/invite`，后端自动创建新队伍（默认队名"新建队伍"），将发起人设为 `captainId` 并加入 `memberIds`，同时将目标用户加入 `pendingInvites`。发起人的 `teamId` 更新为新队伍 ID。输入框提示文字："输入 Builder 号发起组队"。

  - **条件 B — 团队面板模式**（`teamId !== null`）：隐藏自由人组队框，展示团队面板组件（按列渲染队友信息、队名、宣言、队伍状态）。**仅在以下子条件成立时**，在团队面板**内部**额外展示**"邀请队员"**输入框：`captainId === 当前用户.builderId && memberIds.length + pendingInvites.length < 3`。普通队员**绝不展示**邀请输入框。输入框提示文字："输入 Builder 号邀请入队"。
- [ ] 编写 `POST /api/team/invite`（入参 `{ targetBuilderId }`）：
  - 校验目标 Builder 号是否存在且 `teamId === null`。
  - **若发起人 `teamId === null`**：后端自动创建新队伍（teamId 采用"现有最大编号的数字后缀 + 1"规则生成，默认队名"新建队伍"，captainId = 发起人 builderId,memberIds = [发起人 builderId],pendingInvites = [目标 builderId]），更新发起人的 teamId。
  - **若发起人已是队长**：直接在对应团队的 `pendingInvites` 数组中追加目标 Builder 号。
  - **锁位校验**：`memberIds.length + pendingInvites.length >= 3` 时，返回错误，禁止发送邀请。
  - 前端实时禁用"发送邀请"按钮（当锁位条件满足时）。
- [ ] 队长发送邀请后，实时更新 pendingInvites 状态。

#### 4.2 已组队状态 - 团队面板与权限控制

- [ ] 如果 `teamId !== null`，隐藏组队输入框，展示"团队面板"组件（按列渲染队友信息）。
- [ ] 仅当当前用户是队长 (`captainId === currentUser.builderId`) 时，展示以下控件：
  - 修改队名输入框（调用 `PUT /api/team/name`）。
  - 修改宣言输入框（调用 `PUT /api/team/slogan`）。
  - 三个进度状态切换按钮：头脑风暴中 / 开发中 / Demo提交（调用 `PUT /api/team/status`）。
- [ ] 非队长看不到上述修改控件，但能看到团队面板的只读展示。

#### 4.3 被邀请方 - 同意 / 拒绝邀请

- [ ] 在 Dashboard 展示邀请列表后，实现"同意"按钮逻辑：调用 `POST /api/team/invite/accept`（入参 `{ teamId }`）。
- [ ] 实现"拒绝"按钮逻辑：调用 `POST /api/team/invite/reject`（入参 `{ teamId }`）。
- [ ] `POST /api/team/invite/accept` 的后端逻辑（严格遵循 PRD_and_Data.md 第 11 节）：
  - 将当前用户的 `teamId` 更新为目标团队 ID。
  - 将目标团队的 `memberIds` 中追加当前用户。
  - 将目标团队的 `pendingInvites` 中移除当前用户。
  - **排他清理**：全局遍历所有团队的 `pendingInvites`，将当前用户从中剔除（即使其他队伍的邀请失效）。
- [ ] `POST /api/team/invite/reject` 的后端逻辑：
  - 只需将目标团队的 `pendingInvites` 中移除当前用户，释放坑位。

#### 4.4 离队申请

- [ ] 队员（非队长）展示"申请离队"按钮。
- [ ] 点击后调用 `POST /api/team/leave-request`。
- [ ] 前端按钮文字瞬间变为"已申请离队（等待管理员处理）"，并设为 Disabled，无需弹窗确认。
- [ ] 管理员在飞书多维表格中处理异常标记后，前端恢复"未组队"状态。

- [ ] **[✋ 人类交互点 - T04 验收 Checklist]**

  **请人类用四个浏览器无痕窗口分别用 `111`（队长）、`222`（自由人）、`333`（自由人）、`444`（T-002 队长）账号登录，执行以下测试：**

  *测试 A — 队长邀请 + 双向确认流程：*
  - [ ] 111（T-001 队长）登录后，Dashboard 显示团队面板（队伍 T-001，成员仅自己），且面板内**能看到"邀请队员"输入框**。
  - [ ] 111 输入 `222` 发送邀请后，T-001 的 `pendingInvites` 变为 `["222"]`。
  - [ ] 222 登录后，Dashboard 顶部显示来自 T-001（选手甲）的邀请卡片，提供"同意"和"拒绝"按钮。
  - [ ] 222 点击"同意"，222 加入 T-001：`memberIds` 变为 `["111", "222"]`，T-001 的 `pendingInvites` 中移除 `222`。
  - [ ] 222 的 Dashboard 立即刷新，显示已加入 T-001 的团队面板，**此时无队长控件**（因为 222 是队员，不是队长）。
  - [ ] 222 **不再**是自由人，不能再作为被邀请方出现。

  *测试 B 剧本（排他逻辑）*：使用 111 邀请 333；同时使用 444（T-002队长）也邀请 333。此时 333 登录，看到两个队伍的邀请。333 选择接受 T-001。系统需将 333 加入 T-001，并全局遍历，将 333 从 T-002 的 `pendingInvites` 中彻底移除。
  - [ ] 111（T-001 队长）邀请 333（T-001 的 `pendingInvites` 追加 `333`）。
  - [ ] 444（T-002 队长）也邀请 333（T-002 的 `pendingInvites` 追加 `333`）。此时 333 **同时收到两个队伍邀请**。
  - [ ] 333 登录，看到来自 T-001 和 T-002 的两张邀请卡片。
  - [ ] 333 选择接受 T-001 的邀请。
  - [ ] **排他验收**：333 成功加入 T-001。系统**全局遍历**所有其他队伍的 `pendingInvites`，将 333 从 T-002 的 `pendingInvites` 中彻底移除，T-002 的坑位释放。此操作**不影响 T-001 中其他的 pending invite**（如果有的话）。
  - [ ] 444（T-002 队长）登录后，发现自己的"邀请队员"输入框恢复可用（因为坑位释放了）。

  *测试 C — 队长权限：*
  - [ ] 111（队长）能看到并操作修改队名、修改宣言、状态切换按钮。
  - [ ] 222（队员）**看不到**上述修改控件。

  *测试 D — 离队申请：*
  - [ ] 222 点击"申请离队"后，按钮立即变为"已申请离队（等待管理员处理）"并 Disabled，无弹窗。

  **注：自动化测试（Vitest/Playwright）在执行每一个独立 Test Case 前，必须包含 Setup 逻辑，将 `mock_data.json` 恢复至初始干净状态，严防用例间的状态污染。**

  **以上全部通过后，方可继续下一个任务。**

---

### T05: 大屏页面与全局状态轮询

- [ ] 编写 `/screen` 大屏专供页面（适配 PC 宽屏，**无需登录**），使用 Tailwind `lg:` 前缀。
- [ ] 页面顶部：滚动跑马灯横幅（`GET /api/system/status` 的 `marqueeNotice`），清空时横幅消失。
- [ ] 页面中央：倒计时时钟组件，读取 `GET /api/system/status` 的 `endTime`，计算并实时显示剩余时间。
- [ ] 页面下方：全场队伍状态看板，调用 `GET /api/screen/teams`，按状态分组展示所有队伍（队名、宣言、人数、当前状态）。
- [ ] 编写轮询逻辑：使用 `setInterval`，每 5 秒请求一次 `GET /api/system/status` 和 `GET /api/screen/teams`。
- [ ] **[✋ 人类交互点 - T05 验收 Checklist]**

  **请人类直接访问 `localhost:3000/screen`（无需登录），确认：**
  - [ ] 页面是否正常渲染，无需登录即可访问（鉴权豁免）？
  - [ ] 倒计时时钟是否正常显示（剩余时间是否正确计算）？
  - [ ] 队伍看板是否展示 T-001 的完整信息（队名、宣言、队长、状态）？
  - [ ] 手动在 `mock_data.json` 中将 `system.marqueeNotice` 改为任意文字（如"距离提交还有 30 分钟"），页面是否在 5 秒内出现滚动横幅？

  **告知人类："本地 Mock 闭环已全部开发完成，请进行全流程体验。确认无误后，我们将进入对接真实飞书和云存储的阶段二。"**

---

## 🟡 阶段二：打通真实基建 (Phase 2)

### T06: 飞书多维表格 API 对接

- [ ] 在代码库 `src/lib/feishu.ts` 中封装飞书 API 调用的 Service 层（使用 `fetch`），处理 App Access Token 的获取与自动刷新缓存。
- [ ] 将 `TASKS.md` 中所有 API 路由的实现，从"读写 `mock_data.json`"切换为"调用飞书 Service"。
- [ ] 飞书侧的"单向关联"字段，通过飞书 API 的记录关联接口处理（不必在 JSON 侧维护）。
- [ ] 在中转后端增加简单的内存缓存（针对 `GET /api/system/status` 进行限流保护，避免每次轮询都请求飞书）。
- [ ] 在 `.env.example` 中提前写入以下飞书基建环境变量（不含真实值），供人类填写：
  - `FEISHU_APP_ID`
  - `FEISHU_APP_SECRET`
  - `FEISHU_BASE_APP_TOKEN`（飞书多维表格的 App Token，从表格 URL 中提取）
  - `FEISHU_TABLE_ID_USERS`（用户表的 Table ID）
  - `FEISHU_TABLE_ID_TEAMS`（团队表的 Table ID）
  - `FEISHU_TABLE_ID_SYSTEM`（系统控制台的 Table ID）
- [ ] **[✋ 人类交互点 - T06 验收 Checklist]**

  **请人类执行以下操作：**
  - [ ] 在项目根目录创建 `.env.local`，填入真实的 `FEISHU_APP_ID`、`FEISHU_APP_SECRET`。
  - [ ] **前往飞书多维表格后台**，从表格 URL 中提取 `FEISHU_BASE_APP_TOKEN`（格式如 `https://feishu.cn/base/Bxxxxxxxx` 中的 `Bxxxxxxxx` 部分）。
  - [ ] 在飞书多维表格中，分别进入用户表、团队表、系统控制台的设置页，获取各自的 `TABLE_ID`（格式如 `tblxxxxxxxxxxxx`），填入 `.env.local` 对应的 `FEISHU_TABLE_ID_USERS`、`FEISHU_TABLE_ID_TEAMS`、`FEISHU_TABLE_ID_SYSTEM`。
  - [ ] 确认所有 6 个环境变量已填写完毕后告知 AI，AI 将运行本地集成测试。
  - [ ] AI 测试完成后，人类在飞书多维表格中手动添加一个用户/修改一条数据，验证 Dashboard 是否正确读取飞书数据。

---

### T07: 火山 TOS 头像上传集成

- [ ] 引入火山引擎 TOS SDK (`@volcengine/tos-sdk` 或原生 fetch）。
- [ ] 编写 `POST /api/upload/avatar` 路由，接收前端传来的图片 `multipart/form-data`。
- [ ] 使用 SDK 将图片流传至 TOS Bucket，获取公开访问 URL。
- [ ] 调用飞书 API，将返回的 TOS URL 更新至当前用户的头像字段。
- [ ] **[✋ 人类交互点 - T07 验收 Checklist]**

  **请人类执行以下操作：**
  - [ ] 在 `.env.local` 中补充火山 TOS 的 `TOS_AK`、`TOS_SK`、`TOS_REGION`、`TOS_BUCKET`。
  - [ ] 确认后告知 AI，AI 将在 Dashboard 中临时开放头像上传入口。
  - [ ] 人类上传一张真实图片，验证 TOS URL 是否成功返回，飞书表格中的头像 URL 是否正确更新。

---

## 🔴 阶段三：云端部署与 PWA 交付 (Phase 3)

### T08: PWA 与多平台适配补全

- [ ] 安装并配置 `next-pwa` 插件（`@ducanh2912/next-pwa`，Next.js 14+ 兼容版）。
- [ ] 生成应用图标并放置于 `public/icons` 目录下，编写 `public/manifest.json`（包含 name, short_name, icons, start_url, display 等字段）。
- [ ] 在 Dashboard 增加 PWA 安装按钮（调用 `beforeinstallprompt` 事件）。
- [ ] 增加设备嗅探逻辑：
  - 安卓 / 鸿蒙：监听 `beforeinstallprompt` 事件，直接触发系统级安装弹窗。
  - iOS (Safari)：点击后弹出 UI 引导蒙层，提示用户手动操作。

### T09: 生产环境变量与构建准备

- [ ] 整理项目中所有的环境变量（`.env.local` 中的所有 key），输出一份干净的 `public/.env.example`（不含真实值）。
- [ ] 运行 `npm run typecheck` 和 `npm run build`，确保在生产模式下构建成功无报错。
- [ ] **[✋ 人类交互点 - T09 验收 Checklist]**

  **请人类执行以下操作：**
  - [ ] 确认 `.env.example` 已生成，内容是否包含所有需要的环境变量名（FEISHU_APP_ID, FEISHU_APP_SECRET, TOS_AK, TOS_SK, TOS_REGION, TOS_BUCKET）？
  - [ ] `npm run build` 是否成功完成，无 TypeScript 错误？
  - [ ] 前往火山引擎 IGA Pages 控制台，关联 GitHub 仓库，将 `.env.example` 中的变量填入控制台环境变量设置。
  - [ ] 部署完成后，点击生成的公网域名，在真机上测试：手机浏览器（iOS Safari / Android Chrome）、电脑浏览器、大屏访问 `/screen`。

### T10: 项目交付与最终验收

- [ ] 清理代码中的无用注释和冗余依赖。
- [ ] 任务全部完成，祝黑客松现场活动圆满成功！
