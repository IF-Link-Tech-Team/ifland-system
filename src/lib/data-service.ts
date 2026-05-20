/**
 * 数据服务层 - 统一数据访问接口
 * 根据 USE_FEISHU 环境变量决定使用飞书 API 还是本地 Mock 数据
 *
 * Phase 1 (Mock): 读写 mock_data.json
 * Phase 2 (飞书): 读写飞书多维表格
 */

import { readMockData, writeMockData, findUserById, findTeamById, generateNextTeamId } from "./mock-db";
import * as feishu from "./feishu";
import type { User, Team, SystemConfig, UserRole, TeamStatus } from "@/types";

const USE_FEISHU = () => process.env.USE_FEISHU === "true";

const TABLE_USERS = () => process.env.FEISHU_TABLE_ID_USERS ?? "";
const TABLE_TEAMS = () => process.env.FEISHU_TABLE_ID_TEAMS ?? "";
const TABLE_SYSTEM = () => process.env.FEISHU_TABLE_ID_SYSTEM ?? "";

// ==================== 辅助函数：字段解析 ====================

/**
 * 解析文本字段值
 * 飞书 search API 返回格式多样：纯字符串 / {text,type} 对象 / [{text,type}] 数组
 */
function extractTextValue(val: unknown): string {
  if (!val) return "";
  if (typeof val === "string") return val;
  // 单个 {text, type} 对象
  if (typeof val === "object" && !Array.isArray(val) && "text" in (val as object)) {
    return (val as { text: string }).text;
  }
  // 数组格式: [{text: "xxx", type: "text"}, ...]
  if (Array.isArray(val)) {
    return val
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "text" in item) return (item as { text: string }).text;
        return "";
      })
      .filter(Boolean)
      .join("");
  }
  return String(val);
}

/** 解析单选字段值（处理字符串或对象格式） */
function extractSelectValue(val: unknown): string {
  if (typeof val === "string") return val;
  if (val && typeof val === "object" && "text" in (val as object)) {
    return (val as { text: string }).text;
  }
  return extractTextValue(val);
}

/**
 * 从关联字段返回格式中提取 record_id 列表
 * 支持：文本回退 / listRecords 数组格式 / search 对象格式
 */
function extractLinkRecordIds(val: unknown): string[] {
  if (!val) return [];
  // 文本字段回退（直接存业务 ID 或 record_id）
  if (typeof val === "string") return val ? [val] : [];
  // listRecords 格式: [{ record_ids: [...], table_id: "...", text: "..." }]
  if (Array.isArray(val)) {
    const ids: string[] = [];
    for (const item of val) {
      if (typeof item === "object" && item !== null && "record_ids" in item) {
        ids.push(...(item as { record_ids: string[] }).record_ids);
      } else if (typeof item === "string") {
        ids.push(item);
      }
    }
    return ids;
  }
  // search 格式: { link_record_ids: [...] } — 注意飞书可能返回 null
  if (typeof val === "object" && val !== null && "link_record_ids" in val) {
    const ids = (val as { link_record_ids: string[] | null }).link_record_ids;
    return Array.isArray(ids) ? ids : [];
  }
  return [];
}

/** 解析 pendingInvites（逗号分隔文本 / 字符串数组 / 飞书文本数组） */
function parsePendingInvites(val: unknown): string[] {
  // 飞书 search API 可能返回 [{text, type}] 数组格式
  const text = extractTextValue(val);
  if (text) {
    return text.split(",").map((s) => s.trim()).filter(Boolean);
  }
  if (Array.isArray(val)) {
    return val.map(String).filter(Boolean);
  }
  return [];
}

/** 构造关联字段写入值 */
function makeLinkValue(recordId: string | null): unknown {
  if (!recordId) return null; // 清空
  // 飞书单向关联字段写入格式: ["record_id"]
  return [recordId];
}

// ==================== 辅助函数：record_id 查找 ====================

/** 查找用户的 record_id（用于关联字段写入） */
async function findUserRecordId(builderId: string): Promise<string | null> {
  const record = await feishu.findRecord(TABLE_USERS(), `CurrentValue.[Builder号]="${builderId}"`);
  return record?.recordId ?? null;
}

