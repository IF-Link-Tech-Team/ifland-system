import { NextRequest, NextResponse } from "next/server";
import { getBuilderIdFromCookie, unauthorizedResponse } from "@/lib/mock-db";
import { getUserByBuilderId, getTeamById, updateTeam } from "@/lib/data-service";
import { withMockDelay } from "@/lib/mock-delay";

export async function PUT(request: NextRequest) {
  await withMockDelay(300);

  const builderId = getBuilderIdFromCookie(request);
  if (!builderId) return unauthorizedResponse();

  const user = await getUserByBuilderId(builderId);
  if (!user) return unauthorizedResponse();

  try {
    const { teamId: bodyTeamId, name } = await request.json();
    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { ok: false, error: "缺少队名" },
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
    // 校验请求体中的 teamId（如提供）必须与用户所属队伍一致
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
        { ok: false, error: "仅队长可修改队名" },
        { status: 403 }
      );
    }

    await updateTeam(teamId, { name: name.trim() });

    return NextResponse.json({ ok: true, data: { name: name.trim() } });
  } catch {
    return NextResponse.json(
      { ok: false, error: "服务器错误" },
      { status: 500 }
    );
  }
}
