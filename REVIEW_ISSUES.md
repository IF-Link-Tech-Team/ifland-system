# IF.Land 项目审查问题清单

> 审查日期: 2026-05-20
> 审查范围: 全项目代码 (11 个 API 路由, 3 个页面, 核心组件)
> 验证状态: typecheck / lint / vitest 全部通过

---

## P0 - 必须修复 (影响功能正确性或安全性)

### 1. 渲染期间执行副作用 — 违反 React 规范

**文件**: `src/contexts/auth-context.tsx:44-47`

```tsx
// 当前代码（在组件渲染函数体内直接执行）
if (!initialized) {
  setInitialized(true);
  refreshUser().finally(() => setLoading(false));
}
```

**问题**: 在渲染期间调用异步函数和 setState，React 18+ Strict Mode 下会导致双重执行。Next.js 开发模式默认开启 Strict Mode，组件会 unmount/remount，导致 `initialized` 状态重置，`refreshUser` 被调用两次。

**文件**: `src/app/dashboard/page.tsx:47-55`

```tsx
// 同样的问题
if (dataLoading && authUser) {
  fetchDashboardData().then((data) => { ... });
}
```

**修复方案**: 将两处都改为 `useEffect`。

```tsx
// auth-context.tsx
useEffect(() => {
  refreshUser().finally(() => setLoading(false));
}, []);

// dashboard/page.tsx
useEffect(() => {
  if (authUser) {
    fetchDashboardData().then((data) => {
      if (data) { setTeam(data.team); setAllUsers(data.allUsers); }
      setDataLoading(false);
    });
  }
}, [authUser]);
```

---

### 2. `/api/team/my` 泄露全场用户隐私数据

**文件**: `src/app/api/team/my/route.ts:23-32`

```tsx
const allUsers = await getAllUsers();

return NextResponse.json({
  ok: true,
  data: { user, team, allUsers },  // 返回了全场用户的完整信息
});
```

**问题**: 该接口返回所有用户的完整数据（包含 phone、email、bio）。任何登录用户都可以通过此接口获取全场参与者的联系方式和隐私信息。

**修复方案**: 只返回当前队伍的成员信息，而非全场用户。

```tsx
// 只查询当前队伍的成员
const teamMembers = team
  ? await getAllUsers().then(users =>
      users.filter(u => team.memberIds.includes(u.builderId))
    )
  : [];

return NextResponse.json({
  ok: true,
  data: { user, team, teamMembers },
});
```

---

### 3. 飞书模式 `memberIds` 始终为空 — Phase 2 阻断

**文件**: `src/lib/data-service.ts:192-206`

```tsx
function mapFeishuTeam(fields: Record<string, unknown>): Team {
  return {
    // ...
    memberIds: [], // 需要通过关联查询补充 — 从未实现
    // ...
  };
}
```

**问题**: 飞书模式下，所有队伍的 `memberIds` 永远为空数组，导致队伍面板显示 0 人、锁位校验失效、邀请逻辑无法正常工作。

**修复方案**: 在飞书模式中，通过"队长"字段 + 反向查询"所属团队"字段来重建 `memberIds`。或者在设计飞书多维表格时增加"成员列表"字段（逗号分隔），与 `pendingInvites` 采用相同策略。

---

### 4. `updateTeam` 未映射 `memberIds` 字段 — Phase 2 阻断

**文件**: `src/lib/data-service.ts:114-135`

```tsx
export async function updateTeam(teamId: string, updates: Partial<Team>): Promise<boolean> {
  // ...飞书模式
  const fields: Record<string, unknown> = {};
  if (updates.name !== undefined) fields["队名"] = updates.name;
  if (updates.slogan !== undefined) fields["一句话宣言"] = updates.slogan;
  if (updates.pendingInvites !== undefined) fields["受邀名单 (pendingInvites)"] = updates.pendingInvites.join(",");
  if (updates.status !== undefined) fields["队伍状态"] = updates.status;
  // 缺少: if (updates.memberIds !== undefined) fields["成员列表"] = updates.memberIds.join(",");

  await feishu.updateRecord(TABLE_TEAMS(), record.recordId, fields);
  return true;
}
```

**问题**: 当玩家接受邀请后，`invite/accept` 路由调用 `updateTeam(teamId, { memberIds: [...], pendingInvites: [...] })`，但 `updateTeam` 的飞书分支没有映射 `memberIds`，导致新成员的加入无法持久化到飞书。

