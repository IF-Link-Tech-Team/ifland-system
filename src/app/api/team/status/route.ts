import { NextRequest, NextResponse } from "next/server";
import { getBuilderIdFromCookie, unauthorizedResponse } from "@/lib/mock-db";
import { getUserByBuilderId, getTeamById, updateTeam } from "@/lib/data-service";
import type { TeamStatus } from "@/types";
import { withMockDelay } from "@/lib/mock-delay";

const VALID_STATUSES: TeamStatus[] = ["头脑风暴中", "开发中", "Demo提交"];

export async function PUT(request: NextRequest) {
  await withMockDelay(300);

  const builderId = getBuilderIdFromCookie(request);
  if (!builderId) return unauthorizedResponse();

  const user = await getUserByBuilderId(builderId);
  if (!user) return unauthorizedResponse();

  try {
    const { teamId: bodyTeamId, status } = await request.json();
    if (!status) {
      return NextResponse.json(
        { ok: false, error: "缺少状态" },
        { status: 400 }
      );
    }

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { ok: false, error: "无效的状态值" },
        { status: 400 }
      );
    }

    // I-09: 从用户上下文获取 teamId，不信任请求体
    const teamId = user.teamId;
    if (!teamId) {
      return NextResponse.json(
        { ok: false, error: "你未加入任何队伍" },
        { status: 400 }
      );
    }
    if (bodyTeamId && bodyTeamId !== teamId) {
      return NextResponse.json(
        { ok: false, error: "只能修改自己所在队伍" },
        { status: 403 }
      );
    }

    const team = await getTeamById(teamId);
    if (!team) {
      return NextResponse.json(
        { ok: false, error: "队伍不存在" },
        { status: 404 }
      );
    }

    if (team.captainId !== builderId) {
      return NextResponse.json(
        { ok: false, error: "仅队长可修改队伍状态" },
        { status: 403 }
      );
    }

    await updateTeam(teamId, { status });

    return NextResponse.json({ ok: true, data: { status } });
  } catch {
    return NextResponse.json(
      { ok: false, error: "服务器错误" },
      { status: 500 }
    );
  }
}
