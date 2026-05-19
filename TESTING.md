# 🧪 测试文档 (TESTING.md)

## 运行命令

- `npm run test` — Vitest 单元测试
- `npm run test:watch` — Vitest 监听模式
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
| API 路由集成 | 手动验收 (Mock 模式) | ✅ Phase 1 闭环 |
| 飞书 API 集成 | 需配置 .env.local | ⏳ 待人类配置后验证 |
| 头像上传 | 手动验收 | ✅ Phase 1 本地直存 |
| PWA 安装 | 手动验收 | ✅ Android/iOS 双端 |

## 已覆盖核心场景

1. ✅ Mock 数据读取与结构验证
2. ✅ 队长邀请 → pendingInvites 追加
3. ✅ 锁位校验 (memberIds + pendingInvites >= 3)
4. ✅ 接受邀请 → 成员加入 + pendingInvites 移除
5. ✅ 排他清理 → 全局遍历移除其他队伍的邀请
6. ✅ 离队申请 → 打异常标记
7. ✅ lint / typecheck / build 全部通过

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
- [ ] 飞书 API 集成验证 (配置 .env.local 后)
- [ ] TOS 头像上传验证 (配置 TOS 环境变量后)
