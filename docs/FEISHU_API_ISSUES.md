# 飞书 API 对接问题清单

> 对照飞书官方 API 文档（lark-base Skill + llms.txt + lark-cli 验证）逐项确认
> 审查日期：2026-05-20

---

## 问题总览

| 编号 | 严重度 | 问题 | 文件 | 状态 |
|---|---|---|---|---|
| I-01 | P1 | listRecords 接口已标记为历史接口，应迁移至 search | feishu.ts | 待修复 |
| I-02 | P1 | 无分页处理，超过 100 条数据静默截断 | feishu.ts | 待修复 |
| I-03 | P0 | 关联字段(link)写入格式错误 | data-service.ts | 待修复 |
| I-04 | P1 | 关联字段(link)读取格式未解析 | data-service.ts | 待修复 |
| I-05 | P2 | 单选字段读取可能取到对象而非字符串 | data-service.ts | 待修复 |
| I-06 | P2 | updateUser 缺少 name/phone/email/role/bio 字段映射 | data-service.ts | 待修复 |
| I-07 | P1 | 排他清理并发竞态 + N+1 写入问题 | accept/route.ts | 待修复 |
| I-08 | P2 | Cookie 未签名，auth_token 可伪造 | login/route.ts | 待修复 |
| I-09 | P2 | teamId 来自请求体而非用户上下文，有越权风险 | name/slogan/status routes | 待修复 |
| I-10 | P3 | forceDisbandTrigger 无后端处理逻辑 | system/status | 待修复 |
| I-11 | P3 | 队长可申请离队，无队伍善后逻辑 | leave-request/route.ts | 待修复 |
| I-12 | P2 | 成员列表双重维护（逗号文本 + 反向查询），一致性风险 | data-service.ts | 待修复 |

---

## 详细说明

### I-01: listRecords 接口已标记为历史接口 [P1]

**文件**: `src/lib/feishu.ts:75-85`

**现状**: 使用 `GET /open-apis/bitable/v1/apps/:app_token/tables/:table_id/records`

**官方文档原文**:
> 该接口为历史接口，已不推荐使用。你可使用查询记录替代。

**推荐替代**: `POST /open-apis/bitable/v1/apps/:app_token/tables/:table_id/records/search`

**差异对比**:

| 项目 | listRecords（当前） | search（推荐） |
|---|---|---|
| HTTP 方法 | GET | POST |
| filter 位置 | 查询参数 (`?filter=...`) | 请求体 (`{filter: {...}}`) |
| filter 格式 | 公式字符串: `CurrentValue.[Builder号]="111"` | 结构化 JSON: `{conjunction, conditions}` |
| page_size 上限 | 500 | 500 |
| 分页方式 | page_token | page_token |
| 返回结构 | `data.items` | `data.items`（相同） |
| 关联字段返回 | `[{record_ids, table_id, text, type}]` | `{link_record_ids: [...]}`（不同！） |

**影响**: listRecords 目前仍可用，filter 的 `CurrentValue.[Builder号]="111"` 公式语法在 listRecords 中是合法的。但接口已被官方标记废弃，应尽早迁移。

**修复方案**: 新增 `searchRecords` 方法替代 `listRecords`，filter 改为结构化 JSON 格式。注意迁移时需调整关联字段的读取逻辑。

**验证来源**:
- lark-base Skill: `lark-base-data-analysis-sop.md`（查询选路 SOP）
- 飞书官方: `https://open.feishu.cn/document/server-docs/docs/bitable-v1/app-table-record/list.md`
- 飞书官方: `https://open.feishu.cn/document/docs/bitable-v1/app-table-record/search.md`

---

### I-02: 无分页处理，超过 100 条数据静默截断 [P1]

**文件**: `src/lib/feishu.ts:76`

**现状**:
```ts
const params = new URLSearchParams({ page_size: "100" });
// 未处理 has_more 和 page_token
```

**官方文档确认**:
- listRecords: 单次最多返回 500 行，`has_more=true` 时需用 `page_token` 翻页
- search: 同上，单次最多 500 行

**影响**: 用户或队伍超过 100 条时，只返回前 100 条，后续数据丢失。对于 100+ 人的黑客松活动场景，这是实际会触发的问题。

**修复方案**: 循环读取直到 `has_more=false`，或使用 `--page-all` 语义（lark-cli 内置了自动翻页）。

**验证来源**:
- 飞书官方: listRecords 文档 "单次最多列出 500 行记录，支持分页获取"
- 飞书官方: 响应体包含 `has_more`、`page_token`、`total` 字段

---

### I-03: 关联字段(link)写入格式错误 [P0]

**文件**: `src/lib/data-service.ts:59,130-133,155-159`

**现状**: 将关联字段当作纯文本写入
```ts
// updateUser - 所属团队 写为纯文本
fields["所属团队"] = updates.teamId || "";

// createTeam - 队长、成员列表 写为纯文本
fields["队长"] = team.captainId;
fields["成员列表"] = team.memberIds.join(",");
```

