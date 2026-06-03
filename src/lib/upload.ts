import { TosClient } from "@volcengine/tos-sdk";
import path from "path";

// TOS 客户端单例
const tosClient =
  process.env.TOS_AK && process.env.TOS_SK
    ? new TosClient({
        accessKeyId: process.env.TOS_AK,
        accessKeySecret: process.env.TOS_SK,
        region: process.env.TOS_REGION || "cn-beijing",
        endpoint: `tos-${process.env.TOS_REGION || "cn-beijing"}.volces.com`,
      })
    : null;

const BUCKET = process.env.TOS_BUCKET || "";

/**
 * 头像上传函数
 * - TOS 已配置时：上传到火山引擎 TOS，返回公开 CDN URL
 * - TOS 未配置时：降级到本地 /public/uploads 存储
 */
export async function uploadAvatar(
  buffer: Buffer,
  originalName: string
): Promise<string> {
  const ext = path.extname(originalName) || ".png";
  const key = `avatars/avatar_${Date.now()}${ext}`;

  // TOS 云存储
  if (tosClient && BUCKET) {
    await tosClient.putObject({
      bucket: BUCKET,
      key,
      body: buffer,
      contentType: `image/${ext.replace(".", "")}`,
    });

    // 返回 TOS 公开访问 URL（公共读桶可直接访问）
    const region = process.env.TOS_REGION || "cn-beijing";
    return `https://${BUCKET}.tos-${region}.volces.com/${key}`;
  }

  // 降级：本地直存 (Phase 1)
  const fs = await import("fs");
  const UPLOAD_DIR = path.join(process.cwd(), "public/uploads");
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
  const filename = `avatar_${Date.now()}${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer);
  return `/uploads/${filename}`;
}
