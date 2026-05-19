import { NextRequest, NextResponse } from "next/server";
import { readMockData, getBuilderIdFromCookie, findUserById, unauthorizedResponse } from "@/lib/mock-db";

const MOCK_DELAY = 300;

export async function GET(request: NextRequest) {
  await new Promise((r) => setTimeout(r, MOCK_DELAY));

  const builderId = getBuilderIdFromCookie(request);
  if (!builderId) return unauthorizedResponse();

  const data = readMockData();
  const user = findUserById(data, builderId);
  if (!user) return unauthorizedResponse();

  return NextResponse.json({ ok: true, data: user });
}