/** 查找团队的 record_id（用于关联字段写入） */
async function findTeamRecordId(teamId: string): Promise<string | null> {
  const record = await feishu.findRecord(TABLE_TEAMS(), `CurrentValue.[团队ID]="${teamId}"`);
  return record?.recordId ?? null;
}

// ==================== 辅助函数：字段映射 ====================

function mapFeishuUser(fields: Record<string, unknown>, teamId: string | null): User {
  return {
    builderId: extractTextValue(fields["Builder号"]),
    name: extractTextValue(fields["姓名"]),
    phone: extractTextValue(fields["电话"]),
    email: extractTextValue(fields["邮箱"]),
    avatar: extractTextValue(fields["头像"]),
    role: (extractSelectValue(fields["角色"]) as UserRole) || "ANOMALY",
    bio: extractTextValue(fields["自我介绍"]),
    teamId,
    abnormalMark: extractTextValue(fields["异常标记"]) || null,
  };
}

function mapFeishuTeam(
  fields: Record<string, unknown>,
  captainId: string,
  memberIds: string[]
): Team {
  return {
    teamId: extractTextValue(fields["团队ID"]),
    name: extractTextValue(fields["队名"]),
    slogan: extractTextValue(fields["一句话宣言"]),
    captainId,
    memberIds,
    pendingInvites: parsePendingInvites(fields["受邀名单 (pendingInvites)"]),
    status: (extractSelectValue(fields["队伍状态"]) as TeamStatus) || "头脑风暴中",
    abnormalMark: extractTextValue(fields["异常标记"]) || null,
  };
}

// ==================== 用户相关 ====================

/** 根据 Builder 号获取用户 */
export async function getUserByBuilderId(builderId: string): Promise<User | null> {
  if (!USE_FEISHU()) {
    const data = readMockData();
    return findUserById(data, builderId);
  }

  const record = await feishu.findRecord(TABLE_USERS(), `CurrentValue.[Builder号]="${builderId}"`);
  if (!record) return null;

  const fields = record.fields;
  const linkIds = extractLinkRecordIds(fields["所属团队"]);
  let teamId: string | null = null;
  if (linkIds.length > 0) {
    const teamRecord = await feishu.getRecord(TABLE_TEAMS(), linkIds[0]);
    if (teamRecord) {
      const tf = teamRecord.fields as Record<string, unknown>;
      teamId = extractTextValue(tf["团队ID"]) || null;
    }
  }

  return mapFeishuUser(fields, teamId);
}

/** 获取全部用户 */
export async function getAllUsers(): Promise<User[]> {
  if (!USE_FEISHU()) {
    return readMockData().users;
  }

  const [userRecords, teamRecords] = await Promise.all([
    feishu.searchRecords(TABLE_USERS()),
    feishu.searchRecords(TABLE_TEAMS()),
  ]);

  // 构建 team record_id → teamId 映射
  const teamMap = new Map<string, string>();
  for (const tr of teamRecords) {
    const recId = String(tr.record_id ?? "");
    const tid = extractTextValue((tr.fields as Record<string, unknown>)["团队ID"]);
    if (recId && tid) teamMap.set(recId, tid);
  }

  return userRecords.map((ur) => {
    const fields = ur.fields as Record<string, unknown>;
    const linkIds = extractLinkRecordIds(fields["所属团队"]);
    const teamId = linkIds.length > 0 ? teamMap.get(linkIds[0]) ?? null : null;
    return mapFeishuUser(fields, teamId);
  });
}

/** 更新用户信息 */
export async function updateUser(builderId: string, updates: Partial<User>): Promise<boolean> {
  if (!USE_FEISHU()) {
    const data = readMockData();
    const user = findUserById(data, builderId);
    if (!user) return false;
    Object.assign(user, updates);
    writeMockData(data);
    return true;
  }

  const record = await feishu.findRecord(TABLE_USERS(), `CurrentValue.[Builder号]="${builderId}"`);
  if (!record) return false;

  const fields: Record<string, unknown> = {};

  if (updates.teamId !== undefined) {
    if (updates.teamId) {
      const teamRecordId = await findTeamRecordId(updates.teamId);
      if (!teamRecordId) return false;
      fields["所属团队"] = makeLinkValue(teamRecordId);
    } else {
      fields["所属团队"] = null; // 清空关联
    }
  }

  if (updates.abnormalMark !== undefined) fields["异常标记"] = updates.abnormalMark || "";
  if (updates.avatar !== undefined) fields["头像"] = updates.avatar;
  if (updates.name !== undefined) fields["姓名"] = updates.name;
  if (updates.phone !== undefined) fields["电话"] = updates.phone;
  if (updates.email !== undefined) fields["邮箱"] = updates.email;
  if (updates.role !== undefined) fields["角色"] = updates.role;
  if (updates.bio !== undefined) fields["自我介绍"] = updates.bio;

  await feishu.updateRecord(TABLE_USERS(), record.recordId, fields);
  return true;
}

