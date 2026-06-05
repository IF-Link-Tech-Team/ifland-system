import { NextRequest, NextResponse } from "next/server";
import { getBuilderIdFromCookie, unauthorizedResponse } from "@/lib/mock-db";
import { getUserByBuilderId, updateUser } from "@/lib/data-service";

export async function POST(request: NextRequest) {
  const builderId = getBuilderIdFromCookie(request);
  if (!builderId) return unauthorizedResponse();

  const user = await getUserByBuilderId(builderId);
  if (!user) return unauthorizedResponse();

  const newStatus = user.presenceStatus === "离场" ? "在场" : "离场";
  await updateUser(builderId, { presenceStatus: newStatus });

  return NextResponse.json({
    ok: true,
    data: { presenceStatus: newStatus },
  });
}
