# 飞书 API 文档查询路径整理

> 本文档整理了所有可用的飞书 API 文档查询方式，按推荐优先级排序。
> 最后更新：2026-05-20

---

## 一、查询方式总览

| 优先级 | 方式 | 适用场景 | 速度 | 覆盖范围 |
|---|---|---|---|---|
| 1 | lark-base AI Skill 本地文档 | 多维表格全部 API（记录/字段/表/视图/工作流等） | 最快 | 91 个 md 文件，覆盖完整 |
| 2 | `lark-cli base <cmd> --help` | 快速查看某个 base 子命令的参数 | 快 | CLI 已封装的命令 |
| 3 | `lark-cli schema <service>` | 查看 API 方法签名、参数、权限 scope | 快 | 仅支持 12 个服务，**不含 base** |
| 4 | `lark-cli api --dry-run` | 验证 API 路径和请求结构，不实际执行 | 快 | 所有 API |
| 5 | 飞书 llms.txt 层级挖掘 | 查找 CLI 未封装的原生 OpenAPI | 慢 | 全量官方文档 |
| 6 | `lark-cli base <cmd>` 实际调用 | 真实验证 API 行为 | 中 | 需要有效 token 和数据 |

---

## 二、各方式详细说明

### 2.1 lark-base AI Skill 本地文档（推荐首选）

**位置**：`~/.agents/skills/lark-base/references/`（91 个 md 文件）

**安装方式**：`npx skills add larksuite/cli -g -y`

**核心文档索引**：

| 文档文件 | 内容 |
|---|---|
| `SKILL.md` | 总导航，模块地图，执行规则 |
| `lark-base-cell-value.md` | **各字段类型的 CellValue 写入格式**（必读） |
| `lark-base-shortcut-field-properties.md` | **字段创建/更新的 JSON 规范**（必读） |
| `lark-base-record.md` | 记录命令索引 |
| `lark-base-record-upsert.md` | 创建/更新记录（API 路径: v3） |
| `lark-base-record-batch-create.md` | 批量创建 |
| `lark-base-record-batch-update.md` | 批量更新 |
| `lark-base-record-delete.md` | 删除记录 |
| `lark-base-data-analysis-sop.md` | 查询选路、分页、聚合 SOP |
| `lark-base-field.md` | 字段命令索引 |
| `lark-base-field-create.md` | 创建字段 |
| `lark-base-field-update.md` | 更新字段 |
| `lark-base-field-list.md` | 列出字段 |
| `lark-base-table.md` | 数据表命令索引 |
| `lark-base-table-create.md` | 创建数据表 |
| `lark-base-view.md` | 视图命令索引 |
| `lark-base-view-set-filter.md` | 视图筛选配置 |
| `lark-base-workflow.md` | 工作流命令索引 |
| `lark-base-dashboard.md` | 仪表盘命令索引 |
| `lark-base-form.md` | 表单命令索引 |
| `formula-field-guide.md` | 公式字段完整指南 |
| `lookup-field-guide.md` | 查找引用字段指南 |
| `examples.md` | 串联操作完整示例 |

**使用方式**：
```bash
# 直接读取
cat ~/.agents/skills/lark-base/references/lark-base-cell-value.md
# 或在 Claude Code 中通过 lark-base skill 自动引用
```

---

### 2.2 `lark-cli base <cmd> --help`

快速查看某个 base 子命令的参数和用法。

```bash
lark-cli base --help                    # 查看所有 base 子命令
lark-cli base +record-list --help       # 查看记录列表参数
lark-cli base +field-create --help      # 查看字段创建参数
lark-cli base +record-upsert --help     # 查看记录创建/更新参数
lark-cli base +table-create --help      # 查看建表参数
```

---

### 2.3 `lark-cli schema <service>`

查看 API 方法签名、HTTP 方法、参数类型、权限 scope。

**已支持的服务（12 个）**：
| 服务 | Base Path | 说明 |
|---|---|---|
| `approval` | `/open-apis/approval/v4` | 审批 |
| `attendance` | `/open-apis/attendance/v1` | 考勤 |
| `calendar` | `/open-apis/calendar/v4` | 日历 |
| `drive` | `/open-apis/drive/v1` | 云空间/文件 |
| `im` | `/open-apis/im/v1` | 消息/群聊 |
| `mail` | `/open-apis/mail/v1` | 邮箱 |
| `minutes` | `/open-apis/minutes/v1` | 妙记 |
| `okr` | `/open-apis/okr/v1` | OKR |
| `sheets` | `/open-apis/sheets/v3` | 电子表格 |
| `slides` | `/open-apis/slides/v1` | 幻灯片 |
| `task` | `/open-apis/task/v2` | 任务 |
| `vc` | `/open-apis/vc/v1` | 视频会议 |
| `wiki` | `/open-apis/wiki/v2` | 知识库 |

