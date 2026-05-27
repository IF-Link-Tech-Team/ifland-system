import fs from "fs";
import path from "path";
import type { ConsentRecord, MockData } from "@/types";

const MOCK_PATH = path.join(process.cwd(), "src/mocks/mock_data.json");

/** 读取 mock 数据 */
export function readMockData(): MockData {
  const raw = fs.readFileSync(MOCK_PATH, "utf-8");
  return JSON.parse(raw);
}

/** 写入 mock 数据（用于状态变更操作） */
export function writeMockData(data: MockData): void {
  fs.writeFileSync(MOCK_PATH, JSON.stringify(data, null, 2), "utf-8");
}

/** 从 Cookie 中提取当前用户 builderId */
export function getBuilderIdFromCookie(
  request: { headers: { get: (name: string) => string | null } }
): string | null {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(/auth_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/** 根据 builderId 获取用户，未找到返回 null */
export function findUserById(data: MockData, builderId: string) {
  return data.users.find((u) => u.builderId === builderId) ?? null;
}

/** 根据 openId 获取用户，未找到返回 null */
export function findUserByOpenId(data: MockData, openId: string) {
  return data.users.find((u) => u.openId === openId) ?? null;
}

/** 根据团队 ID 获取团队，未找到返回 null */
export function findTeamById(data: MockData, teamId: string) {
  return data.teams.find((t) => t.teamId === teamId) ?? null;
}

/** 生成下一个团队 ID（现有最大编号 +1） */
export function generateNextTeamId(data: MockData): string {
  if (data.teams.length === 0) return "T-001";
  const nums = data.teams.map((t) => {
    const m = t.teamId.match(/T-(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  });
  const max = Math.max(...nums);
  return `T-${String(max + 1).padStart(3, "0")}`;
}

/** 查找用户的授权记录（按场景） */
export function findConsentByBuilderId(
  data: MockData,
  builderId: string,
  scene: string
): ConsentRecord | null {
  return (
    data.consentRecords.find(
      (r) => r.builderId === builderId && r.scene === scene
    ) ?? null
  );
}

/** 新增授权记录 */
export function addConsentRecord(data: MockData, record: ConsentRecord): void {
  data.consentRecords.push(record);
}

/** 返回未鉴权错误响应 */
export function unauthorizedResponse() {
  return new Response(JSON.stringify({ ok: false, error: "未登录或登录已过期" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}
