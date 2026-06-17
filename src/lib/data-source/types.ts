import type { User, Team, SystemConfig, Project } from "@/types";

export interface DataSource {
  getUserByBuilderId(builderId: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  getUserByOpenId(openId: string): Promise<User | null>;
  getAllUsers(): Promise<User[]>;
  updateUser(builderId: string, updates: Partial<User>): Promise<boolean>;
  bindOpenId(builderId: string, openId: string): Promise<boolean>;

  getTeamById(teamId: string): Promise<Team | null>;
  getAllTeams(): Promise<Team[]>;
  createTeam(team: Team): Promise<Team | null>;
  updateTeam(teamId: string, updates: Partial<Team>): Promise<boolean>;
  deleteTeam(teamId: string): Promise<boolean>;
  getNextTeamId(): Promise<string>;
  removePendingInviteFromAllTeamsExcept(
    builderId: string,
    acceptedTeamId: string
  ): Promise<boolean>;

  getSystemConfig(): Promise<SystemConfig>;
  updateSystemConfig(updates: Partial<SystemConfig>): Promise<boolean>;

  getShowcaseProjects(): Promise<Project[]>;
}
