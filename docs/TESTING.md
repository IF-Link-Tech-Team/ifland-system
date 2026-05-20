# 🧪 测试文档 (TESTING.md)

## 运行命令

- `npm run test` — Vitest 单元测试 + API 集成测试
- `npm run test:watch` — Vitest 监听模式
- `npm run test:e2e` — Playwright E2E 测试
- `npm run lint` — ESLint 检查
- `npm run typecheck` — TypeScript 类型检查
- `npm run build` — 生产构建 (webpack, 含 PWA)

## 测试覆盖矩阵

| 模块 | 测试文件 | 状态 |
|------|---------|------|
| mock-db 工具函数 | `src/__tests__/mock-db.test.ts` | ✅ 已覆盖 |
| 组队邀请流程 | `src/__tests__/mock-db.test.ts` | ✅ 已覆盖 |
| 排他清理逻辑 | `src/__tests__/mock-db.test.ts` | ✅ 已覆盖 |
| 离队申请 | `src/__tests__/mock-db.test.ts` | ✅ 已覆盖 |
| POST /api/auth/login | `src/__tests__/api/auth.test.ts` | ✅ 已覆盖 |
| DELETE /api/auth/login | `src/__tests__/api/auth.test.ts` | ✅ 已覆盖 |
| GET /api/user/me | `src/__tests__/api/user-and-team-my.test.ts` | ✅ 已覆盖 |
| GET /api/team/my | `src/__tests__/api/user-and-team-my.test.ts` | ✅ 已覆盖 |
| POST /api/team/invite | `src/__tests__/api/team-invite.test.ts` | ✅ 已覆盖 |
| POST /api/team/invite/accept | `src/__tests__/api/team-invite.test.ts` | ✅ 已覆盖 |
| POST /api/team/invite/reject | `src/__tests__/api/team-invite.test.ts` | ✅ 已覆盖 |
| GET /api/team/invites/received | `src/__tests__/api/team-invite.test.ts` | ✅ 已覆盖 |
| PUT /api/team/name | `src/__tests__/api/team-manage.test.ts` | ✅ 已覆盖 |
| PUT /api/team/slogan | `src/__tests__/api/team-manage.test.ts` | ✅ 已覆盖 |
| PUT /api/team/status | `src/__tests__/api/team-manage.test.ts` | ✅ 已覆盖 |
| POST /api/team/leave-request | `src/__tests__/api/team-manage.test.ts` | ✅ 已覆盖 |
| GET /api/system/status | `src/__tests__/api/screen.test.ts` | ✅ 已覆盖 |
| GET /api/screen/teams | `src/__tests__/api/screen.test.ts` | ✅ 已覆盖 |
| E2E: 登录流程 | `e2e/login.spec.ts` | ✅ 已覆盖 |
| E2E: 组队流程 | `e2e/team.spec.ts` | ✅ 已覆盖 |
| E2E: 大屏轮询 | `e2e/screen.spec.ts` | ✅ 已覆盖 |
| 飞书 API 集成 | 需配置 .env | ✅ 已联调验证通过 (2026-05-20) |
| 头像上传 | 手动验收 | ✅ Phase 1 本地直存 |
| PWA 安装 | 手动验收 | ✅ Android/iOS 双端 |

## 已覆盖核心场景

### 单元测试 (Vitest, 55 tests)
1. ✅ Mock 数据读取与结构验证
2. ✅ 队长邀请 → pendingInvites 追加
3. ✅ 锁位校验 (memberIds + pendingInvites >= 3)
4. ✅ 接受邀请 → 成员加入 + pendingInvites 移除
5. ✅ 排他清理 → 全局遍历移除其他队伍的邀请
6. ✅ 离队申请 → 打异常标记

### API 集成测试 (Vitest, 覆盖 13 个路由)
7. ✅ 登录: 有效/无效 Builder 号、Cookie 设置、退出清除
8. ✅ 鉴权: 未登录 401、有效 Cookie 200
9. ✅ /api/team/my: 数据泄漏修复（仅返回队友）
10. ✅ 邀请: 自邀请/目标不存在/已入队/非队长/满员/重复/自动建队
11. ✅ 接受邀请: 未收到/已入队/满员/排他清理
12. ✅ 拒绝邀请: 未收到/成功移除
13. ✅ 修改队名/宣言/状态: 非队长 403/参数校验/成功修改
14. ✅ 离队申请: 未入队/重复/队长拦截 403/队员成功
15. ✅ 大屏接口: 系统状态/队伍列表/DiceBear 默认头像
16. ✅ 强制解散触发: system/status 轮询检测并执行解散

