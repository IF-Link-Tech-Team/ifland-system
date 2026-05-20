import { NextResponse } from "next/server";
import { getFeishuAuthUrl } from "@/lib/feishu-oauth";
import crypto from "crypto";

const REDIRECT_BASE = () => process.env.FEISHU_OAUTH_REDIRECT_BASE ?? "http://localhost:3000";

export async function GET() {
  const state = crypto.randomBytes(16).toString("hex");
  const redirectUri = `${REDIRECT_BASE()}/api/auth/feishu/callback`;
  const url = getFeishuAuthUrl(redirectUri, state);

  const response = NextResponse.json({ ok: true, data: { url } });
  response.cookies.set("feishu_oauth_state", state, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 600, // 10 分钟
  });
  return response;
}
