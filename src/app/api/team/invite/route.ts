import { NextRequest, NextResponse } from "next/server";
import {
  readMockData,
  writeMockData,
  getBuilderIdFromCookie,
  findUserById,
  findTeamById,
  generateNextTeamId,
  unauthorizedResponse,
} from "@/lib/mock-db";

const MOCK_DELAY = 500;

export async function POST(request: NextRequest) {
  await new Promise((r) => setTimeout(r, MOCK_DELAY));

  const builderId = getBuilderIdFromCookie(request);
  if (!builderId) return unauthorizedResponse();

  const data = readMockData();
  const inviter = findUserById(data, builderId);
  if (!inviter) return unauthorizedResponse();

  try {
    const { targetBuilderId } = await request.json();
    if (!targetBuilderId || typeof targetBuilderId !== "string") {
      return NextResponse.json(
        { ok: false, error: "请输入目标 Builder 号" },
        { status: 400 }
      );
    }

    // 不能邀请自己
    if (targetBuilderId === builderId) {
      return NextResponse.json(
        { ok: false, error: "不能邀请自己" },
        { status: 400 }
      );
    }

    // 目标用户必须存在
    const target = findUserById(data, targetBuilderId);
    if (!target) {
      return NextResponse.json(
        { ok: false, error: "目标 Builder 号不存在" },
        { status: 404 }
      );
    }

    // 目标用户必须是自由人
    if (target.teamId) {
      return NextResponse.json(
        { ok: false, error: "该选手已加入其他队伍" },
        { status: 400 }
      );
    }

    let team;

    if (!inviter.teamId) {
      // 发起人未组队 → 自动创建新队伍
      const newTeamId = generateNextTeamId(data);
      team = {
        teamId: newTeamId,
        name: "新建队伍",
        slogan: "",
        captainId: builderId,
        memberIds: [builderId],
        pendingInvites: [targetBuilderId],
        status: "头脑风暴中" as const,
        abnormalMark: null,
      };
      data.teams.push(team);
      inviter.teamId = newTeamId;
    } else {
      // 发起人已组队
      team = findTeamById(data, inviter.teamId);
      if (!team) {
        return NextResponse.json(
          { ok: false, error: "队伍数据异常" },
          { status: 500 }
        );
      }

      // 只有队长可以邀请
      if (team.captainId !== builderId) {
        return NextResponse.json(
          { ok: false, error: "只有队长可以发送邀请" },
          { status: 403 }
        );
      }

      // 锁位校验
      if (team.memberIds.length + team.pendingInvites.length >= 3) {
        return NextResponse.json(
          { ok: false, error: "队伍名额已满（含待处理邀请）" },
          { status: 400 }
        );
      }

      // 不能重复邀请同一人
      if (team.pendingInvites.includes(targetBuilderId)) {
        return NextResponse.json(
          { ok: false, error: "已向该选手发送过邀请" },
          { status: 400 }
        );
      }

      // 不能邀请已是队友的人
      if (team.memberIds.includes(targetBuilderId)) {
        return NextResponse.json(
          { ok: false, error: "该选手已是你的队友" },
          { status: 400 }
        );
      }

      team.pendingInvites.push(targetBuilderId);
    }

    writeMockData(data);

    return NextResponse.json({
      ok: true,
      data: {
        teamId: team!.teamId,
        pendingInvites: team!.pendingInvites,
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "服务器错误" },
      { status: 500 }
    );
  }
}
