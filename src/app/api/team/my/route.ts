import { NextRequest, NextResponse } from "next/server";
import { getBuilderIdFromCookie, unauthorizedResponse } from "@/lib/mock-db";
import { getUserByBuilderId, getTeamById, getAllUsers } from "@/lib/data-service";
import { withMockDelay } from "@/lib/mock-delay";

export async function GET(request: NextRequest) {
  await withMockDelay(200);

  const builderId = getBuilderIdFromCookie(request);
  if (!builderId) return unauthorizedResponse();

  const user = await getUserByBuilderId(builderId);
  if (!user) return unauthorizedResponse();

  let team = null;
  let teamMembers: Awaited<ReturnType<typeof getAllUsers>> = [];

  if (user.teamId) {
    team = await getTeamById(user.teamId);
    // 只返回当前队伍的成员信息，不泄露全场用户数据
    if (team) {
      const allUsers = await getAllUsers();
      teamMembers = allUsers.filter((u) => team!.memberIds.includes(u.builderId));
    }
  }

  return NextResponse.json({
    ok: true,
    data: {
      user,
      team,
      teamMembers,
    },
  });
}
