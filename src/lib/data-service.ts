/**
 * 数据服务 facade。
 *
 * API routes 继续从这里导入旧函数名；具体读写由 DataSource 实现负责。
 * USE_FEISHU=true 时使用飞书多维表格，否则使用本地 mock_data.json。
 */

import { getDataSource } from "@/lib/data-source";
import type { User, Team, SystemConfig } from "@/types";

export async function getUserByBuilderId(builderId: string): Promise<User | null> {
  return getDataSource().getUserByBuilderId(builderId);
}

export async function getUserByOpenId(openId: string): Promise<User | null> {
  return getDataSource().getUserByOpenId(openId);
}

export async function getAllUsers(): Promise<User[]> {
  return getDataSource().getAllUsers();
}

export async function updateUser(
  builderId: string,
  updates: Partial<User>
): Promise<boolean> {
  return getDataSource().updateUser(builderId, updates);
}

export async function bindOpenId(builderId: string, openId: string): Promise<boolean> {
  return getDataSource().bindOpenId(builderId, openId);
}

export async function getTeamById(teamId: string): Promise<Team | null> {
  return getDataSource().getTeamById(teamId);
}

export async function getAllTeams(): Promise<Team[]> {
  return getDataSource().getAllTeams();
}

export async function createTeam(team: Team): Promise<Team | null> {
  return getDataSource().createTeam(team);
}

export async function updateTeam(
  teamId: string,
  updates: Partial<Team>
): Promise<boolean> {
  return getDataSource().updateTeam(teamId, updates);
}

export async function deleteTeam(teamId: string): Promise<boolean> {
  return getDataSource().deleteTeam(teamId);
}

export async function getNextTeamId(): Promise<string> {
  return getDataSource().getNextTeamId();
}

export async function removePendingInviteFromAllTeamsExcept(
  builderId: string,
  acceptedTeamId: string
): Promise<boolean> {
  return getDataSource().removePendingInviteFromAllTeamsExcept(builderId, acceptedTeamId);
}

export async function getSystemConfig(): Promise<SystemConfig> {
  return getDataSource().getSystemConfig();
}

export async function updateSystemConfig(
  updates: Partial<SystemConfig>
): Promise<boolean> {
  return getDataSource().updateSystemConfig(updates);
}
