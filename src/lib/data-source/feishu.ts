import * as feishu from "@/lib/feishu";
import type { Team, User, SystemConfig } from "@/types";
import {
  FIELD,
  extractLinkRecordIds,
  extractTextValue,
  makeLinkValue,
  mapFeishuTeam,
  mapFeishuUser,
} from "./feishu-fields";
import type { DataSource } from "./types";

const TABLE_USERS = () => process.env.FEISHU_TABLE_ID_USERS ?? "";
const TABLE_TEAMS = () => process.env.FEISHU_TABLE_ID_TEAMS ?? "";
const TABLE_SYSTEM = () => process.env.FEISHU_TABLE_ID_SYSTEM ?? "";

const WRITE_DELAY_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class FeishuDataSource implements DataSource {
  private async findUserRecordId(builderId: string): Promise<string | null> {
    const record = await feishu.findRecord(
      TABLE_USERS(),
      `CurrentValue.[${FIELD.builderId}]="${builderId}"`
    );
    return record?.recordId ?? null;
  }

  private async findTeamRecordId(teamId: string): Promise<string | null> {
    const record = await feishu.findRecord(
      TABLE_TEAMS(),
      `CurrentValue.[${FIELD.teamId}]="${teamId}"`
    );
    return record?.recordId ?? null;
  }

  /** 根据飞书 recordId 解析队伍编号，优先走缓存 */
  private async resolveTeamId(linkIds: string[]): Promise<string | null> {
    if (linkIds.length === 0) return null;

    // 优先从全量缓存中查找
    const cachedTeams = feishu.getCachedList(TABLE_TEAMS());
    if (cachedTeams) {
      const teamRecord = cachedTeams.find((r) => String(r.record_id ?? "") === linkIds[0]);
      if (teamRecord) {
        return extractTextValue((teamRecord.fields as Record<string, unknown>)[FIELD.teamId]) || null;
      }
      return null;
    }

    // 缓存 miss，走飞书 API
    const teamRecord = await feishu.getRecord(TABLE_TEAMS(), linkIds[0]);
    if (!teamRecord) return null;
    const fields = teamRecord.fields as Record<string, unknown>;
    return extractTextValue(fields[FIELD.teamId]) || null;
  }

  async getUserByBuilderId(builderId: string): Promise<User | null> {
    // 优先从全量缓存查找，避免独立调用飞书 API
    const cachedUsers = feishu.getCachedList(TABLE_USERS());
    if (cachedUsers) {
      const record = cachedUsers.find(
        (r) => extractTextValue((r.fields as Record<string, unknown>)[FIELD.builderId]) === builderId
      );
      if (record) {
        const fields = record.fields as Record<string, unknown>;
        const teamId = await this.resolveTeamId(extractLinkRecordIds(fields[FIELD.teamRef]));
        return mapFeishuUser(fields, teamId);
      }
      return null;
    }

    const record = await feishu.findRecord(
      TABLE_USERS(),
      `CurrentValue.[${FIELD.builderId}]="${builderId}"`
    );
    if (!record) return null;

    const fields = record.fields;
    const teamId = await this.resolveTeamId(extractLinkRecordIds(fields[FIELD.teamRef]));
    return mapFeishuUser(fields, teamId);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    // 优先从全量缓存查找
    const cachedUsers = feishu.getCachedList(TABLE_USERS());
    if (cachedUsers) {
      const record = cachedUsers.find(
        (r) => extractTextValue((r.fields as Record<string, unknown>)[FIELD.email]) === email
      );
      if (record) {
        const fields = record.fields as Record<string, unknown>;
        const teamId = await this.resolveTeamId(extractLinkRecordIds(fields[FIELD.teamRef]));
        return mapFeishuUser(fields, teamId);
      }
      return null;
    }

    const records = await feishu.searchRecords(TABLE_USERS(), {
      conjunction: "and",
      conditions: [{ field_name: FIELD.email, operator: "is", value: [email] }],
    });
    if (records.length === 0) return null;

    const fields = records[0].fields as Record<string, unknown>;
    const teamId = await this.resolveTeamId(extractLinkRecordIds(fields[FIELD.teamRef]));
    return mapFeishuUser(fields, teamId);
  }

  async getUserByOpenId(openId: string): Promise<User | null> {
    // 优先从全量缓存查找
    const cachedUsers = feishu.getCachedList(TABLE_USERS());
    if (cachedUsers) {
      const record = cachedUsers.find(
        (r) => extractTextValue((r.fields as Record<string, unknown>)[FIELD.openId]) === openId
      );
      if (record) {
        const fields = record.fields as Record<string, unknown>;
        const teamId = await this.resolveTeamId(extractLinkRecordIds(fields[FIELD.teamRef]));
        return mapFeishuUser(fields, teamId);
      }
      return null;
    }

    const records = await feishu.searchRecords(TABLE_USERS(), {
      conjunction: "and",
      conditions: [{ field_name: FIELD.openId, operator: "is", value: [openId] }],
    });
    if (records.length === 0) return null;

    const fields = records[0].fields as Record<string, unknown>;
    const teamId = await this.resolveTeamId(extractLinkRecordIds(fields[FIELD.teamRef]));
    return mapFeishuUser(fields, teamId);
  }

  async getAllUsers(): Promise<User[]> {
    const [userRecords, teamRecords] = await Promise.all([
      feishu.searchRecords(TABLE_USERS()),
      feishu.searchRecords(TABLE_TEAMS()),
    ]);

    const teamMap = new Map<string, string>();
    for (const teamRecord of teamRecords) {
      const recordId = String(teamRecord.record_id ?? "");
      const teamId = extractTextValue((teamRecord.fields as Record<string, unknown>)[FIELD.teamId]);
      if (recordId && teamId) teamMap.set(recordId, teamId);
    }

    return userRecords.map((userRecord) => {
      const fields = userRecord.fields as Record<string, unknown>;
      const linkIds = extractLinkRecordIds(fields[FIELD.teamRef]);
      const teamId = linkIds.length > 0 ? teamMap.get(linkIds[0]) ?? null : null;
      return mapFeishuUser(fields, teamId);
    });
  }

  async updateUser(builderId: string, updates: Partial<User>): Promise<boolean> {
    const record = await feishu.findRecord(
      TABLE_USERS(),
      `CurrentValue.[${FIELD.builderId}]="${builderId}"`
    );
    if (!record) return false;

    const fields: Record<string, unknown> = {};
    if (updates.teamId !== undefined) {
      if (updates.teamId) {
        const teamRecordId = await this.findTeamRecordId(updates.teamId);
        if (!teamRecordId) return false;
        fields[FIELD.teamRef] = makeLinkValue(teamRecordId);
      } else {
        fields[FIELD.teamRef] = null;
      }
    }
    if (updates.abnormalMark !== undefined) fields[FIELD.abnormalMark] = updates.abnormalMark || "";
    if (updates.avatar !== undefined) fields[FIELD.avatar] = updates.avatar;
    if (updates.name !== undefined) fields[FIELD.name] = updates.name;
    if (updates.phone !== undefined) fields[FIELD.phone] = updates.phone;
    if (updates.email !== undefined) fields[FIELD.email] = updates.email;
    if (updates.role !== undefined) fields[FIELD.role] = updates.role;
    if (updates.bio !== undefined) fields[FIELD.bio] = updates.bio;
    if (updates.presenceStatus !== undefined) {
      fields[FIELD.presenceStatus] = updates.presenceStatus;
    }
    if (updates.consentStatus !== undefined) {
      fields[FIELD.consentStatus] = updates.consentStatus;
    }
    if (updates.password !== undefined) {
      fields[FIELD.passwordHash] = updates.password;
    }

    await feishu.updateRecord(TABLE_USERS(), record.recordId, fields);
    feishu.clearDataCache();
    return true;
  }

  async bindOpenId(builderId: string, openId: string): Promise<boolean> {
    const record = await feishu.findRecord(
      TABLE_USERS(),
      `CurrentValue.[${FIELD.builderId}]="${builderId}"`
    );
    if (!record) return false;

    const existing = await this.getUserByOpenId(openId);
    if (existing && existing.builderId !== builderId) return false;

    await feishu.updateRecord(TABLE_USERS(), record.recordId, { [FIELD.openId]: openId });
    feishu.clearDataCache();
    return true;
  }

  async getTeamById(teamId: string): Promise<Team | null> {
    // 优先从全量缓存查找
    const cachedTeams = feishu.getCachedList(TABLE_TEAMS());
    const cachedUsers = feishu.getCachedList(TABLE_USERS());
    if (cachedTeams && cachedUsers) {
      const teamRecord = cachedTeams.find(
        (r) => extractTextValue((r.fields as Record<string, unknown>)[FIELD.teamId]) === teamId
      );
      if (teamRecord) {
        return this.buildTeamFromRecords(teamRecord, cachedUsers);
      }
      return null;
    }

    const record = await feishu.findRecord(
      TABLE_TEAMS(),
      `CurrentValue.[${FIELD.teamId}]="${teamId}"`
    );
    if (!record) return null;

    const teamRecordId = record.recordId;
    const teamFields = record.fields;
    const userRecords = await feishu.searchRecords(TABLE_USERS());
    const userMap = new Map<string, string>();
    const memberIds: string[] = [];

    for (const userRecord of userRecords) {
      const fields = userRecord.fields as Record<string, unknown>;
      const recordId = String(userRecord.record_id ?? "");
      const builderId = extractTextValue(fields[FIELD.builderId]);
      if (recordId && builderId) userMap.set(recordId, builderId);

      const teamLinks = extractLinkRecordIds(fields[FIELD.teamRef]);
      if (teamLinks.includes(teamRecordId) && builderId) {
        memberIds.push(builderId);
      }
    }

    const captainLinkIds = extractLinkRecordIds(teamFields[FIELD.teamCaptain]);
    const captainId = captainLinkIds.length > 0 ? userMap.get(captainLinkIds[0]) ?? "" : "";
    return mapFeishuTeam(teamFields, captainId, memberIds);
  }

  /** 从缓存记录构建 Team 对象 */
  private buildTeamFromRecords(
    teamRecord: Record<string, unknown>,
    userRecords: Record<string, unknown>[]
  ): Team {
    const teamRecordId = String(teamRecord.record_id ?? "");
    const teamFields = teamRecord.fields as Record<string, unknown>;

    const userMap = new Map<string, string>();
    const memberIds: string[] = [];

    for (const userRecord of userRecords) {
      const fields = userRecord.fields as Record<string, unknown>;
      const recordId = String(userRecord.record_id ?? "");
      const builderId = extractTextValue(fields[FIELD.builderId]);
      if (recordId && builderId) userMap.set(recordId, builderId);

      const teamLinks = extractLinkRecordIds(fields[FIELD.teamRef]);
      if (teamLinks.includes(teamRecordId) && builderId) {
        memberIds.push(builderId);
      }
    }

    const captainLinkIds = extractLinkRecordIds(teamFields[FIELD.teamCaptain]);
    const captainId = captainLinkIds.length > 0 ? userMap.get(captainLinkIds[0]) ?? "" : "";
    return mapFeishuTeam(teamFields, captainId, memberIds);
  }

  async getAllTeams(): Promise<Team[]> {
    const [teamRecords, userRecords] = await Promise.all([
      feishu.searchRecords(TABLE_TEAMS()),
      feishu.searchRecords(TABLE_USERS()),
    ]);

    const userMap = new Map<string, string>();
    for (const userRecord of userRecords) {
      const recordId = String(userRecord.record_id ?? "");
      const builderId = extractTextValue((userRecord.fields as Record<string, unknown>)[FIELD.builderId]);
      if (recordId && builderId) userMap.set(recordId, builderId);
    }

    const membersByTeamRecordId = new Map<string, string[]>();
    for (const userRecord of userRecords) {
      const fields = userRecord.fields as Record<string, unknown>;
      const builderId = extractTextValue(fields[FIELD.builderId]);
      for (const teamRecordId of extractLinkRecordIds(fields[FIELD.teamRef])) {
        const list = membersByTeamRecordId.get(teamRecordId) ?? [];
        if (builderId) list.push(builderId);
        membersByTeamRecordId.set(teamRecordId, list);
      }
    }

    return teamRecords.map((teamRecord) => {
      const fields = teamRecord.fields as Record<string, unknown>;
      const teamRecordId = String(teamRecord.record_id ?? "");
      const captainLinkIds = extractLinkRecordIds(fields[FIELD.teamCaptain]);
      const captainId = captainLinkIds.length > 0 ? userMap.get(captainLinkIds[0]) ?? "" : "";
      return mapFeishuTeam(fields, captainId, membersByTeamRecordId.get(teamRecordId) ?? []);
    });
  }

  async createTeam(team: Team): Promise<Team | null> {
    const captainRecordId = await this.findUserRecordId(team.captainId);
    if (!captainRecordId) return null;

    const fields: Record<string, unknown> = {
      [FIELD.teamId]: team.teamId,
      [FIELD.teamName]: team.name,
      [FIELD.teamSlogan]: team.slogan,
      [FIELD.teamCaptain]: makeLinkValue(captainRecordId),
      [FIELD.teamPending]: team.pendingInvites.length > 0 ? team.pendingInvites.join(",") : "",
      [FIELD.teamStatus]: team.status,
      [FIELD.teamWorkshop]: team.workshop || "",
    };

    const result = await feishu.createRecord(TABLE_TEAMS(), fields);
    feishu.clearDataCache();
    return result ? team : null;
  }

  async updateTeam(teamId: string, updates: Partial<Team>): Promise<boolean> {
    const record = await feishu.findRecord(
      TABLE_TEAMS(),
      `CurrentValue.[${FIELD.teamId}]="${teamId}"`
    );
    if (!record) return false;

    const fields: Record<string, unknown> = {};
    if (updates.name !== undefined) fields[FIELD.teamName] = updates.name;
    if (updates.slogan !== undefined) fields[FIELD.teamSlogan] = updates.slogan;
    if (updates.pendingInvites !== undefined) {
      fields[FIELD.teamPending] =
        updates.pendingInvites.length > 0 ? updates.pendingInvites.join(",") : "";
    }
    if (updates.status !== undefined) fields[FIELD.teamStatus] = updates.status;
    if (updates.workshop !== undefined) fields[FIELD.teamWorkshop] = updates.workshop || "";
    if (updates.captainId !== undefined) {
      const captainRecordId = await this.findUserRecordId(updates.captainId);
      if (captainRecordId) fields[FIELD.teamCaptain] = makeLinkValue(captainRecordId);
    }

    await feishu.updateRecord(TABLE_TEAMS(), record.recordId, fields);
    feishu.clearDataCache();
    return true;
  }

  async deleteTeam(teamId: string): Promise<boolean> {
    const record = await feishu.findRecord(
      TABLE_TEAMS(),
      `CurrentValue.[${FIELD.teamId}]="${teamId}"`
    );
    if (!record) return false;
    await feishu.deleteRecord(TABLE_TEAMS(), record.recordId);
    feishu.clearDataCache();
    return true;
  }

  async getNextTeamId(): Promise<string> {
    const teams = await this.getAllTeams();
    if (teams.length === 0) return "T-001";
    const max = Math.max(
      ...teams.map((team) => {
        const match = team.teamId.match(/T-(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      })
    );
    return `T-${String(max + 1).padStart(3, "0")}`;
  }

  async removePendingInviteFromAllTeamsExcept(
    builderId: string,
    acceptedTeamId: string
  ): Promise<boolean> {
    const teams = await this.getAllTeams();
    const teamsToClean = teams.filter(
      (team) => team.teamId !== acceptedTeamId && team.pendingInvites.includes(builderId)
    );

    for (let i = 0; i < teamsToClean.length; i++) {
      const team = teamsToClean[i];
      await this.updateTeam(team.teamId, {
        pendingInvites: team.pendingInvites.filter((id) => id !== builderId),
      });
      if (i < teamsToClean.length - 1) await sleep(WRITE_DELAY_MS);
    }

    return true;
  }

  async getSystemConfig(): Promise<SystemConfig> {
    const fields = await feishu.getSystemStatus(TABLE_SYSTEM());
    if (!fields) {
      return { marqueeNotice: "", endTime: "", forceDisbandTrigger: null };
    }
    return {
      marqueeNotice: extractTextValue(fields[FIELD.systemNotice]),
      endTime: extractTextValue(fields[FIELD.systemEndTime]),
      forceDisbandTrigger: extractTextValue(fields[FIELD.systemDisband]) || null,
    };
  }

  async updateSystemConfig(updates: Partial<SystemConfig>): Promise<boolean> {
    const records = await feishu.searchRecords(TABLE_SYSTEM());
    if (records.length === 0) return false;

    const recordId = String(records[0].record_id ?? "");
    if (!recordId) return false;

    const fields: Record<string, unknown> = {};
    if (updates.marqueeNotice !== undefined) fields[FIELD.systemNotice] = updates.marqueeNotice;
    if (updates.endTime !== undefined) fields[FIELD.systemEndTime] = updates.endTime;
    if (updates.forceDisbandTrigger !== undefined) {
      fields[FIELD.systemDisband] = updates.forceDisbandTrigger;
    }

    await feishu.updateRecord(TABLE_SYSTEM(), recordId, fields);
    return true;
  }
}
