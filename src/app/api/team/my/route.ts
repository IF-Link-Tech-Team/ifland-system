import { NextRequest, NextResponse } from "next/server";
import { getBuilderIdFromCookie, unauthorizedResponse } from "@/lib/mock-db";
import { getUserByBuilderId, getTeamById, getAllUsers } from "@/lib/data-service";

const MOCK_DELAY = 200;

export async function GET(request: NextRequest) {
  if (process.env.USE_FEISHU !== "true") {
    await new Promise((r) => setTimeout(r, MOCK_DELAY));
  }

  const builderId = getBuilderIdFromCookie(request);
  if (!builderId) return unauthorizedResponse();

  const user = await getUserByBuilderId(builderId);
  if (!user) return unauthorizedResponse();

  let team = null;
  if (user.teamId) {
    team = await getTeamById(user.teamId);
  }

  const allUsers = await getAllUsers();

  return NextResponse.json({
    ok: true,
    data: {
      user,
      team,
      allUsers,
    },
  });
}
