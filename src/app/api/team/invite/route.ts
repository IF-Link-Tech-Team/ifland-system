import { NextRequest, NextResponse } from "next/server";
import { getBuilderIdFromCookie, unauthorizedResponse } from "@/lib/mock-db";
import {
  getUserByBuilderId,
  getTeamById,
  getNextTeamId,
  updateUser,
  updateTeam,
  createTeam,
} from "@/lib/data-service";
import type { Team } from "@/types";
import { MAX_TEAM_SIZE } from "@/types";
import { withMockDelay } from "@/lib/mock-delay";

export async function POST(request: NextRequest) {
  await withMockDelay(500);

  const builderId = getBuilderIdFromCookie(request);
  if (!builderId) return unauthorizedResponse();

  const inviter = await getUserByBuilderId(builderId);
  if (!inviter) return unauthorizedResponse();

  try {
    const { targetBuilderId } = await request.json();
    if (!targetBuilderId || typeof targetBuilderId !== "string") {
      return NextResponse.json(
        { ok: false, error: "请输入目标 Builder 号" },
        { status: 400 }
      );
    }

    if (targetBuilderId === builderId) {
      return NextResponse.json(
        { ok: false, error: "不能邀请自己" },
        { status: 400 }
      );
    }

    const target = await getUserByBuilderId(targetBuilderId);
    if (!target) {
      return NextResponse.json(
        { ok: false, error: "目标 Builder 号不存在" },
        { status: 404 }
      );
    }

    if (target.teamId) {
      return NextResponse.json(
        { ok: false, error: "该选手已加入其他队伍" },
        { status: 400 }
      );
    }

    let team: Team;

    if (!inviter.teamId) {
      // 发起人未组队 → 自动创建新队伍
      const newTeamId = await getNextTeamId();
      team = {
        teamId: newTeamId,
        name: "新建队伍",
        slogan: "",
        captainId: builderId,
        memberIds: [builderId],
        pendingInvites: [targetBuilderId],
        status: "头脑风暴中",
        abnormalMark: null,
        workshop: null,
      };

      await createTeam(team);
      await updateUser(builderId, { teamId: newTeamId });
    } else {
      // 发起人已组队
      const existingTeam = await getTeamById(inviter.teamId);
      if (!existingTeam) {
        return NextResponse.json(
          { ok: false, error: "队伍数据异常" },
          { status: 500 }
        );
      }

      if (existingTeam.captainId !== builderId) {
        return NextResponse.json(
          { ok: false, error: "只有队长可以发送邀请" },
          { status: 403 }
        );
      }

      if (existingTeam.memberIds.length + existingTeam.pendingInvites.length >= MAX_TEAM_SIZE) {
        return NextResponse.json(
          { ok: false, error: "队伍名额已满（含待处理邀请）" },
          { status: 400 }
        );
      }

      if (existingTeam.pendingInvites.includes(targetBuilderId)) {
        return NextResponse.json(
          { ok: false, error: "已向该选手发送过邀请" },
          { status: 400 }
        );
      }

      if (existingTeam.memberIds.includes(targetBuilderId)) {
        return NextResponse.json(
          { ok: false, error: "该选手已是你的队友" },
          { status: 400 }
        );
      }

      existingTeam.pendingInvites.push(targetBuilderId);
      console.log("[INVITE] 更新队伍 pendingInvites:", inviter.teamId, existingTeam.pendingInvites);
      await updateTeam(inviter.teamId, { pendingInvites: existingTeam.pendingInvites });
      team = existingTeam;
    }

    return NextResponse.json({
      ok: true,
      data: {
        teamId: team.teamId,
        pendingInvites: team.pendingInvites,
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "服务器错误" },
      { status: 500 }
    );
  }
}
