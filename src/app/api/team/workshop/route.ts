import { NextRequest, NextResponse } from "next/server";
import { getBuilderIdFromCookie, unauthorizedResponse } from "@/lib/mock-db";
import { getUserByBuilderId, getTeamById, updateTeam } from "@/lib/data-service";
import type { Workshop } from "@/types";
import { withMockDelay } from "@/lib/mock-delay";

const VALID_WORKSHOPS: Workshop[] = ["工坊一(313)", "工坊二(314)", "工坊三(309)"];

export async function PUT(request: NextRequest) {
  await withMockDelay(300);

  const builderId = getBuilderIdFromCookie(request);
  if (!builderId) return unauthorizedResponse();

  const user = await getUserByBuilderId(builderId);
  if (!user) return unauthorizedResponse();

  try {
    const { workshop } = await request.json();

    // workshop 为空字符串或 null 表示离开工坊
    if (workshop !== null && workshop !== "" && !VALID_WORKSHOPS.includes(workshop)) {
      return NextResponse.json(
        { ok: false, error: "无效的工坊选项" },
        { status: 400 }
      );
    }

    const teamId = user.teamId;
    if (!teamId) {
      return NextResponse.json(
        { ok: false, error: "你未加入任何队伍" },
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

    if (team.captainId !== builderId) {
      return NextResponse.json(
        { ok: false, error: "仅队长可选择工坊" },
        { status: 403 }
      );
    }

    const workshopValue = workshop || null;
    await updateTeam(teamId, { workshop: workshopValue });

    return NextResponse.json({ ok: true, data: { workshop: workshopValue } });
  } catch {
    return NextResponse.json(
      { ok: false, error: "服务器错误" },
      { status: 500 }
    );
  }
}
