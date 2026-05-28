import type { Team, TeamStatus, User, UserRole } from "@/types";

export const FIELD = {
  builderId: "Builder号",
  name: "姓名",
  phone: "电话",
  email: "邮箱",
  passwordHash: "密码哈希",
  avatar: "头像",
  role: "角色",
  bio: "自我介绍",
  teamRef: "所属团队",
  abnormalMark: "异常标记",
  openId: "open_id",
  presenceStatus: "在场状态",

  teamId: "团队ID",
  teamName: "队名",
  teamSlogan: "一句话宣言",
  teamCaptain: "队长",
  teamPending: "受邀名单 (pendingInvites)",
  teamStatus: "队伍状态",

  systemNotice: "全局跑马灯通知",
  systemEndTime: "比赛结束时间",
  systemDisband: "强制解散触发",
} as const;

export function extractTextValue(val: unknown): string {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (typeof val === "number") return String(val);
  if (typeof val === "object" && !Array.isArray(val) && "text" in val) {
    return (val as { text: string }).text;
  }
  if (Array.isArray(val)) {
    return val
      .map((item) => {
        if (typeof item === "string") return item;
        if (typeof item === "number") return String(item);
        if (item && typeof item === "object" && "text" in item) {
          return (item as { text: string }).text;
        }
        return "";
      })
      .filter(Boolean)
      .join("");
  }
  return String(val);
}

export function extractSelectValue(val: unknown): string {
  if (typeof val === "string") return val;
  if (val && typeof val === "object" && "text" in val) {
    return (val as { text: string }).text;
  }
  return extractTextValue(val);
}

export function extractLinkRecordIds(val: unknown): string[] {
  if (!val) return [];
  if (typeof val === "string") return val ? [val] : [];
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
  if (typeof val === "object" && val !== null && "link_record_ids" in val) {
    const ids = (val as { link_record_ids: string[] | null }).link_record_ids;
    return Array.isArray(ids) ? ids : [];
  }
  return [];
}

export function parsePendingInvites(val: unknown): string[] {
  const text = extractTextValue(val);
  if (text) {
    return text
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (Array.isArray(val)) return val.map(String).filter(Boolean);
  return [];
}

export function makeLinkValue(recordId: string | null): unknown {
  return recordId ? [recordId] : null;
}

export function mapFeishuUser(
  fields: Record<string, unknown>,
  teamId: string | null
): User {
  const status = extractSelectValue(fields[FIELD.presenceStatus]);
  return {
    builderId: extractTextValue(fields[FIELD.builderId]),
    name: extractTextValue(fields[FIELD.name]),
    phone: extractTextValue(fields[FIELD.phone]),
    email: extractTextValue(fields[FIELD.email]),
    password: extractTextValue(fields[FIELD.passwordHash]),
    avatar: extractTextValue(fields[FIELD.avatar]),
    role: (extractSelectValue(fields[FIELD.role]) as UserRole) || "ANOMALY",
    bio: extractTextValue(fields[FIELD.bio]),
    teamId,
    abnormalMark: extractTextValue(fields[FIELD.abnormalMark]) || null,
    openId: extractTextValue(fields[FIELD.openId]),
    presenceStatus: status === "离场" ? "离场" : "在场",
  };
}

export function mapFeishuTeam(
  fields: Record<string, unknown>,
  captainId: string,
  memberIds: string[]
): Team {
  return {
    teamId: extractTextValue(fields[FIELD.teamId]),
    name: extractTextValue(fields[FIELD.teamName]),
    slogan: extractTextValue(fields[FIELD.teamSlogan]),
    captainId,
    memberIds,
    pendingInvites: parsePendingInvites(fields[FIELD.teamPending]),
    status: (extractSelectValue(fields[FIELD.teamStatus]) as TeamStatus) || "头脑风暴中",
    abnormalMark: extractTextValue(fields[FIELD.abnormalMark]) || null,
  };
}
