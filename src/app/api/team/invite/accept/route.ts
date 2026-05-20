import { NextRequest, NextResponse } from "next/server";
import { getBuilderIdFromCookie, unauthorizedResponse } from "@/lib/mock-db";
import {
  getUserByBuilderId,
  getTeamById,
  getAllTeams,
  updateUser,
  updateTeam,
} from "@/lib/data-service";
import { withMockDelay } from "@/lib/mock-delay";

/** 排他清理最大处理队伍数，防止延迟累积导致请求超时 */
const MAX_EXCLUSIVE_CLEANUP = 5;

export async function POST(request: NextRequest) {
  await withMockDelay(500);

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
    const newMemberIds = [...team.memberIds, builderId];
    const newPendingInvites = team.pendingInvites.filter((id) => id !== builderId);

    await updateTeam(teamId, {
      memberIds: newMemberIds,
      pendingInvites: newPendingInvites,
    });

    // 2. 排他清理：串行写入 + 延迟，避免飞书并发写冲突 (1254291)
    const allTeams = await getAllTeams();
    const teamsToClean = allTeams.filter(
      (t) => t.teamId !== teamId && t.pendingInvites.includes(builderId)
    );

    // 限制处理数量，防止延迟累积导致请求超时
    const limitedTeams = teamsToClean.slice(0, MAX_EXCLUSIVE_CLEANUP);
    const skipped = teamsToClean.length - limitedTeams.length;
    if (skipped > 0) {
      console.warn(`[ExclusiveCleanup] ${skipped} teams skipped due to MAX_EXCLUSIVE_CLEANUP limit`);
    }

    for (let i = 0; i < limitedTeams.length; i++) {
      const otherTeam = limitedTeams[i];
      const cleaned = otherTeam.pendingInvites.filter((id) => id !== builderId);
      await updateTeam(otherTeam.teamId, { pendingInvites: cleaned });
      // 批次间延迟 500ms，避免并发写冲突（最后一条不需要延迟）
      if (i < limitedTeams.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    return NextResponse.json({
      ok: true,
      data: {
        teamId,
        memberIds: newMemberIds,
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "服务器错误" },
      { status: 500 }
    );
  }
}