### E2E 测试 (Playwright, 5 tests)
16. ✅ 登录流程: 输入 Builder 号 → Cookie → Dashboard 渲染
17. ✅ 登录错误: 无效 Builder 号显示错误
18. ✅ 组队: 队长邀请自由人
19. ✅ 自由人: 看到 Dashboard
20. ✅ 大屏: 无鉴权访问 → 倒计时 → 队伍看板

### 飞书连接修复 (2026-05-20)
21. ✅ search API 迁移: listRecords → searchRecords (I-01)
22. ✅ 分页处理: 自动翻页直到 has_more=false (I-02)
23. ✅ 关联字段写入: `[{id: "rec_xxx"}]` 格式 + record_id 查找 (I-03)
24. ✅ 关联字段读取: 解析 record_ids / link_record_ids (I-04)
25. ✅ 单选字段解析: 处理字符串和对象两种格式 (I-05)
26. ✅ updateUser 字段映射: 补充 name/phone/email/role/bio (I-06)
27. ✅ 排他清理并发: 串行写入 + 500ms 批次延迟 (I-07)
28. ✅ Cookie 安全: 生产环境启用 secure 标志 (I-08)
29. ✅ teamId 来源: name/slogan/status 路由使用 user.teamId (I-09)
30. ✅ forceDisbandTrigger: system/status 轮询检测并执行解散 (I-10)
31. ✅ 队长离队拦截: leave-request 返回 403 (I-11)
32. ✅ 成员列表单一数据源: 以 User 表所属团队为准 (I-12)

### 静态检查
33. ✅ lint: 0 errors, 0 warnings
34. ✅ typecheck: 通过
35. ✅ build: 成功

## 环境变量

| 变量 | 用途 | 阶段 |
|------|------|------|
| `USE_FEISHU` | `true` 切换飞书模式 | Phase 2 |
| `FEISHU_APP_ID` | 飞书应用 ID | Phase 2 |
| `FEISHU_APP_SECRET` | 飞书应用密钥 | Phase 2 |
| `FEISHU_BASE_APP_TOKEN` | 多维表格 App Token | Phase 2 |
| `FEISHU_TABLE_ID_USERS` | 用户表 Table ID | Phase 2 |
| `FEISHU_TABLE_ID_TEAMS` | 团队表 Table ID | Phase 2 |
| `FEISHU_TABLE_ID_SYSTEM` | 系统控制台 Table ID | Phase 2 |
| `TOS_AK` | 火山 TOS Access Key | Phase 2 (头像) |
| `TOS_SK` | 火山 TOS Secret Key | Phase 2 (头像) |
| `TOS_REGION` | 火山 TOS 区域 | Phase 2 (头像) |
| `TOS_BUCKET` | 火山 TOS 存储桶 | Phase 2 (头像) |

## 待人类手动验收项

- [ ] 4 个浏览器窗口模拟并发组队（测试 A/B/C/D 剧本）
- [ ] 排他清理的并发场景（两个队长同时邀请同一人）
- [ ] PWA iOS 安装引导（Safari 分享菜单）
- [ ] 大屏轮询 5 秒刷新验证
- [x] 飞书 API 集成验证 (2026-05-20 已通过)
- [ ] TOS 头像上传验证 (配置 TOS 环境变量后)

## 飞书联调修复记录 (2026-05-20)

- ✅ Base + 3 表创建: 用户表 / 团队表 / 系统控制台
- ✅ 字段类型: 文本 / 单选 / 单向关联 / 长文本
- ✅ 关联字段写入格式: `["record_id"]` 而非 `[{id: "record_id"}]`
- ✅ 文本字段解析: search API 返回 `[{text, type}]` 格式, 新增 `extractTextValue()`
- ✅ 关联字段读取: `{link_record_ids: null}` → 返回空数组
- ✅ 登录 → 建队 → 邀请 → 接受 → 查询 全链路通过
