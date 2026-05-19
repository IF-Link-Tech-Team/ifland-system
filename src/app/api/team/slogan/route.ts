import { NextRequest, NextResponse } from "next/server";
import {
  readMockData,
  writeMockData,
  getBuilderIdFromCookie,
  findUserById,
  findTeamById,
  unauthorizedResponse,
} from "@/lib/mock-db";

const MOCK_DELAY = 300;

export async function PUT(request: NextRequest) {
  await new Promise((r) => setTimeout(r, MOCK_DELAY));

  const builderId = getBuilderIdFromCookie(request);
  if (!builderId) return unauthorizedResponse();

  const data = readMockData();
  const user = findUserById(data, builderId);
  if (!user) return unauthorizedResponse();

  try {
    const { teamId, slogan } = await request.json();
    if (!teamId || typeof slogan !== "string") {
      return NextResponse.json(
        { ok: false, error: "缺少队伍 ID 或宣言" },
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

    // 仅队长可修改
    if (team.captainId !== builderId) {
      return NextResponse.json(
        { ok: false, error: "仅队长可修改宣言" },
        { status: 403 }
      );
    }

    team.slogan = slogan.trim();
    writeMockData(data);

    return NextResponse.json({ ok: true, data: { slogan: team.slogan } });
  } catch {
    return NextResponse.json(
      { ok: false, error: "服务器错误" },
      { status: 500 }
    );
  }
}