// ==================== 团队相关 ====================

/** 根据团队 ID 获取团队 */
export async function getTeamById(teamId: string): Promise<Team | null> {
  if (!USE_FEISHU()) {
    const data = readMockData();
    return findTeamById(data, teamId);
  }

  const record = await feishu.findRecord(TABLE_TEAMS(), `CurrentValue.[团队ID]="${teamId}"`);
  if (!record) return null;

  const teamRecId = record.recordId;
  const teamFields = record.fields;

  // 获取所有用户，反向查询成员 + 解析队长
  const userRecords = await feishu.searchRecords(TABLE_USERS());
  const memberIds: string[] = [];
  const userMap = new Map<string, string>(); // record_id → builderId

  for (const ur of userRecords) {
    const fields = ur.fields as Record<string, unknown>;
    const recId = String(ur.record_id ?? "");
    const bid = extractTextValue(fields["Builder号"]);
    if (recId && bid) userMap.set(recId, bid);

    const userTeamLinks = extractLinkRecordIds(fields["所属团队"]);
    if (userTeamLinks.includes(teamRecId) && bid) {
      memberIds.push(bid);
    }
  }

  const captainLinkIds = extractLinkRecordIds(teamFields["队长"]);
  const captainId = captainLinkIds.length > 0 ? userMap.get(captainLinkIds[0]) ?? "" : "";

  return mapFeishuTeam(teamFields, captainId, memberIds);
}

/** 获取全部团队 */
export async function getAllTeams(): Promise<Team[]> {
  if (!USE_FEISHU()) {
    return readMockData().teams;
  }

  const [teamRecords, userRecords] = await Promise.all([
    feishu.searchRecords(TABLE_TEAMS()),
    feishu.searchRecords(TABLE_USERS()),
  ]);

  // 构建 user record_id → builderId 映射
  const userMap = new Map<string, string>();
  for (const ur of userRecords) {
    const recId = String(ur.record_id ?? "");
    const bid = extractTextValue((ur.fields as Record<string, unknown>)["Builder号"]);
    if (recId && bid) userMap.set(recId, bid);
  }

  // 按 team record_id 分组成员
  const membersByTeamRecId = new Map<string, string[]>();

  for (const ur of userRecords) {
    const fields = ur.fields as Record<string, unknown>;
    const bid = extractTextValue(fields["Builder号"]);
    const teamLinks = extractLinkRecordIds(fields["所属团队"]);
    for (const teamRecId of teamLinks) {
      const list = membersByTeamRecId.get(teamRecId) ?? [];
      if (bid) list.push(bid);
      membersByTeamRecId.set(teamRecId, list);
    }
  }

  return teamRecords.map((tr) => {
    const fields = tr.fields as Record<string, unknown>;
    const teamRecId = String(tr.record_id ?? "");
    const captainLinkIds = extractLinkRecordIds(fields["队长"]);
    const captainId = captainLinkIds.length > 0 ? userMap.get(captainLinkIds[0]) ?? "" : "";

    return mapFeishuTeam(fields, captainId, membersByTeamRecId.get(teamRecId) ?? []);
  });
}

/** 创建新团队 */
export async function createTeam(team: Team): Promise<Team | null> {
  if (!USE_FEISHU()) {
    const data = readMockData();
    data.teams.push(team);
    writeMockData(data);
    return team;
  }

  // 查找队长的 record_id（关联字段写入需要）
  const captainRecordId = await findUserRecordId(team.captainId);
  if (!captainRecordId) return null;

  const fields: Record<string, unknown> = {
    "团队ID": team.teamId,
    "队名": team.name,
    "一句话宣言": team.slogan,
    "队长": makeLinkValue(captainRecordId),
    "受邀名单 (pendingInvites)": team.pendingInvites.length > 0
      ? team.pendingInvites.join(",")
      : "",
    "队伍状态": team.status,
  };

  const result = await feishu.createRecord(TABLE_TEAMS(), fields);
  return result ? team : null;
}

