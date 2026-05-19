import { NextRequest, NextResponse } from "next/server";
import { readMockData, getBuilderIdFromCookie, findUserById, findTeamById, unauthorizedResponse } from "@/lib/mock-db";

const MOCK_DELAY = 200;

/** 获取当前用户的队伍详情和全部用户（用于 Dashboard 一次性拉取） */
export async function GET(request: NextRequest) {
  await new Promise((r) => setTimeout(r, MOCK_DELAY));

  const builderId = getBuilderIdFromCookie(request);
  if (!builderId) return unauthorizedResponse();

  const data = readMockData();
  const user = findUserById(data, builderId);
  if (!user) return unauthorizedResponse();

  let team = null;
  if (user.teamId) {
    team = findTeamById(data, user.teamId);
  }

  return NextResponse.json({
    ok: true,
    data: {
      user,
      team,
      allUsers: data.users,
    },
  });
}
