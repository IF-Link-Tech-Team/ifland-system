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

// ==================== 用户相关 ====================

/** 根据 Builder 号获取用户 */
export async function getUserByBuilderId(builderId: string): Promise<User | null> {
  if (!USE_FEISHU()) {
    const data = readMockData();
    return findUserById(data, builderId);
  }

  // 飞书模式：通过 Builder号 字段筛选
  const record = await feishu.findRecord(TABLE_USERS(), `CurrentValue.[Builder号]="${builderId}"`);
  if (!record) return null;
  return mapFeishuUser(record.fields);
}

/** 获取全部用户 */
export async function getAllUsers(): Promise<User[]> {
  if (!USE_FEISHU()) {
    return readMockData().users;
  }

  const records = await feishu.listRecords(TABLE_USERS());
  return records.map((r) => mapFeishuUser(r.fields as Record<string, unknown>));
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
  if (updates.teamId !== undefined) fields["所属团队"] = updates.teamId || "";
  if (updates.abnormalMark !== undefined) fields["异常标记"] = updates.abnormalMark || "";
  if (updates.avatar !== undefined) fields["头像"] = updates.avatar;

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
  const team = mapFeishuTeam(record.fields);

  // 飞书模式：通过"所属团队"字段反向查询成员
  const memberRecords = await feishu.listRecords(TABLE_USERS(), `CurrentValue.[所属团队]="${teamId}"`);
  team.memberIds = memberRecords.map((r) => String((r.fields as Record<string, unknown>)["Builder号"] ?? ""));

  return team;
}

/** 获取全部团队 */
export async function getAllTeams(): Promise<Team[]> {
  if (!USE_FEISHU()) {
    return readMockData().teams;
  }

  const records = await feishu.listRecords(TABLE_TEAMS());
  const teams = records.map((r) => mapFeishuTeam(r.fields as Record<string, unknown>));

  // 批量查询所有用户，按所属团队分组，填充 memberIds
  const allUserRecords = await feishu.listRecords(TABLE_USERS());
  const usersByTeam = new Map<string, string[]>();
  for (const ur of allUserRecords) {
    const fields = ur.fields as Record<string, unknown>;
    const userTeamId = String(fields["所属团队"] ?? "");
    const builderId = String(fields["Builder号"] ?? "");
    if (userTeamId && builderId) {
      const list = usersByTeam.get(userTeamId) ?? [];
      list.push(builderId);
      usersByTeam.set(userTeamId, list);
    }
  }

  for (const team of teams) {
    team.memberIds = usersByTeam.get(team.teamId) ?? [];
  }

  return teams;
}

/** 创建新团队 */
export async function createTeam(team: Team): Promise<Team | null> {
  if (!USE_FEISHU()) {
    const data = readMockData();
    data.teams.push(team);
    writeMockData(data);
    return team;
  }

  const fields = {
    "团队ID": team.teamId,
    "队名": team.name,
    "一句话宣言": team.slogan,
    "队长": team.captainId,
    "成员列表": team.memberIds.join(","),
    "受邀名单 (pendingInvites)": team.pendingInvites.join(","),
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
  if (updates.memberIds !== undefined) fields["成员列表"] = updates.memberIds.join(",");
  if (updates.pendingInvites !== undefined) fields["受邀名单 (pendingInvites)"] = updates.pendingInvites.join(",");
  if (updates.status !== undefined) fields["队伍状态"] = updates.status;

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
    marqueeNotice: (fields["全局跑马灯通知"] as string) ?? "",
    endTime: (fields["比赛结束时间"] as string) ?? "",
    forceDisbandTrigger: (fields["强制解散触发"] as string) ?? null,
  };
}

// ==================== 辅助函数 ====================

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

// ==================== 飞书字段映射 ====================

function mapFeishuUser(fields: Record<string, unknown>): User {
  return {
    builderId: String(fields["Builder号"] ?? ""),
    name: String(fields["姓名"] ?? ""),
    phone: String(fields["电话"] ?? ""),
    email: String(fields["邮箱"] ?? ""),
    avatar: String(fields["头像"] ?? ""),
    role: (fields["角色"] as UserRole) ?? "ANOMALY",
    bio: String(fields["自我介绍"] ?? ""),
    teamId: (fields["所属团队"] as string) || null,
    abnormalMark: (fields["异常标记"] as string) || null,
  };
}

function mapFeishuTeam(fields: Record<string, unknown>): Team {
  const pendingStr = String(fields["受邀名单 (pendingInvites)"] ?? "");
  const pendingInvites = pendingStr ? pendingStr.split(",").map((s) => s.trim()).filter(Boolean) : [];

  const memberStr = String(fields["成员列表"] ?? "");
  const memberIds = memberStr ? memberStr.split(",").map((s) => s.trim()).filter(Boolean) : [];

  return {
    teamId: String(fields["团队ID"] ?? ""),
    name: String(fields["队名"] ?? ""),
    slogan: String(fields["一句话宣言"] ?? ""),
    captainId: String(fields["队长"] ?? ""),
    memberIds,
    pendingInvites,
    status: (fields["队伍状态"] as TeamStatus) ?? "头脑风暴中",
    abnormalMark: (fields["异常标记"] as string) || null,
  };
}
