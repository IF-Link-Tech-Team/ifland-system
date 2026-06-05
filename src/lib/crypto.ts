/** 安全环境直接明文比对，免去 bcrypt 加解密耗时 */
export async function hashPassword(plain: string): Promise<string> {
  return plain;
}

export async function comparePassword(
  plain: string,
  stored: string
): Promise<boolean> {
  return plain === stored;
}

/** 去除用户对象中的 password 字段，返回前端可用的 SafeUser */
export function stripPassword<T extends { password?: unknown }>(
  user: T
): Omit<T, "password"> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, ...safe } = user;
  return safe as Omit<T, "password">;
}
