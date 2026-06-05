import TosClient from "@volcengine/tos-sdk";
import path from "path";

// TOS 配置
const TOS_AK = process.env.TOS_AK;
const TOS_SK = process.env.TOS_SK;
const TOS_REGION = process.env.TOS_REGION || "cn-beijing";
const TOS_BUCKET = process.env.TOS_BUCKET || "ifland-avatars";

/**
 * 头像上传函数
 * 优先使用 TOS 云存储（需配置 TOS_AK/TOS_SK），
 * 未配置时降级为本地存储（仅开发环境）
 */
export async function uploadAvatar(
  buffer: Buffer,
  originalName: string
): Promise<string> {
  // 如果 TOS 凭证齐全，走云存储
  if (TOS_AK && TOS_SK) {
    console.log("[upload] 使用 TOS 云存储, bucket:", TOS_BUCKET, "region:", TOS_REGION);
    return uploadToTOS(buffer, originalName);
  }

  // 降级：本地存储（仅开发用）
  console.log("[upload] TOS 未配置，降级为本地存储");
  return uploadToLocal(buffer, originalName);
}

async function uploadToTOS(
  buffer: Buffer,
  originalName: string
): Promise<string> {
  const ext = path.extname(originalName) || ".png";
  const filename = `avatar_${Date.now()}${ext}`;

  const client = new TosClient({
    accessKeyId: TOS_AK!,
    accessKeySecret: TOS_SK!,
    region: TOS_REGION,
  });

  await client.putObject({
    bucket: TOS_BUCKET,
    key: filename,
    body: buffer,
    contentType: ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "image/png",
  });

  return `https://${TOS_BUCKET}.tos-${TOS_REGION}.volces.com/${filename}`;
}

async function uploadToLocal(
  buffer: Buffer,
  originalName: string
): Promise<string> {
  const fs = await import("fs");
  const UPLOAD_DIR = path.join(process.cwd(), "public/uploads");

  const ext = path.extname(originalName) || ".png";
  const filename = `avatar_${Date.now()}${ext}`;
  const filepath = path.join(UPLOAD_DIR, filename);

  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  fs.writeFileSync(filepath, buffer);

  return `/uploads/${filename}`;
}
