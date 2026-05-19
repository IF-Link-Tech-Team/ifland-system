import { NextRequest, NextResponse } from "next/server";
import { readMockData, getBuilderIdFromCookie, findUserById, unauthorizedResponse } from "@/lib/mock-db";

const MOCK_DELAY = 300;

export async function GET(request: NextRequest) {
  await new Promise((r) => setTimeout(r, MOCK_DELAY));

  const builderId = getBuilderIdFromCookie(request);
  if (!builderId) return unauthorizedResponse();

  const data = readMockData();
  const user = findUserById(data, builderId);
  if (!user) return unauthorizedResponse();

  // 查找所有 pendingInvites 包含当前用户的队伍
  const invites = data.teams
    .filter((team) => team.pendingInvites.includes(builderId))
    .map((team) => {
      const captain = findUserById(data, team.captainId);
      return {
        teamId: team.teamId,
        teamName: team.name,
        captainName: captain?.name ?? "未知",
        captainId: team.captainId,
      };
    });

  return NextResponse.json({ ok: true, data: invites });
}