**飞书官方 CellValue 规范**（来源: lark-base-cell-value.md）:
```json
// link 字段写入格式: 对象数组，id 为目标记录的 record_id
{
  "关联任务": [{ "id": "<record_id>" }]
}
```

**问题**:
1. PRD 规定 `所属团队` 和 `队长` 为**单向关联字段**，飞书关联字段的值必须是目标表的 `record_id`，不是业务 ID（如 teamId "T-001" 或 builderId "111"）
2. 当前代码写入的是业务 ID 字符串，如果飞书表中这些字段设为关联类型，会触发**字段类型不匹配错误 (1254015 / 1254067)**
3. `成员列表` 存为逗号分隔文本，如果飞书表中该字段是多选或关联类型，同样会失败

**修复方案**:
- 方案 A（推荐）: 如果飞书表中字段类型设为文本，则当前写法可用，但失去了关联字段的自动聚合能力（如 `当前人数` 查找引用无法工作）
- 方案 B: 如果严格按 PRD 使用关联字段，需先 findRecord 获取 record_id，再写入 `[{id: "rec_xxx"}]` 格式

**验证来源**:
- lark-base Skill: `lark-base-cell-value.md` §2.7 link
- lark-base Skill: `lark-base-shortcut-field-properties.md` §3.8 link
- 飞书官方: update 文档请求体示例中关联字段格式

---

### I-04: 关联字段(link)读取格式未解析 [P1]

**文件**: `src/lib/data-service.ts:206-237`

**现状**: mapFeishuUser / mapFeishuTeam 直接 `String(fields["xxx"])`

**飞书官方返回格式**:

listRecords 返回的关联字段:
```json
"单向关联": [{ "record_ids": ["recnVYsuqV"], "table_id": "tblBJyX6jZteblYv", "text": "xxx", "type": "text" }]
```

search 返回的关联字段:
```json
"单向关联": { "link_record_ids": ["recnVYsuqV"] }
```

**问题**:
- 如果 `所属团队` 是关联字段，`fields["所属团队"]` 返回的是上面这种对象/数组，不是纯字符串
- `String(...)` 会得到 `"[object Object]"` 或类似垃圾值
- 必须从 `record_ids` / `link_record_ids` 中提取 record_id，再反向查询业务 ID

**修复方案**: 在 mapFeishuUser / mapFeishuTeam 中增加关联字段的解析逻辑，或确保飞书表中字段类型为文本而非关联。

**验证来源**:
- 飞书官方: listRecords 响应体示例
- 飞书官方: search 响应体示例
- lark-base Skill: `lark-base-data-analysis-sop.md` §2.3 关系查询与回查

---

### I-05: 单选字段读取可能取到对象而非字符串 [P2]

**文件**: `src/lib/data-service.ts:213,235`

**现状**:
```ts
role: (fields["角色"] as UserRole) ?? "ANOMALY",
status: (fields["队伍状态"] as TeamStatus) ?? "头脑风暴中",
```

**飞书官方返回格式**: 单选字段在不同接口中返回格式可能不同：
- listRecords: 可能返回字符串 `"选项1"` 或对象（取决于字段配置）
- search: 通常返回字符串

**风险**: 如果飞书返回的是对象 `{id: "xxx", text: "引航者"}`，则 `as UserRole` 会得到对象而非字符串，后续比较全部失败。

**修复方案**: 统一处理单选字段，提取 text 属性：
```ts
function extractSelectValue(val: unknown): string {
  if (typeof val === "string") return val;
  if (val && typeof val === "object" && "text" in (val as object)) return (val as {text: string}).text;
  return "";
}
```

**验证来源**: 飞书官方 listRecords/search 响应体示例中单选字段格式

---

### I-06: updateUser 缺少字段映射 [P2]

**文件**: `src/lib/data-service.ts:58-62`

**现状**: 仅映射了 `teamId`、`abnormalMark`、`avatar` 三个字段。

**缺失映射**: `name`(姓名)、`phone`(电话)、`email`(邮箱)、`role`(角色)、`bio`(自我介绍)

**影响**: 目前 API 层无修改这些字段的接口，所以不会出运行时错误。但如果未来需要"编辑个人信息"功能，需要补充映射。

**修复方案**: 按需补充字段映射，注意 `role` 是单选字段，写入值为选项名字符串。

---

### I-07: 排他清理并发竞态 + N+1 写入 [P1]

**文件**: `src/app/api/team/invite/accept/route.ts:40-55`

**现状**:
```ts
// 1. 加入队伍（2 次 API 调用）
await updateUser(builderId, { teamId });
await updateTeam(teamId, { memberIds, pendingInvites });

// 2. 排他清理（1 + N 次 API 调用）
const allTeams = await getAllTeams();
for (const otherTeam of allTeams) {
  if (otherTeam.pendingInvites.includes(builderId)) {
    await updateTeam(otherTeam.teamId, { pendingInvites: cleaned });
  }
}
```

