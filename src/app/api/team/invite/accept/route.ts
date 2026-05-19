import { NextRequest, NextResponse } from "next/server";
import { getBuilderIdFromCookie, unauthorizedResponse } from "@/lib/mock-db";
import {
  getUserByBuilderId,
  getTeamById,
  getAllTeams,
  updateUser,
  updateTeam,
} from "@/lib/data-service";

const MOCK_DELAY = 500;

export async function POST(request: NextRequest) {
  if (process.env.USE_FEISHU !== "true") {
    await new Promise((r) => setTimeout(r, MOCK_DELAY));
  }

  const builderId = getBuilderIdFromCookie(request);
  if (!builderId) return unauthorizedResponse();

  const user = await getUserByBuilderId(builderId);
  if (!user) return unauthorizedResponse();

  try {
    const { teamId } = await request.json();
    if (!teamId || typeof teamId !== "string") {
      return NextResponse.json(
        { ok: false, error: "缺少队伍 ID" },
        { status: 400 }
      );
    }

    if (user.teamId) {
      return NextResponse.json(
        { ok: false, error: "你已加入队伍，无法接受新邀请" },
        { status: 400 }
      );
    }

    const team = await getTeamById(teamId);
    if (!team) {
      return NextResponse.json(
        { ok: false, error: "队伍不存在" },
        { status: 404 }
      );
    }

    if (!team.pendingInvites.includes(builderId)) {
      return NextResponse.json(
        { ok: false, error: "未收到该队伍的邀请" },
        { status: 400 }
      );
    }

    if (team.memberIds.length >= 3) {
      return NextResponse.json(
        { ok: false, error: "队伍已满员" },
        { status: 400 }
      );
    }

    // 1. 加入队伍
    await updateUser(builderId, { teamId });
    team.memberIds.push(builderId);

    // 2. 从当前队伍的 pendingInvites 中移除
    team.pendingInvites = team.pendingInvites.filter((id) => id !== builderId);

    await updateTeam(teamId, {
      memberIds: team.memberIds,
      pendingInvites: team.pendingInvites,
    });

    // 3. 排他清理：全局遍历其他队伍
    const allTeams = await getAllTeams();
    for (const otherTeam of allTeams) {
      if (otherTeam.teamId === teamId) continue;
      if (otherTeam.pendingInvites.includes(builderId)) {
        otherTeam.pendingInvites = otherTeam.pendingInvites.filter(
          (id) => id !== builderId
        );
        await updateTeam(otherTeam.teamId, {
          pendingInvites: otherTeam.pendingInvites,
        });
      }
    }

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
