import { NextRequest, NextResponse } from "next/server";

const PROTECTED_PATHS = ["/dashboard"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 检查是否需要鉴权
  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  // 检查 Cookie 中是否有 auth_token
  const authToken = request.cookies.get("auth_token")?.value;
  if (!authToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
