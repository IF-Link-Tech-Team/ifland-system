import { NextRequest, NextResponse } from "next/server";
import { getBuilderIdFromCookie, unauthorizedResponse } from "@/lib/mock-db";
import { getUserByBuilderId, getAllTeams, getAllUsers } from "@/lib/data-service";
import { withMockDelay } from "@/lib/mock-delay";

export async function GET(request: NextRequest) {
  await withMockDelay(300);

  const builderId = getBuilderIdFromCookie(request);
  if (!builderId) return unauthorizedResponse();

  const user = await getUserByBuilderId(builderId);
  if (!user) return unauthorizedResponse();

  const teams = await getAllTeams();
  const allUsers = await getAllUsers();

  // 查找所有 pendingInvites 包含当前用户的队伍
  const invites = teams
    .filter((team) => team.pendingInvites.includes(builderId))
    .map((team) => {
      const captain = allUsers.find((u) => u.builderId === team.captainId);
      return {
        teamId: team.teamId,
        teamName: team.name,
        captainName: captain?.name ?? "未知",
        captainId: team.captainId,
      };
    });

  return NextResponse.json({ ok: true, data: invites });
}
