import { NextRequest, NextResponse } from "next/server";
import {
  readMockData,
  writeMockData,
  getBuilderIdFromCookie,
  findUserById,
  unauthorizedResponse,
} from "@/lib/mock-db";

const MOCK_DELAY = 300;

export async function POST(request: NextRequest) {
  await new Promise((r) => setTimeout(r, MOCK_DELAY));

  const builderId = getBuilderIdFromCookie(request);
  if (!builderId) return unauthorizedResponse();

  const data = readMockData();
  const user = findUserById(data, builderId);
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

    // 打异常标记
    user.abnormalMark = "申请离队";
    writeMockData(data);

    return NextResponse.json({ ok: true, data: null });
  } catch {
    return NextResponse.json(
      { ok: false, error: "服务器错误" },
      { status: 500 }
    );
  }
}
