/** 用户角色 */
export type UserRole = "NAVIGATOR" | "WEAVER" | "LINKER" | "ARTIFICER" | "ANOMALY";

/** 用户信息 */
export interface User {
  builderId: string;
  name: string;
  phone: string;
  email: string;
  avatar: string;
  role: UserRole;
  bio: string;
  teamId: string | null;
  abnormalMark: string | null;
}

/** 队伍状态 */
export type TeamStatus = "头脑风暴中" | "开发中" | "Demo提交";

/** 团队信息 */
export interface Team {
  teamId: string;
  name: string;
  slogan: string;
  captainId: string;
  memberIds: string[];
  pendingInvites: string[];
  status: TeamStatus;
  abnormalMark: string | null;
}

/** 系统配置 */
export interface SystemConfig {
  marqueeNotice: string;
  endTime: string;
  forceDisbandTrigger: string | null;
}

/** Mock 数据根结构 */
export interface MockData {
  users: User[];
  teams: Team[];
  system: SystemConfig;
}

/** 统一响应格式 - 成功 */
export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

/** 统一响应格式 - 失败 */
export interface ApiError {
  ok: false;
  error: string;
}

/** 统一响应联合类型 */
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

/** 登录响应（例外格式：直接返回完整用户信息） */
export type LoginResponse = User;

/** 系统状态响应（大屏/Dashboard 轮询） */
export interface SystemStatusResponse {
  marqueeNotice: string;
  endTime: string;
}

/** 队伍成员摘要（大屏展示用） */
export interface TeamMemberSummary {
  builderId: string;
  name: string;
  role: string;
  avatar: string;
}

/** 队伍信息摘要（大屏展示用） */
export interface TeamInfo {
  teamId: string;
  name: string;
  slogan: string;
  captainId: string;
  status: TeamStatus;
  memberCount: number;
  members: TeamMemberSummary[];
}

/** 角色中文映射 */
export const ROLE_LABELS: Record<UserRole, string> = {
  NAVIGATOR: "引航者",
  WEAVER: "编织者",
  LINKER: "链接者",
  ARTIFICER: "造物者",
  ANOMALY: "破壁者",
};
