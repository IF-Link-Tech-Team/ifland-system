import { NextRequest, NextResponse } from "next/server";
import { getUserByBuilderId, bindOpenId } from "@/lib/data-service";

export async function POST(request: NextRequest) {
  try {
    const openId = request.cookies.get("feishu_pending_open_id")?.value;
    if (!openId) {
      return NextResponse.json(
        { ok: false, error: "无待绑定的飞书账号，请重新登录" },
        { status: 401 }
      );
    }

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
        { ok: false, error: "Builder 号不存在" },
        { status: 401 }
      );
    }

    if (user.openId) {
      return NextResponse.json(
        { ok: false, error: "该 Builder 号已绑定其他飞书账号" },
        { status: 400 }
      );
    }

    const bound = await bindOpenId(builderId, openId);
    if (!bound) {
      return NextResponse.json(
        { ok: false, error: "绑定失败，该飞书账号可能已被其他 Builder 号绑定" },
        { status: 400 }
      );
    }

    // 刷新用户数据（含 openId）
    const updatedUser = await getUserByBuilderId(builderId);
    if (!updatedUser) {
      return NextResponse.json(
        { ok: false, error: "服务器错误" },
        { status: 500 }
      );
    }

    const isSecure = process.env.NODE_ENV === "production";
    const response = NextResponse.json({
      builderId: updatedUser.builderId,
      name: updatedUser.name,
      phone: updatedUser.phone,
      email: updatedUser.email,
      avatar: updatedUser.avatar,
      role: updatedUser.role,
      bio: updatedUser.bio,
      teamId: updatedUser.teamId,
      abnormalMark: updatedUser.abnormalMark,
      openId: updatedUser.openId,
      presenceStatus: updatedUser.presenceStatus,
    });

    response.cookies.set("auth_token", updatedUser.builderId, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: isSecure,
      maxAge: 60 * 60 * 24,
    });
    // 清除临时 cookie
    response.cookies.set("feishu_pending_open_id", "", { path: "/", maxAge: 0 });
    response.cookies.set("feishu_pending_info", "", { path: "/", maxAge: 0 });

    return response;
  } catch (err) {
    console.error("[feishu/bind] Error:", err);
    return NextResponse.json(
      { ok: false, error: "服务器错误" },
      { status: 500 }
    );
  }
}