**修复方案**: 补充 `memberIds` 的飞书字段映射。如果飞书表格中增加"成员列表"字段：

```tsx
if (updates.memberIds !== undefined) fields["成员列表"] = updates.memberIds.join(",");
```

---

## P1 - 应该修复 (功能缺陷或显著代码质量问题)

### 5. 登录响应数据不完整 + 违反规范"避免额外调用"

**文件**: `src/app/api/auth/login/route.ts:32-37` + `src/contexts/auth-context.tsx:63-85`

**问题有两层**:

1. **规范要求**: AGENTS.md §2.1 明确写道 "Response Body 必须返回完整的用户信息，以便前端一次性写入 React Context，**避免登录后额外调用 /api/user/me**"。但当前登录接口只返回 `{ builderId, name, role, teamId }`，缺少 `phone, email, avatar, bio, abnormalMark`。

2. **降级风险**: `auth-context.tsx:74` 在 `/api/user/me` 失败时构造了一个空字段填充的 User 对象（phone=""、avatar="" 等），用户会看到不完整的个人信息。

**修复方案**: 扩大登录接口的返回数据：

```tsx
// login/route.ts
const response = NextResponse.json({
  builderId: user.builderId,
  name: user.name,
  phone: user.phone,
  email: user.email,
  avatar: user.avatar,
  role: user.role,
  bio: user.bio,
  teamId: user.teamId,
  abnormalMark: user.abnormalMark,
});
```

同时更新 `LoginResponse` 类型，并让 `auth-context.tsx` 在登录成功后直接用返回数据写入 Context，不再调用 `/api/user/me`。

---

### 6. 邀请列表不自动刷新

**文件**: `src/components/dashboard/invite-list.tsx`

**问题**: 邀请列表仅在组件挂载时获取一次 (`useEffect` 初始加载)。如果用户 A 正在 Dashboard 页面，用户 B 此时向 A 发送邀请，A 不会看到新邀请，除非手动刷新页面。

**修复方案**: 添加轮询或由父组件的 `handleDataRefresh` 驱动刷新。最简方案是增加 `useEffect` 轮询（与 RedBanner 的 10 秒轮询一致）：

```tsx
useEffect(() => {
  let cancelled = false;
  const load = () => fetchInvites().then(d => { if (!cancelled) setInvites(d); });
  load();
  const interval = setInterval(load, 10000);
  return () => { cancelled = true; clearInterval(interval); };
}, []);
```

---

### 7. `invite/accept` 中不必要的直接变异

**文件**: `src/app/api/team/invite/accept/route.ts:64`

```tsx
team.memberIds.push(builderId);  // 直接变异从 getTeamById 返回的对象
```

**问题**: 在 Mock 模式下，`getTeamById` 每次都从文件重新解析 JSON，返回的是新对象，所以变异实际上不影响后续 `updateTeam` 的正确性（因为 `updateTeam` 传入了正确的值）。但这是一种不良实践，且在 Feishu 模式下容易引起误解。

**修复方案**: 用不可变方式构造新数组：

```tsx
const newMemberIds = [...team.memberIds, builderId];
const newPendingInvites = team.pendingInvites.filter((id) => id !== builderId);
await updateTeam(teamId, { memberIds: newMemberIds, pendingInvites: newPendingInvites });
```

---

## P2 - 建议修复 (代码质量与可维护性)

### 8. Mock 延迟逻辑重复 11 次

**涉及文件**: `src/app/api/` 下所有 11 个路由文件

每个路由文件都包含相同的模式：

```tsx
const MOCK_DELAY = 300;
if (process.env.USE_FEISHU !== "true") {
  await new Promise((r) => setTimeout(r, MOCK_DELAY));
}
```

**修复方案**: 提取为共享工具函数：

```tsx
// src/lib/mock-delay.ts
export async function withMockDelay(ms = 300): Promise<void> {
  if (process.env.USE_FEISHU !== "true") {
    await new Promise((r) => setTimeout(r, ms));
  }
}
```

---

### 9. 测试文件重复实现了 mock-db 工具函数

**文件**: `src/__tests__/mock-db.test.ts:9-15`

```tsx
function readMockData(): MockData {
  return JSON.parse(fs.readFileSync(MOCK_PATH, "utf-8"));
}
function writeMockData(data: MockData): void {
  fs.writeFileSync(MOCK_PATH, JSON.stringify(data, null, 2), "utf-8");
}
```