**不支持的服务**：`base`（多维表格）、`contact`（通讯录）

**用法**：
```bash
# 列出服务下所有资源和方法
lark-cli schema im --format pretty

# 查看具体资源的所有方法
lark-cli schema im.messages --format pretty

# 查看具体方法的完整参数（路径参数、查询参数、请求体、权限 scope）
lark-cli schema im.messages.delete --format pretty
```

---

### 2.4 `lark-cli api --dry-run`

验证 API 路径、HTTP 方法和请求结构，不实际执行。对所有 API 通用。

```bash
# 验证 GET 请求结构
lark-cli api --dry-run GET "/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/records" \
  --params '{"page_size":100,"filter":"test"}'

# 验证 POST 请求结构
lark-cli api --dry-run POST "/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/records" \
  --data '{"fields":{"姓名":"测试"}}'

# 验证 PUT 请求结构
lark-cli api --dry-run PUT "/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/records/{record_id}" \
  --data '{"fields":{"姓名":"更新"}}'

# 验证 DELETE 请求结构
lark-cli api --dry-run DELETE "/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/records/{record_id}"
```

---

### 2.5 飞书 llms.txt 层级挖掘

通过飞书官方的 `llms.txt` 逐层检索原生 OpenAPI 文档。

**入口 URL**：
- 飞书：`https://open.feishu.cn/llms.txt`
- Lark（国际版）：`https://open.larksuite.com/llms.txt`

**挖掘步骤**：

```
Step 1: 获取顶层索引
  fetch https://open.feishu.cn/llms.txt
  → 找到模块文档链接（如 llms-docs.txt）

Step 2: 获取模块文档
  fetch https://open.feishu.cn/llms-docs/zh-CN/llms-docs.txt
  → 找到具体 API 链接

Step 3: 获取 API 完整规范
  fetch https://open.feishu.cn/document/server-docs/docs/bitable-v1/app-table-record/update.md
  → 提取 HTTP 方法、参数、响应、错误码
```

**本项目相关的模块文档链接**：
| 模块 | URL | 包含内容 |
|---|---|---|
| 云文档 | `https://open.feishu.cn/llms-docs/zh-CN/llms-docs.txt` | 多维表格、电子表格、文档、知识库 |
| 通讯录 | `https://open.feishu.cn/llms-docs/zh-CN/llms-contacts.txt` | 用户查询 |
| 认证授权 | `https://open.feishu.cn/llms-docs/zh-CN/llms-authenticate-and-authorize.txt` | Token 获取 |

**注意**：飞书开放平台是 SPA，直接 `curl` 或 `WebFetch` 页面 URL 拿不到渲染内容，必须使用 `.md` 文档链接。

---

### 2.6 `lark-cli base <cmd>` 实际调用

需要有效的 token 和目标多维表格。用于真实验证 API 行为。

```bash
# 列出数据表
lark-cli base +table-list --base-token <app_token>

# 列出字段（确认字段类型）
lark-cli base +field-list --base-token <app_token> --table-id <table_id>

# 列出记录
lark-cli base +record-list --base-token <app_token> --table-id <table_id> --limit 5

# 按条件筛选记录
lark-cli base +record-list --base-token <app_token> --table-id <table_id> \
  --filter '{"conjunction":"and","conditions":[{"field_name":"Builder号","operator":"is","value":["111"]}]}'

# 创建记录
lark-cli base +record-upsert --base-token <app_token> --table-id <table_id> \
  --json '{"队名":"测试队","队伍状态":"头脑风暴中"}'

# 更新记录
lark-cli base +record-upsert --base-token <app_token> --table-id <table_id> \
  --record-id <record_id> --json '{"队名":"新队名"}'
```

---

## 三、本项目用到的飞书 API 清单

### 3.1 认证

| API | HTTP | 路径 | 用途 | 文档查询方式 |
|---|---|---|---|---|
| 获取 tenant_access_token | POST | `/open-apis/auth/v3/tenant_access_token/internal` | 应用身份认证 | llms.txt → authenticate-and-authorize |

### 3.2 多维表格记录

