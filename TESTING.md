# 🧪 测试文档 (TESTING.md)

## 运行命令

- `npm run test` — Vitest 单元测试
- `npm run test:watch` — Vitest 监听模式
- `npm run lint` — ESLint 检查
- `npm run typecheck` — TypeScript 类型检查
- `npm run build` — 生产构建

## 测试覆盖矩阵

| 模块 | 测试文件 | 状态 |
|------|---------|------|
| mock-db 工具函数 | `src/__tests__/mock-db.test.ts` | ✅ 已覆盖 |
| 组队邀请流程 | `src/__tests__/mock-db.test.ts` | ✅ 已覆盖 |
| 排他清理逻辑 | `src/__tests__/mock-db.test.ts` | ✅ 已覆盖 |
| 离队申请 | `src/__tests__/mock-db.test.ts` | ✅ 已覆盖 |
| API 路由 (auth/team/system) | 待补充 | ⏳ 待 Phase 2 集成测试 |
| E2E 登录流程 | 待补充 | ⏳ 待 Playwright 配置 |
| E2E 组队流程 | 待补充 | ⏳ 待 Playwright 配置 |
| E2E 大屏轮询 | 待补充 | ⏳ 待 Playwright 配置 |

## 已覆盖核心场景

1. ✅ Mock 数据读取与结构验证
2. ✅ 队长邀请 → pendingInvites 追加
3. ✅ 锁位校验 (memberIds + pendingInvites >= 3)
4. ✅ 接受邀请 → 成员加入 + pendingInvites 移除
5. ✅ 排他清理 → 全局遍历移除其他队伍的邀请
6. ✅ 离队申请 → 打异常标记

## 待人类手动验收项

- [ ] 4 个浏览器窗口模拟并发组队（测试 A/B/C/D 剧本）
- [ ] 排他清理的并发场景（两个队长同时邀请同一人）
- [ ] PWA iOS 安装引导（Safari 分享菜单）
- [ ] 大屏轮询 5 秒刷新验证
