import fs from "fs";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "public/uploads");

/**
 * 头像上传函数 (Phase 1: 本地直存)
 * Phase 2 切换为 TOS 时仅需修改此函数内部实现
 *
 * @param buffer - 图片二进制数据
 * @param originalName - 原始文件名
 * @returns 图片的公开访问 URL
 */
export async function uploadAvatar(
  buffer: Buffer,
  originalName: string
): Promise<string> {
  // Phase 1: 保存到本地 /public/uploads
  const ext = path.extname(originalName) || ".png";
  const filename = `avatar_${Date.now()}${ext}`;
  const filepath = path.join(UPLOAD_DIR, filename);

  // 确保上传目录存在
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  fs.writeFileSync(filepath, buffer);

  // 返回相对于 localhost 的静态资源 URL
  return `/uploads/${filename}`;
}
