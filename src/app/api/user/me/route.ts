import { NextRequest, NextResponse } from "next/server";
import { getBuilderIdFromCookie, unauthorizedResponse } from "@/lib/mock-db";
import { getUserByBuilderId } from "@/lib/data-service";
import { stripPassword } from "@/lib/crypto";
import { withMockDelay } from "@/lib/mock-delay";

export async function GET(request: NextRequest) {
  await withMockDelay(300);

  const builderId = getBuilderIdFromCookie(request);
  if (!builderId) return unauthorizedResponse();

  const user = await getUserByBuilderId(builderId);
  if (!user) return unauthorizedResponse();

  return NextResponse.json({ ok: true, data: stripPassword(user) });
}