**飞书官方约束**（来源: update 文档错误码）:
- `1254291`: 同一个数据表不支持并发调用写接口。写接口包括新增、修改、删除记录
- 排他清理中的循环写操作如果与另一个请求的写操作并发，会触发写冲突

**问题**:
1. 非原子操作：加入队伍和排他清理之间有中间状态
2. N+1 写入：接受一次邀请需要 2 + N 次 API 调用（N = 邀请过该用户的队伍数）
3. 并发竞态：两个用户同时接受不同队伍的邀请时，可能触发 1254291 写冲突

**修复方案**:
- 短期：串行写入 + 批次间延迟 0.5-1 秒（lark-base Skill 建议的写入间隔）
- 长期：使用 `batch_update` 一次批量更新多支队伍，减少 API 调用次数

**验证来源**:
- 飞书官方: update 文档错误码 `1254291`
- lark-base Skill: `SKILL.md` §4.3 并发、分页与批量限制

---

### I-08: Cookie 未签名，auth_token 可伪造 [P2]

**文件**: `src/app/api/auth/login/route.ts:57-61`

**现状**:
```ts
response.cookies.set("auth_token", user.builderId, {
  path: "/",
  httpOnly: true,
  sameSite: "lax",
  maxAge: 60 * 60 * 24,
});
```

**问题**: Cookie 值直接存 `builderId`，没有任何加密或签名。任何知道 builderId 的人都可以手动设置 Cookie 伪造登录。

**影响**: Phase 1 是可接受的简易方案，但应在 Phase 2 切换为 JWT + 签名。

**修复方案**: Phase 2 迁移时使用 JWT 或 HMAC 签名 Cookie。当前阶段加 `secure` 标志（生产环境）即可。

---

### I-09: teamId 来自请求体而非用户上下文 [P2]

**文件**: `src/app/api/team/name/route.ts`、`slogan/route.ts`、`status/route.ts`

**现状**: 这些接口从请求体接收 `teamId`，然后校验 `team.captainId !== builderId`。

**风险**: 虽然 captainId 校验了权限，但设计上应从 `user.teamId` 出发而非请求体。如果用户是队长但不在该队伍（数据不一致），可能越权操作其他队伍。

**修复方案**: 从 `user.teamId` 获取当前用户所在队伍，而非信任请求体的 teamId。

---

### I-10: forceDisbandTrigger 无后端处理逻辑 [P3]

**文件**: `src/app/api/system/status/route.ts`

**现状**: `getSystemConfig()` 读取了 `forceDisbandTrigger` 字段，但没有任何逻辑处理它。

**PRD 要求**: "输入目标团队ID，后端轮询/侦测到后，清空该队所有成员的'所属团队'并删除此记录，实现一键踢人。"

**修复方案**: 需要在 `system/status` 的轮询逻辑中增加 forceDisbandTrigger 的检测和处理。

---

### I-11: 队长可申请离队，无队伍善后逻辑 [P3]

**文件**: `src/app/api/team/leave-request/route.ts`

**现状**: 队长和队员走同样的"申请离队"流程，只打异常标记。没有阻止队长离队或规定队伍善后的逻辑。

**PRD**: 未明确队长离队的处理规则。

**修复方案**: 需与产品确认：队长是否可以离队？如果可以，离队后队伍是否自动解散或转让队长？

---

### I-12: 成员列表双重维护，一致性风险 [P2]

**文件**: `src/lib/data-service.ts:81-84,110-112,130-133`

**现状**: Team 表的 `成员列表` 列存逗号文本（`"111,222,333"`），同时 `getTeamById` 反向查询 User 表 `所属团队` 来填充 `memberIds`。

**问题**:
1. 两个数据源可能不一致（非原子更新导致）
2. `createTeam` 写入 `成员列表` 文本，`getTeamById` 却从 User 表读取，创建后立即查询可能得到不同结果
3. PRD 建议使用单向关联字段自动维护关系，避免双写

**修复方案**: 选择单一数据源：
- 方案 A: 以 User 表的 `所属团队` 为准，Team 表的 `成员列表` 字段废弃或仅作展示（需要时从 User 表聚合）
- 方案 B: 使用飞书双向关联字段，自动双向同步

**验证来源**: lark-base Skill: `lark-base-shortcut-field-properties.md` §3.8 link（双向关联自动同步）

---

## 修复优先级建议

1. **立即修复（阻断飞书模式运行）**:
   - I-03: 关联字段写入格式 → 需先确认飞书表中字段类型是文本还是关联
   - I-02: 分页处理 → 防止数据丢失

2. **短期修复（功能正确性）**:
   - I-01: 迁移到 search 接口（含 filter 格式变更）
   - I-04: 关联字段读取解析
   - I-07: 排他清理并发问题

3. **中期修复（健壮性）**:
   - I-05: 单选字段解析
   - I-06: 补充 updateUser 字段映射
   - I-08: Cookie 安全
   - I-09: 越权防护
   - I-12: 消除双重维护

4. **长期（功能完善）**:
   - I-10: forceDisbandTrigger 实现
   - I-11: 队长离队逻辑
