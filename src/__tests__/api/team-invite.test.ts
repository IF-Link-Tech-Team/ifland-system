import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST as invite } from "@/app/api/team/invite/route";
import { POST as accept } from "@/app/api/team/invite/accept/route";
import { POST as reject } from "@/app/api/team/invite/reject/route";
import { GET as received } from "@/app/api/team/invites/received/route";
import { readMockData, writeMockData } from "@/lib/mock-db";

vi.mock("@/lib/mock-delay", () => ({
  withMockDelay: vi.fn().mockResolvedValue(undefined),
}));

function authedRequest(builderId: string, body?: unknown, url?: string) {
  const headers: Record<string, string> = { cookie: `auth_token=${builderId}` };
  if (body) headers["content-type"] = "application/json";
  return new NextRequest(url ?? "http://localhost:3000/api/test", {
    method: "POST",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

function authedGet(builderId: string, url: string) {
  return new NextRequest(url, { headers: { cookie: `auth_token=${builderId}` } });
}

describe("POST /api/team/invite", () => {
  it("未登录返回 401", async () => {
    const req = new NextRequest("http://localhost:3000/api/team/invite", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ targetBuilderId: "222" }),
    });
    const res = await invite(req);
    expect(res.status).toBe(401);
  });

  it("不能邀请自己", async () => {
    const res = await invite(authedRequest("111", { targetBuilderId: "111" }));
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toContain("自己");
  });

  it("目标不存在返回 404", async () => {
    const res = await invite(authedRequest("111", { targetBuilderId: "999" }));
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toContain("不存在");
  });

  it("目标已入队返回 400", async () => {
    const res = await invite(authedRequest("111", { targetBuilderId: "444" }));
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toContain("已加入");
  });

  it("非队长邀请返回 403", async () => {
    const data = readMockData();
    data.users.find((u) => u.builderId === "222")!.teamId = "T-001";
    data.teams.find((t) => t.teamId === "T-001")!.memberIds.push("222");
    writeMockData(data);

    const res = await invite(authedRequest("222", { targetBuilderId: "333" }));
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toContain("队长");
  });

  it("队伍满员（含 pending）返回 400", async () => {
    const data = readMockData();
    // T-001: 111 + 222 在队，333 在 pending = 3 人满
    const team = data.teams.find((t) => t.teamId === "T-001")!;
    team.memberIds = ["111", "222"];
    team.pendingInvites = ["333"];
    data.users.find((u) => u.builderId === "222")!.teamId = "T-001";
    writeMockData(data);

    // 邀请 333 — 333 是自由人且不在 pendingInvites 中... 不，333 已在 pending 中
    // 用 444 来测试满员 — 但 444 在 T-002 中，会先触发"已加入"
    // 所以改用另一个场景：111 邀请 333，但 333 已在 pending 中
    // 会被"已向该选手发送过邀请"拦截，而非"满员"
    // 真正测试满员：需要 3 个 slot 已占 + 目标是自由人
    // 用 444：先让 444 变自由人
    data.users.find((u) => u.builderId === "444")!.teamId = null;
    data.teams.find((t) => t.teamId === "T-002")!.memberIds = [];
    writeMockData(data);

    const res = await invite(authedRequest("111", { targetBuilderId: "444" }));
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toContain("满");
  });

  it("重复邀请返回 400", async () => {
    const data = readMockData();
    data.teams.find((t) => t.teamId === "T-001")!.pendingInvites.push("222");
    writeMockData(data);

    const res = await invite(authedRequest("111", { targetBuilderId: "222" }));
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toContain("已向该选手");
  });

  it("自由人邀请时自动创建队伍", async () => {
    const res = await invite(authedRequest("222", { targetBuilderId: "333" }));
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.teamId).toBe("T-003");
    expect(json.data.pendingInvites).toContain("333");
  });

  it("队长成功邀请自由人", async () => {
    const res = await invite(authedRequest("111", { targetBuilderId: "222" }));
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.pendingInvites).toContain("222");
  });
});

