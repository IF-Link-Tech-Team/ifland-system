import { NextRequest, NextResponse } from "next/server";
import {
  readMockData,
  writeMockData,
  getBuilderIdFromCookie,
  findUserById,
  findTeamById,
  unauthorizedResponse,
} from "@/lib/mock-db";
import type { TeamStatus } from "@/types";

const MOCK_DELAY = 300;
const VALID_STATUSES: TeamStatus[] = ["头脑风暴中", "开发中", "Demo提交"];

export async function PUT(request: NextRequest) {
  await new Promise((r) => setTimeout(r, MOCK_DELAY));

  const builderId = getBuilderIdFromCookie(request);
  if (!builderId) return unauthorizedResponse();

  const data = readMockData();
  const user = findUserById(data, builderId);
  if (!user) return unauthorizedResponse();

  try {
    const { teamId, status } = await request.json();
    if (!teamId || !status) {
      return NextResponse.json(
        { ok: false, error: "缺少队伍 ID 或状态" },
        { status: 400 }
      );
    }

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { ok: false, error: "无效的状态值" },
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

    // 仅队长可修改状态
    if (team.captainId !== builderId) {
      return NextResponse.json(
        { ok: false, error: "仅队长可修改队伍状态" },
        { status: 403 }
      );
    }

    team.status = status;
    writeMockData(data);

    return NextResponse.json({ ok: true, data: { status: team.status } });
  } catch {
    return NextResponse.json(
      { ok: false, error: "服务器错误" },
      { status: 500 }
    );
  }
}
