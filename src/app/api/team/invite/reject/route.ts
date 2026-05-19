import { NextRequest, NextResponse } from "next/server";
import { getBuilderIdFromCookie, unauthorizedResponse } from "@/lib/mock-db";
import { getUserByBuilderId, getTeamById, updateTeam } from "@/lib/data-service";

const MOCK_DELAY = 300;

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

    team.pendingInvites = team.pendingInvites.filter((id) => id !== builderId);
    await updateTeam(teamId, { pendingInvites: team.pendingInvites });

    return NextResponse.json({ ok: true, data: null });
  } catch {
    return NextResponse.json(
      { ok: false, error: "服务器错误" },
      { status: 500 }
    );
  }
}
