import { NextRequest, NextResponse } from "next/server";
import { getBuilderIdFromCookie, unauthorizedResponse } from "@/lib/mock-db";
import { getUserByBuilderId } from "@/lib/data-service";

const MOCK_DELAY = 300;

export async function GET(request: NextRequest) {
  if (process.env.USE_FEISHU !== "true") {
    await new Promise((r) => setTimeout(r, MOCK_DELAY));
  }

  const builderId = getBuilderIdFromCookie(request);
  if (!builderId) return unauthorizedResponse();

  const user = await getUserByBuilderId(builderId);
  if (!user) return unauthorizedResponse();

  return NextResponse.json({ ok: true, data: user });
}
