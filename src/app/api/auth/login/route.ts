import { NextRequest, NextResponse } from "next/server";
import { readMockData } from "@/lib/mock-db";

const MOCK_DELAY = 500;

export async function POST(request: NextRequest) {
  await new Promise((r) => setTimeout(r, MOCK_DELAY));

  try {
    const { builderId } = await request.json();

    if (!builderId || typeof builderId !== "string") {
      return NextResponse.json(
        { ok: false, error: "请输入 Builder 号" },
        { status: 400 }
      );
    }

    const data = readMockData();
    const user = data.users.find((u) => u.builderId === builderId);

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Builder 号不存在，请检查后重试" },
        { status: 401 }
      );
    }

    // 设置 HttpOnly Cookie
    const response = NextResponse.json({
      builderId: user.builderId,
      name: user.name,
      role: user.role,
      teamId: user.teamId,
    });

    response.cookies.set("auth_token", user.builderId, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 小时
    });

    return response;
  } catch {
    return NextResponse.json(
      { ok: false, error: "服务器错误" },
      { status: 500 }
    );
  }
}

/** 退出登录：清除 Cookie */
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set("auth_token", "", {
    path: "/",
    httpOnly: true,
    maxAge: 0,
  });
  return response;
}
