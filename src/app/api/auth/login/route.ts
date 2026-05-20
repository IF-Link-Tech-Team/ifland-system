import { NextRequest, NextResponse } from "next/server";
import { getUserByBuilderId } from "@/lib/data-service";
import { withMockDelay } from "@/lib/mock-delay";

export async function POST(request: NextRequest) {
  await withMockDelay(500);

  try {
    const { builderId } = await request.json();

    if (!builderId || typeof builderId !== "string") {
      return NextResponse.json(
        { ok: false, error: "请输入 Builder 号" },
        { status: 400 }
      );
    }

    const user = await getUserByBuilderId(builderId);

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Builder 号不存在，请检查后重试" },
        { status: 401 }
      );
    }

    // 设置 HttpOnly Cookie，返回完整用户信息（避免登录后额外调用 /api/user/me）
    const response = NextResponse.json({
      builderId: user.builderId,
      name: user.name,
      phone: user.phone,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      bio: user.bio,
      teamId: user.teamId,
      abnormalMark: user.abnormalMark,
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