**问题**: `src/lib/mock-db.ts` 已导出 `readMockData` 和 `writeMockData`，测试文件又重新实现了一遍。

**修复方案**: 直接从 `@/lib/mock-db` 导入。

---

### 10. 飞书 `findRecord` 中 `record_id` 的类型安全

**文件**: `src/lib/feishu.ts:152`

```tsx
recordId: record.record_id as string,
```

**问题**: `record` 的类型是 `Record<string, unknown>`，`record_id` 可能为 `undefined`，强制 `as string` 会在运行时出错。

**修复方案**: 添加空值检查：

```tsx
recordId: (record.record_id as string) ?? "",
```

或更好的方式是为飞书 API 返回值定义 interface。

---

### 11. 未使用的导出函数

**文件**: `src/lib/feishu.ts`

`clearTokenCache()` (行 186) 和 `clearSystemStatusCache()` (行 181) 已导出但全项目无任何调用。

**修复方案**: 删除或保留但添加注释说明用途（如手动调试时使用）。

---

### 12. `screen/page.tsx` 中重复定义类型

**文件**: `src/app/screen/page.tsx:9-27`

```tsx
interface SystemStatus { ... }
interface TeamInfo { ... }
```

**问题**: 这两个接口与 API 返回的数据结构一致，但未放在 `src/types/index.ts` 中共享，导致后续修改可能遗漏。

**修复方案**: 移至 `src/types/index.ts`，其他文件统一导入。

---

### 13. TeamPanel 的 key 属性过于复杂

**文件**: `src/app/dashboard/page.tsx:109`

```tsx
key={team.teamId + team.name + team.slogan + team.status + team.memberIds.join(",") + team.pendingInvites.join(",")}
```

**问题**: 用多个字段拼接作为 `key`，意图是在数据变化时强制重新挂载组件。这违反了 React 的 `key` 使用语义，且 `join(",")` 在成员 Builder 号含逗号时可能出错。

**修复方案**: 如果需要在数据变化时重置组件内部状态，使用 `useEffect` 监听 `team` 变化来重置 state，而不是依赖 `key` 强制卸载/重挂载。

---

## P3 - 缺失的测试 (规范要求但未实现)

### 14. API 路由无集成测试

**现状**: 11 个 API 路由均无对应测试文件。仅 `mock-db` 工具函数有 8 个测试用例。

**规范要求**: AGENTS.md §9 要求 "每个 API Route 必须有对应的测试文件，覆盖正常路径与边界情况"。

**需要覆盖的 API 路由**:
- `POST /api/auth/login` — 正常登录、不存在 Builder 号、空输入
- `GET /api/user/me` — 已登录、未登录
- `POST /api/team/invite` — 自由人创建队伍+邀请、队长邀请、锁位拦截、邀请自己、邀请已入队者
- `POST /api/team/invite/accept` — 正常接受、已入队时接受、排他清理
- `POST /api/team/invite/reject` — 正常拒绝
- `PUT /api/team/name` — 队长修改、非队长越权
- `PUT /api/team/slogan` — 队长修改、非队长越权
- `PUT /api/team/status` — 队长切换、无效状态值
- `POST /api/team/leave-request` — 正常申请、重复申请

---

### 15. 无 E2E 测试

**现状**: 无任何 Playwright 测试文件。

**规范要求**: AGENTS.md §9 要求覆盖三条核心 E2E 路径：
1. 登录流程（输入 Builder 号 → Cookie 设置 → Dashboard 渲染）
2. 组队流程（自由人建队 → 邀请 → 接受 → 排他清理 → 权限隔离）
3. 大屏轮询（/screen 无鉴权访问 → 倒计时渲染 → 队伍看板更新）

---

## 已验证为误报的问题

### ~~PWA 构建文件已提交到 Git~~

`.gitignore` 已包含 `public/sw.js` 和 `public/workbox-*.js`，`git ls-files` 确认这些文件未被跟踪。**不存在此问题。**

---

## 优先级总结

| 优先级 | 数量 | 说明 |
|--------|------|------|
| P0 必须修复 | 4 | #1 渲染副作用, #2 数据泄露, #3 飞书memberIds空, #4 updateTeam缺映射 |
| P1 应该修复 | 3 | #5 登录数据不完整, #6 邀请不刷新, #7 不必要的变异 |
| P2 建议修复 | 6 | #8-#13 代码质量 |
| P3 缺失测试 | 2 | #14 API测试, #15 E2E测试 |

**建议执行顺序**: P0 → P1 → P3 → P2
