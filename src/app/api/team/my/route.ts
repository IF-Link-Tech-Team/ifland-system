import { NextRequest, NextResponse } from "next/server";
import { getBuilderIdFromCookie, unauthorizedResponse } from "@/lib/mock-db";
import { getUserByBuilderId, getTeamById, getAllUsers } from "@/lib/data-service";
import { stripPassword } from "@/lib/crypto";
import { withMockDelay } from "@/lib/mock-delay";

export async function GET(request: NextRequest) {
  await withMockDelay(200);

  const builderId = getBuilderIdFromCookie(request);
  if (!builderId) return unauthorizedResponse();

  const user = await getUserByBuilderId(builderId);
  if (!user) return unauthorizedResponse();

  let team = null;
  let teamMembers: ReturnType<typeof stripPassword>[] = [];

  if (user.teamId) {
    team = await getTeamById(user.teamId);
    if (team) {
      const allUsers = await getAllUsers();
      teamMembers = allUsers
        .filter((u) => team!.memberIds.includes(u.builderId))
        .map(stripPassword);
    }
  }

  return NextResponse.json({
    ok: true,
    data: {
      user: stripPassword(user),
      team,
      teamMembers,
    },
  });
}