/** 更新团队信息 */
export async function updateTeam(teamId: string, updates: Partial<Team>): Promise<boolean> {
  if (!USE_FEISHU()) {
    const data = readMockData();
    const team = findTeamById(data, teamId);
    if (!team) return false;
    Object.assign(team, updates);
    writeMockData(data);
    return true;
  }

  const record = await feishu.findRecord(TABLE_TEAMS(), `CurrentValue.[团队ID]="${teamId}"`);
  if (!record) return false;

  const fields: Record<string, unknown> = {};
  if (updates.name !== undefined) fields["队名"] = updates.name;
  if (updates.slogan !== undefined) fields["一句话宣言"] = updates.slogan;
  if (updates.pendingInvites !== undefined) {
    // 同时支持文本字段（逗号分隔）和多选字段（数组）
    fields["受邀名单 (pendingInvites)"] = updates.pendingInvites.length > 0
      ? updates.pendingInvites.join(",")
      : "";
  }
  if (updates.status !== undefined) fields["队伍状态"] = updates.status;
  if (updates.captainId !== undefined) {
    const captainRecordId = await findUserRecordId(updates.captainId);
    if (captainRecordId) {
      fields["队长"] = makeLinkValue(captainRecordId);
    }
  }

  await feishu.updateRecord(TABLE_TEAMS(), record.recordId, fields);
  return true;
}

// ==================== 系统配置相关 ====================

/** 获取系统配置 */
export async function getSystemConfig(): Promise<SystemConfig> {
  if (!USE_FEISHU()) {
    return readMockData().system;
  }

  const fields = await feishu.getSystemStatus(TABLE_SYSTEM());
  if (!fields) {
    return { marqueeNotice: "", endTime: "", forceDisbandTrigger: null };
  }

  return {
    marqueeNotice: extractTextValue(fields["全局跑马灯通知"]),
    endTime: extractTextValue(fields["比赛结束时间"]),
    forceDisbandTrigger: extractTextValue(fields["强制解散触发"]) || null,
  };
}

// ==================== 辅助函数 ====================

/** 删除团队 */
export async function deleteTeam(teamId: string): Promise<boolean> {
  if (!USE_FEISHU()) {
    const data = readMockData();
    const idx = data.teams.findIndex((t) => t.teamId === teamId);
    if (idx === -1) return false;
    data.teams.splice(idx, 1);
    writeMockData(data);
    return true;
  }

  const record = await feishu.findRecord(TABLE_TEAMS(), `CurrentValue.[团队ID]="${teamId}"`);
  if (!record) return false;

  return await feishu.deleteRecord(TABLE_TEAMS(), record.recordId);
}

/** 更新系统配置 */
export async function updateSystemConfig(updates: Partial<SystemConfig>): Promise<boolean> {
  if (!USE_FEISHU()) {
    const data = readMockData();
    Object.assign(data.system, updates);
    writeMockData(data);
    return true;
  }

  const records = await feishu.searchRecords(TABLE_SYSTEM());
  if (records.length === 0) return false;

  const recordId = String(records[0].record_id ?? "");
  if (!recordId) return false;

  const fields: Record<string, unknown> = {};
  if (updates.marqueeNotice !== undefined) fields["全局跑马灯通知"] = updates.marqueeNotice;
  if (updates.endTime !== undefined) fields["比赛结束时间"] = updates.endTime;
  if (updates.forceDisbandTrigger !== undefined) fields["强制解散触发"] = updates.forceDisbandTrigger;

  await feishu.updateRecord(TABLE_SYSTEM(), recordId, fields);
  return true;
}

/** 生成下一个团队 ID */
export async function getNextTeamId(): Promise<string> {
  if (!USE_FEISHU()) {
    const data = readMockData();
    return generateNextTeamId(data);
  }

  const teams = await getAllTeams();
  if (teams.length === 0) return "T-001";
  const nums = teams.map((t) => {
    const m = t.teamId.match(/T-(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  });
  const max = Math.max(...nums);
  return `T-${String(max + 1).padStart(3, "0")}`;
}
