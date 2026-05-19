import { NextRequest, NextResponse } from "next/server";
import {
  readMockData,
  writeMockData,
  getBuilderIdFromCookie,
  findUserById,
  findTeamById,
  unauthorizedResponse,
} from "@/lib/mock-db";

const MOCK_DELAY = 500;

export async function POST(request: NextRequest) {
  await new Promise((r) => setTimeout(r, MOCK_DELAY));

  const builderId = getBuilderIdFromCookie(request);
  if (!builderId) return unauthorizedResponse();

  const data = readMockData();
  const user = findUserById(data, builderId);
  if (!user) return unauthorizedResponse();

  try {
    const { teamId } = await request.json();
    if (!teamId || typeof teamId !== "string") {
      return NextResponse.json(
        { ok: false, error: "缺少队伍 ID" },
        { status: 400 }
      );
    }

    // 必须是自由人才能接受邀请
    if (user.teamId) {
      return NextResponse.json(
        { ok: false, error: "你已加入队伍，无法接受新邀请" },
        { status: 400 }
      );
    }

    const team = findTeamById(data, teamId);
    if (!team) {
      return NextResponse.json(
        { ok: false, error: "队伍不存在" },
        { status: 404 }
      );
    }

    // 确认邀请存在
    if (!team.pendingInvites.includes(builderId)) {
      return NextResponse.json(
        { ok: false, error: "未收到该队伍的邀请" },
        { status: 400 }
      );
    }

    // 队伍满员校验
    if (team.memberIds.length >= 3) {
      return NextResponse.json(
        { ok: false, error: "队伍已满员" },
        { status: 400 }
      );
    }

    // 1. 加入队伍
    user.teamId = teamId;
    team.memberIds.push(builderId);

    // 2. 从当前队伍的 pendingInvites 中移除
    team.pendingInvites = team.pendingInvites.filter(
      (id) => id !== builderId
    );

    // 3. 排他清理：全局遍历其他队伍，将当前用户从中移除
    for (const otherTeam of data.teams) {
      if (otherTeam.teamId === teamId) continue;
      otherTeam.pendingInvites = otherTeam.pendingInvites.filter(
        (id) => id !== builderId
      );
    }

    writeMockData(data);

    return NextResponse.json({
      ok: true,
      data: {
        teamId,
        memberIds: team.memberIds,
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "服务器错误" },
      { status: 500 }
    );
  }
}
