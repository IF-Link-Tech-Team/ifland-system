import { NextRequest, NextResponse } from "next/server";
import { getBuilderIdFromCookie, unauthorizedResponse } from "@/lib/mock-db";
import { getUserByBuilderId, updateUser } from "@/lib/data-service";
import { ROLE_LABELS } from "@/types";

/** PUT /api/user/role — 选择角色（仅限 ANOMALY 状态可改，且只能改一次） */
export async function PUT(request: NextRequest) {
  const builderId = getBuilderIdFromCookie(request);
  if (!builderId) return unauthorizedResponse();

  const user = await getUserByBuilderId(builderId);
  if (!user) return unauthorizedResponse();

  // 已选角色不可再改
  if (user.role !== "ANOMALY") {
    return NextResponse.json(
      { ok: false, error: "角色已选择，不可更改" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { role } = body as { role?: string };

  if (!role || !(role in ROLE_LABELS) || role === "ANOMALY") {
    return NextResponse.json(
      { ok: false, error: "请选择有效角色" },
      { status: 400 }
    );
  }

  await updateUser(builderId, { role: role as typeof user.role });

  return NextResponse.json({ ok: true, data: { role } });
}
