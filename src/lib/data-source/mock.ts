import {
  findTeamById,
  findUserById,
  findUserByOpenId,
  generateNextTeamId,
  readMockData,
  writeMockData,
} from "@/lib/mock-db";
import type { Team, User, SystemConfig, Project } from "@/types";
import type { DataSource } from "./types";

export class MockDataSource implements DataSource {
  async getUserByBuilderId(builderId: string): Promise<User | null> {
    return findUserById(readMockData(), builderId);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const data = readMockData();
    return data.users.find((u) => u.email === email) ?? null;
  }

  async getUserByOpenId(openId: string): Promise<User | null> {
    return findUserByOpenId(readMockData(), openId);
  }

  async getAllUsers(): Promise<User[]> {
    return readMockData().users;
  }

  async updateUser(builderId: string, updates: Partial<User>): Promise<boolean> {
    const data = readMockData();
    const user = findUserById(data, builderId);
    if (!user) return false;
    Object.assign(user, updates);
    writeMockData(data);
    return true;
  }

  async bindOpenId(builderId: string, openId: string): Promise<boolean> {
    const data = readMockData();
    const user = findUserById(data, builderId);
    if (!user || user.openId) return false;
    user.openId = openId;
    writeMockData(data);
    return true;
  }

  async getTeamById(teamId: string): Promise<Team | null> {
    return findTeamById(readMockData(), teamId);
  }

  async getAllTeams(): Promise<Team[]> {
    return readMockData().teams;
  }

  async createTeam(team: Team): Promise<Team | null> {
    const data = readMockData();
    data.teams.push(team);
    writeMockData(data);
    return team;
  }

  async updateTeam(teamId: string, updates: Partial<Team>): Promise<boolean> {
    const data = readMockData();
    const team = findTeamById(data, teamId);
    if (!team) return false;
    Object.assign(team, updates);
    writeMockData(data);
    return true;
  }

  async deleteTeam(teamId: string): Promise<boolean> {
    const data = readMockData();
    const idx = data.teams.findIndex((team) => team.teamId === teamId);
    if (idx === -1) return false;
    data.teams.splice(idx, 1);
    writeMockData(data);
    return true;
  }

  async getNextTeamId(): Promise<string> {
    return generateNextTeamId(readMockData());
  }

  async removePendingInviteFromAllTeamsExcept(
    builderId: string,
    acceptedTeamId: string
  ): Promise<boolean> {
    const data = readMockData();
    for (const team of data.teams) {
      if (team.teamId === acceptedTeamId) continue;
      team.pendingInvites = team.pendingInvites.filter((id) => id !== builderId);
    }
    writeMockData(data);
    return true;
  }

  async getSystemConfig(): Promise<SystemConfig> {
    return readMockData().system;
  }

  async updateSystemConfig(updates: Partial<SystemConfig>): Promise<boolean> {
    const data = readMockData();
    Object.assign(data.system, updates);
    writeMockData(data);
    return true;
  }

  async getShowcaseProjects(): Promise<Project[]> {
    // Mock 模式下返回空数组，展示模块使用内置 Mock 数据
    return [];
  }
}
