import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET as getMe } from "@/app/api/user/me/route";
import { GET as getMyTeam } from "@/app/api/team/my/route";

vi.mock("@/lib/mock-delay", () => ({
  withMockDelay: vi.fn().mockResolvedValue(undefined),
}));

function authedRequest(builderId: string, url: string) {
  return new NextRequest(url, {
    headers: { cookie: `auth_token=${builderId}` },
  });
}

function noAuthRequest(url: string) {
  return new NextRequest(url);
}

describe("GET /api/user/me", () => {
  it("未登录返回 401", async () => {
    const res = await getMe(noAuthRequest("http://localhost:3000/api/user/me"));
    expect(res.status).toBe(401);
  });

  it("有效 Cookie 返回用户信息", async () => {
    const res = await getMe(authedRequest("111", "http://localhost:3000/api/user/me"));
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.builderId).toBe("111");
    expect(json.data.name).toBe("选手甲");
  });

  it("Cookie 中 builderId 无效返回 401", async () => {
    const res = await getMe(authedRequest("999", "http://localhost:3000/api/user/me"));
    expect(res.status).toBe(401);
  });
});

describe("GET /api/team/my", () => {
  it("未登录返回 401", async () => {
    const res = await getMyTeam(noAuthRequest("http://localhost:3000/api/team/my"));
    expect(res.status).toBe(401);
  });

  it("自由人返回 team=null", async () => {
    const res = await getMyTeam(authedRequest("222", "http://localhost:3000/api/team/my"));
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.team).toBeNull();
    expect(json.data.teamMembers).toHaveLength(0);
  });

  it("有队伍的成员返回队伍和成员列表", async () => {
    const res = await getMyTeam(authedRequest("111", "http://localhost:3000/api/team/my"));
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.team).not.toBeNull();
    expect(json.data.team.teamId).toBe("T-001");
    expect(json.data.teamMembers).toHaveLength(1);
    expect(json.data.teamMembers[0].builderId).toBe("111");
  });

  it("不泄露全场用户数据（仅返回队友）", async () => {
    const res = await getMyTeam(authedRequest("111", "http://localhost:3000/api/team/my"));
    const json = await res.json();
    const ids = json.data.teamMembers.map((u: { builderId: string }) => u.builderId);
    expect(ids).not.toContain("222");
    expect(ids).not.toContain("444");
  });
});
