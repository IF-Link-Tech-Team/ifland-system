import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForUserToken, getFeishuUserInfo } from "@/lib/feishu-oauth";
import { getUserByOpenId } from "@/lib/data-service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code || !state) {
      return NextResponse.redirect(new URL("/login?error=oauth_failed", request.url));
    }

    // 校验 state 防 CSRF
    const savedState = request.cookies.get("feishu_oauth_state")?.value;
    if (state !== savedState) {
      return NextResponse.redirect(new URL("/login?error=oauth_failed", request.url));
    }

    // 用 code 换 user_access_token
    const { accessToken } = await exchangeCodeForUserToken(code);

    // 获取飞书用户信息
    const feishuUser = await getFeishuUserInfo(accessToken);

    // 查找是否已绑定
    const user = await getUserByOpenId(feishuUser.openId);

    const isSecure = process.env.NODE_ENV === "production";

    if (user) {
      // 已绑定：直接登录
      const response = NextResponse.redirect(new URL("/dashboard", request.url));
      response.cookies.set("auth_token", user.builderId, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: isSecure,
        maxAge: 60 * 60 * 24,
      });
      // 清除临时 cookie
      response.cookies.set("feishu_oauth_state", "", { path: "/", maxAge: 0 });
      return response;
    }

    // 未绑定：跳转绑定页
    const response = NextResponse.redirect(new URL("/login?bind=1", request.url));
    response.cookies.set("feishu_pending_open_id", feishuUser.openId, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 600,
    });
    // 非 HttpOnly，供前端 UI 显示
    response.cookies.set(
      "feishu_pending_info",
      JSON.stringify({ name: feishuUser.name, avatarUrl: feishuUser.avatarUrl }),
      { path: "/", sameSite: "lax", maxAge: 600 }
    );
    response.cookies.set("feishu_oauth_state", "", { path: "/", maxAge: 0 });
    return response;
  } catch (err) {
    console.error("[feishu/callback] Error:", err);
    return NextResponse.redirect(new URL("/login?error=oauth_failed", request.url));
  }
}