describe("POST /api/team/invite/accept", () => {
  it("未登录返回 401", async () => {
    const req = new NextRequest("http://localhost:3000/api/team/invite/accept", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ teamId: "T-001" }),
    });
    const res = await accept(req);
    expect(res.status).toBe(401);
  });

  it("已入队不能接受新邀请", async () => {
    const data = readMockData();
    data.users.find((u) => u.builderId === "222")!.teamId = "T-002";
    writeMockData(data);

    const res = await accept(authedRequest("222", { teamId: "T-001" }));
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toContain("已加入");
  });

  it("未收到邀请返回 400", async () => {
    const res = await accept(authedRequest("222", { teamId: "T-001" }));
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toContain("未收到");
  });

  it("成功接受邀请：返回正确数据", async () => {
    const data = readMockData();
    data.teams.find((t) => t.teamId === "T-001")!.pendingInvites.push("222");
    writeMockData(data);

    const res = await accept(authedRequest("222", { teamId: "T-001" }));
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.memberIds).toContain("222");
  });

  it("排他清理：接受 T-001 后从 T-002 的 pendingInvites 中移除", async () => {
    const data = readMockData();
    data.teams.find((t) => t.teamId === "T-001")!.pendingInvites.push("222");
    data.teams.find((t) => t.teamId === "T-002")!.pendingInvites.push("222");
    writeMockData(data);

    const res = await accept(authedRequest("222", { teamId: "T-001" }));
    const json = await res.json();
    expect(json.ok).toBe(true);

    const updated = readMockData();
    expect(updated.teams.find((t) => t.teamId === "T-002")!.pendingInvites).not.toContain("222");
  });

  it("排他清理：超过 5 个其他队伍也全部移除 pendingInvites", async () => {
    const data = readMockData();
    data.teams.find((t) => t.teamId === "T-001")!.pendingInvites.push("222");
    data.teams.find((t) => t.teamId === "T-002")!.pendingInvites.push("222");
    for (let i = 3; i <= 9; i++) {
      data.teams.push({
        teamId: `T-${String(i).padStart(3, "0")}`,
        name: `测试队伍 ${i}`,
        slogan: "",
        captainId: "444",
        memberIds: [],
        pendingInvites: ["222"],
        status: "头脑风暴中",
        abnormalMark: null,
        workshop: null,
      });
    }
    writeMockData(data);

    const res = await accept(authedRequest("222", { teamId: "T-001" }));
    const json = await res.json();
    expect(json.ok).toBe(true);

    const updated = readMockData();
    const leakingTeams = updated.teams.filter(
      (team) => team.teamId !== "T-001" && team.pendingInvites.includes("222")
    );
    expect(leakingTeams).toHaveLength(0);
  });

  it("队伍已满员时接受返回 400", async () => {
    const data = readMockData();
    const team = data.teams.find((t) => t.teamId === "T-001")!;
    team.memberIds = ["111", "222", "333"];
    team.pendingInvites = ["444"];
    data.users.find((u) => u.builderId === "222")!.teamId = "T-001";
    data.users.find((u) => u.builderId === "333")!.teamId = "T-001";
    data.users.find((u) => u.builderId === "444")!.teamId = null;
    data.teams.find((t) => t.teamId === "T-002")!.memberIds = [];
    writeMockData(data);

    const res = await accept(authedRequest("444", { teamId: "T-001" }));
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toContain("满员");
  });
});

describe("POST /api/team/invite/reject", () => {
  it("未收到邀请返回 400", async () => {
    const res = await reject(authedRequest("222", { teamId: "T-001" }));
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toContain("未收到");
  });

  it("成功拒绝：API 返回 ok", async () => {
    const data = readMockData();
    data.teams.find((t) => t.teamId === "T-001")!.pendingInvites.push("222");
    writeMockData(data);

    const res = await reject(authedRequest("222", { teamId: "T-001" }));
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});

describe("GET /api/team/invites/received", () => {
  it("未登录返回 401", async () => {
    const res = await received(new NextRequest("http://localhost:3000/api/team/invites/received"));
    expect(res.status).toBe(401);
  });

  it("无邀请时返回空列表", async () => {
    const res = await received(authedGet("222", "http://localhost:3000/api/team/invites/received"));
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data).toHaveLength(0);
  });

  it("有邀请时返回邀请列表", async () => {
    const data = readMockData();
    data.teams.find((t) => t.teamId === "T-001")!.pendingInvites.push("222");
    data.teams.find((t) => t.teamId === "T-002")!.pendingInvites.push("222");
    writeMockData(data);

    const res = await received(authedGet("222", "http://localhost:3000/api/team/invites/received"));
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data).toHaveLength(2);
    expect(json.data[0].teamId).toBeDefined();
    expect(json.data[0].captainName).toBeDefined();
  });
});
