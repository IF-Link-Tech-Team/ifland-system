import { NextRequest, NextResponse } from "next/server";
import { getBuilderIdFromCookie, unauthorizedResponse } from "@/lib/mock-db";
import { getUserByBuilderId, getTeamById, updateUser } from "@/lib/data-service";
import { withMockDelay } from "@/lib/mock-delay";

export async function POST(request: NextRequest) {
  await withMockDelay(300);

  const builderId = getBuilderIdFromCookie(request);
  if (!builderId) return unauthorizedResponse();

  const user = await getUserByBuilderId(builderId);
  if (!user) return unauthorizedResponse();

  try {
    if (!user.teamId) {
      return NextResponse.json(
        { ok: false, error: "你当前未加入任何队伍" },
        { status: 400 }
      );
    }

    if (user.abnormalMark) {
      return NextResponse.json(
        { ok: false, error: "已申请离队，请勿重复操作" },
        { status: 400 }
      );
    }

    // I-11: 队长不能直接申请离队
    const team = await getTeamById(user.teamId);
    if (team && team.captainId === builderId) {
      return NextResponse.json(
        { ok: false, error: "队长不能直接申请离队，请先转让队长权限" },
        { status: 403 }
      );
    }

    await updateUser(builderId, { abnormalMark: "申请离队" });

    return NextResponse.json({ ok: true, data: null });
  } catch {
    return NextResponse.json(
      { ok: false, error: "服务器错误" },
      { status: 500 }
    );
  }
}
