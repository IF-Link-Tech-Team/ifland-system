import { describe, it, expect, vi } from "vitest";
import { GET as getSystemStatus } from "@/app/api/system/status/route";
import { GET as getScreenTeams } from "@/app/api/screen/teams/route";

vi.mock("@/lib/mock-delay", () => ({
  withMockDelay: vi.fn().mockResolvedValue(undefined),
}));

describe("GET /api/system/status", () => {
  it("返回系统状态（无需鉴权）", async () => {
    const res = await getSystemStatus();
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.marqueeNotice).toBeDefined();
    expect(json.data.endTime).toBeDefined();
  });
});

describe("GET /api/screen/teams", () => {
  it("返回全场队伍列表（无需鉴权）", async () => {
    const res = await getScreenTeams();
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data).toHaveLength(2);
    expect(json.data[0].teamId).toBeDefined();
    expect(json.data[0].name).toBeDefined();
    expect(json.data[0].members).toBeDefined();
    expect(json.data[0].memberCount).toBe(json.data[0].members.length);
  });

  it("成员头像为空时使用 DiceBear 默认头像", async () => {
    const res = await getScreenTeams();
    const json = await res.json();
    const team001 = json.data.find((t: { teamId: string }) => t.teamId === "T-001");
    const member111 = team001.members.find((m: { builderId: string }) => m.builderId === "111");
    expect(member111.avatar).toContain("dicebear");
  });
});
