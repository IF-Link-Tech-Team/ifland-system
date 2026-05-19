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
    const { teamId, name } = await request.json();
    if (!teamId || !name || typeof name !== "string") {
      return NextResponse.json(
        { ok: false, error: "缺少队伍 ID 或队名" },
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
        { ok: false, error: "仅队长可修改队名" },
        { status: 403 }
      );
    }

    team.name = name.trim();
    writeMockData(data);

    return NextResponse.json({ ok: true, data: { name: team.name } });
  } catch {
    return NextResponse.json(
      { ok: false, error: "服务器错误" },
      { status: 500 }
    );
  }
}
