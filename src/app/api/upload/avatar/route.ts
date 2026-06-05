import { NextRequest, NextResponse } from "next/server";
import { getBuilderIdFromCookie, unauthorizedResponse } from "@/lib/mock-db";
import { getUserByBuilderId, updateUser } from "@/lib/data-service";
import { uploadAvatar } from "@/lib/upload";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest) {
  const builderId = getBuilderIdFromCookie(request);
  if (!builderId) return unauthorizedResponse();

  const user = await getUserByBuilderId(builderId);
  if (!user) return unauthorizedResponse();

  try {
    const formData = await request.formData();
    const file = formData.get("avatar");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "请选择要上传的图片" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { ok: false, error: "图片大小不能超过 5MB" },
        { status: 400 }
      );
    }

    // 读取文件 buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    const avatarUrl = await uploadAvatar(buffer, file.name);

    // 更新用户头像
    await updateUser(builderId, { avatar: avatarUrl });

    return NextResponse.json({
      ok: true,
      data: { avatar: avatarUrl },
    });
  } catch (err) {
    console.error("[upload/avatar] 上传失败:", err);
    const message = err instanceof Error ? err.message : "上传失败";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