| API | HTTP | 路径 | 用途 | 文档查询方式 |
|---|---|---|---|---|
| 列出记录 | GET | `/open-apis/bitable/v1/apps/:app_token/tables/:table_id/records` | 查询用户/队伍/系统 | lark-base Skill + `--help` |
| 获取记录 | GET | `/open-apis/bitable/v1/apps/:app_token/tables/:table_id/records/:record_id` | 按 ID 获取单条 | 同上 |
| 创建记录 | POST | `/open-apis/bitable/v1/apps/:app_token/tables/:table_id/records` | 创建队伍 | 同上 |
| 更新记录 | PUT | `/open-apis/bitable/v1/apps/:app_token/tables/:table_id/records/:record_id` | 更新用户/队伍 | 同上 |
| 删除记录 | DELETE | `/open-apis/bitable/v1/apps/:app_token/tables/:table_id/records/:record_id` | 删除记录 | 同上 |

**v3 API 路径（lark-cli shortcut 使用）**：
- 创建：`POST /open-apis/base/v3/bases/:base_token/tables/:table_id/records`
- 更新：`PATCH /open-apis/base/v3/bases/:base_token/tables/:table_id/records/:record_id`

> v1 (bitable) 和 v3 (base) 是同一套 API 的两个入口，目前均可用。v3 是新版路径。

### 3.3 筛选参数格式（关键）

**正确格式**（飞书官方规范）：
```json
{
  "filter": {
    "conjunction": "and",
    "conditions": [
      {
        "field_name": "Builder号",
        "operator": "is",
        "value": ["111"]
      }
    ]
  }
}
```

**常用 operator**：
| operator | 含义 | 适用字段 |
|---|---|---|
| `is` | 等于 | 文本/数字/单选/日期 |
| `isNot` | 不等于 | 文本/数字/单选 |
| `contains` | 包含 | 文本 |
| `isEmpty` | 为空 | 所有 |
| `isNotEmpty` | 不为空 | 所有 |
| `isGreater` | 大于 | 数字/日期 |
| `isLess` | 小于 | 数字/日期 |

### 3.4 CellValue 写入格式（关键）

| 字段类型 | 写入格式 | 示例 |
|---|---|---|
| 文本 | 字符串 | `"Hello"` |
| 数字 | JSON number | `100` |
| 单选 | 选项名字符串 | `"引航者"` |
| 多选 | 选项名数组 | `["后端", "高优"]` |
| 日期 | 毫秒时间戳 或 `YYYY-MM-DD HH:mm:ss` | `1674206443000` 或 `"2026-05-20 17:00:00"` |
| 人员 | 对象数组 | `[{"id": "ou_xxx"}]` |
| 关联(link) | 对象数组(record_id) | `[{"id": "rec_xxx"}]` |
| 复选框 | boolean | `true` |
| 附件 | **不能用普通写入**，需用 `+record-upload-attachment` | 专用链路 |

**只读字段（不可写入）**：`formula`、`lookup`、`auto_number`、`created_at`、`updated_at`、`created_by`、`updated_by`

---

## 四、常用查询速查表

| 我想查... | 最快方式 |
|---|---|
| 多维表格记录怎么读写 | `cat ~/.agents/skills/lark-base/references/lark-base-cell-value.md` |
| 字段创建/更新 JSON 格式 | `cat ~/.agents/skills/lark-base/references/lark-base-shortcut-field-properties.md` |
| filter 筛选参数怎么写 | `cat ~/.agents/skills/lark-base/references/lark-base-data-analysis-sop.md` |
| 消息 API 参数签名 | `lark-cli schema im.messages.delete --format pretty` |
| 日历 API 方法列表 | `lark-cli schema calendar --format pretty` |
| 某个 API 路径是否正确 | `lark-cli api --dry-run <METHOD> <PATH>` |
| 实际操作多维表格 | `lark-cli base +<cmd> --base-token xxx --table-id yyy` |
| 查找未封装的原生 API | llms.txt 层级挖掘（见 2.5 节） |
| 某个字段支持哪些选项 | `lark-cli base +field-search-options --base-token xxx --table-id yyy --field-name "角色"` |

---

## 五、注意事项

1. **`lark-cli schema` 不支持 `base`**：多维表格的 API 规范只能通过 Skill 文档或 llms.txt 获取
2. **`lark-cli schema` 也不支持 `contact`**：通讯录 API 需通过 llms.txt 查询
3. **飞书开放平台网页是 SPA**：直接 fetch 页面 URL 拿不到内容，必须用 `.md` 文档链接
4. **v1 vs v3 路径**：`/open-apis/bitable/v1/...` 和 `/open-apis/base/v3/...` 是同一套 API 的两个入口，目前均可用
5. **Token 有效期**：user token 约 2 小时，refresh token 约 7 天，过期需重新 `lark-cli auth login`
