import { NextRequest, NextResponse } from "next/server";
import { getUserByBuilderId, getUserByEmail } from "@/lib/data-service";
import { comparePassword } from "@/lib/crypto";
import { stripPassword } from "@/lib/crypto";
import { withMockDelay } from "@/lib/mock-delay";

export async function POST(request: NextRequest) {
  await withMockDelay(500);

  try {
    const body = await request.json();
    const { email, password, builderId } = body as {
      email?: string;
      password?: string;
      builderId?: string;
    };

    // Dev 模式：直接使用 builderId 登录（无需密码），仅在线下 mock 环境可用
    if (builderId && !email) {
      if (process.env.USE_FEISHU === "true") {
        return NextResponse.json(
          { ok: false, error: "请使用邮箱和密码登录" },
          { status: 400 }
        );
      }

      if (typeof builderId !== "string") {
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

      return makeLoginResponse(user);
    }

    // 正式模式：邮箱 + 密码登录
    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: "请输入邮箱和密码" },
        { status: 400 }
      );
    }

    const user = await getUserByEmail(email.toLowerCase().trim());

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "邮箱或密码错误" },
        { status: 401 }
      );
    }

    if (!user.password) {
      return NextResponse.json(
        { ok: false, error: "该账号尚未设置密码，请联系管理员" },
        { status: 401 }
      );
    }

    const valid = await comparePassword(password, user.password);

    if (!valid) {
      return NextResponse.json(
        { ok: false, error: "邮箱或密码错误" },
        { status: 401 }
      );
    }

    return makeLoginResponse(user);
  } catch {
    return NextResponse.json(
      { ok: false, error: "服务器错误" },
      { status: 500 }
    );
  }
}

function makeLoginResponse(user: { builderId: string; password?: string }) {
  const response = NextResponse.json(stripPassword(user));

  const isSecure = process.env.NODE_ENV === "production";
  response.cookies.set("auth_token", user.builderId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: isSecure,
    maxAge: 60 * 60 * 24, // 24 小时
  });

  return response;
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
