import type { Team, TeamStatus, User, UserRole, Workshop, Project, TagColor } from "@/types";
import { ROLE_FROM_CN, ROLE_LABELS } from "@/types";

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
  consentStatus: "授权状态",

  teamId: "团队ID",
  teamName: "队名",
  teamSlogan: "一句话宣言",
  teamCaptain: "队长",
  teamPending: "受邀名单 (pendingInvites)",
  teamStatus: "队伍状态",
  teamWorkshop: "所属工坊",

  systemNotice: "全局跑马灯通知",
  systemEndTime: "比赛结束时间",
  systemDisband: "强制解散触发",

  projectName: "作品名称",
  projectTeamName: "队名",
  projectDescription: "作品简介",
  projectPoster: "项目海报",
  projectGithub: "GitHub/Gitee/GitCode地址",
  projectTag: "赛道",
  projectDiscarded: "弃用版本",
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
    role: ROLE_FROM_CN[extractSelectValue(fields[FIELD.role])] || "ANOMALY",
    bio: extractTextValue(fields[FIELD.bio]),
    teamId,
    abnormalMark: extractTextValue(fields[FIELD.abnormalMark]) || null,
    openId: extractTextValue(fields[FIELD.openId]),
    presenceStatus: status === "离场" ? "离场" : "在场",
    consentStatus: extractSelectValue(fields[FIELD.consentStatus]) || null,
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
    workshop: (extractSelectValue(fields[FIELD.teamWorkshop]) as Workshop) || null,
  };
}

/** 解析飞书附件字段，提取第一张图片 URL */
function extractAttachmentUrl(val: unknown): string | null {
  if (!val) return null;
  if (typeof val === "string") return val || null;
  if (Array.isArray(val)) {
    const first = val[0];
    if (first && typeof first === "object" && "url" in first) return (first as { url: string }).url;
    if (first && typeof first === "object" && "tmp_url" in first) return (first as { tmp_url: string }).tmp_url;
    if (typeof first === "string") return first;
  }
  return null;
}

/** 解析飞书 URL 类型字段（含 link 属性）或纯文本 URL */
function extractUrlValue(val: unknown): string | null {
  if (!val) return null;
  if (typeof val === "string") {
    try { new URL(val); return val; } catch { return null; }
  }
  if (Array.isArray(val)) {
    for (const item of val) {
      if (item && typeof item === "object") {
        if ("link" in item && typeof (item as any).link === "string") return (item as any).link;
        if ("url" in item && typeof (item as any).url === "string") return (item as any).url;
      }
    }
  }
  // 尝试从 text 中提取 URL
  const text = extractTextValue(val);
  if (text) {
    try { new URL(text); return text; } catch { return null; }
  }
  return null;
}

/** 根据赛道名称分配颜色 */
const TAG_COLOR_MAP: Record<string, TagColor> = {
  "AI+教育": "green",
  "AI+校园": "purple",
  "AIGC": "purple",
  "AI+生活": "orange",
  "AI+行业": "purple",
  "智慧交通": "orange",
  "硬件交互": "orange",
  "推荐系统": "green",
  "绿色计算": "green",
  "3D渲染": "orange",
};

/** 判断记录是否为弃用版本 */
export function isProjectDiscarded(fields: Record<string, unknown>): boolean {
  const val = fields[FIELD.projectDiscarded];
  if (!val) return false;
  const text = extractSelectValue(val);
  return text === "是";
}

/** 飞书记录 → Project */
export function mapFeishuProject(
  fields: Record<string, unknown>,
  index: number
): Project {
  const tagText = extractTextValue(fields[FIELD.projectTag]);
  const tagNames = tagText
    ? tagText.split(/[,，、]/).map((t) => t.trim()).filter(Boolean)
    : [];

  // 尝试多个可能的简介字段名
  const description =
    extractTextValue(fields[FIELD.projectDescription]) ||
    extractTextValue(fields["简介"]) ||
    "暂无简介";

  return {
    id: String(index + 1).padStart(2, "0"),
    projectName: extractTextValue(fields[FIELD.projectName]) || "未命名项目",
    teamName: extractTextValue(fields[FIELD.projectTeamName]) || "未知队伍",
    description,
    posterUrl: extractAttachmentUrl(fields[FIELD.projectPoster]),
    githubUrl: extractUrlValue(fields[FIELD.projectGithub]),
    tags: tagNames.map((name) => ({
      name,
      color: TAG_COLOR_MAP[name] || "green",
    })),
  };
}
