import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { PUT as updateName } from "@/app/api/team/name/route";
import { PUT as updateSlogan } from "@/app/api/team/slogan/route";
import { PUT as updateStatus } from "@/app/api/team/status/route";
import { POST as leaveRequest } from "@/app/api/team/leave-request/route";
import { readMockData, writeMockData } from "@/lib/mock-db";

vi.mock("@/lib/mock-delay", () => ({
  withMockDelay: vi.fn().mockResolvedValue(undefined),
}));

function authedPut(builderId: string, body: unknown, url: string) {
  return new NextRequest(url, {
    method: "PUT",
    headers: { cookie: `auth_token=${builderId}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function authedPost(builderId: string, body: unknown, url: string) {
  return new NextRequest(url, {
    method: "POST",
    headers: { cookie: `auth_token=${builderId}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function noAuthPut(url: string, body: unknown) {
  return new NextRequest(url, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PUT /api/team/name", () => {
  it("未登录返回 401", async () => {
    const res = await updateName(noAuthPut("http://localhost:3000/api/team/name", { teamId: "T-001", name: "新队名" }));
    expect(res.status).toBe(401);
  });

  it("非队长修改返回 403", async () => {
    const data = readMockData();
    data.users.find((u) => u.builderId === "222")!.teamId = "T-001";
    data.teams.find((t) => t.teamId === "T-001")!.memberIds.push("222");
    writeMockData(data);

    const res = await updateName(authedPut("222", { teamId: "T-001", name: "改名" }, "http://localhost:3000/api/team/name"));
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toContain("队长");
  });

  it("缺少参数返回 400", async () => {
    const res = await updateName(authedPut("111", { teamId: "T-001" }, "http://localhost:3000/api/team/name"));
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toContain("缺少");
  });

  it("队长成功修改队名", async () => {
    const res = await updateName(authedPut("111", { teamId: "T-001", name: "新队名" }, "http://localhost:3000/api/team/name"));
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.name).toBe("新队名");
  });
});

describe("PUT /api/team/slogan", () => {
  it("非队长修改返回 403", async () => {
    const data = readMockData();
    data.users.find((u) => u.builderId === "222")!.teamId = "T-001";
    data.teams.find((t) => t.teamId === "T-001")!.memberIds.push("222");
    writeMockData(data);

    const res = await updateSlogan(authedPut("222", { teamId: "T-001", slogan: "新宣言" }, "http://localhost:3000/api/team/slogan"));
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toContain("队长");
  });

  it("队长成功修改宣言", async () => {
    const res = await updateSlogan(authedPut("111", { teamId: "T-001", slogan: "全新宣言" }, "http://localhost:3000/api/team/slogan"));
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.slogan).toBe("全新宣言");
  });
});

describe("PUT /api/team/status", () => {
  it("无效状态值返回 400", async () => {
    const res = await updateStatus(authedPut("111", { teamId: "T-001", status: "无效状态" }, "http://localhost:3000/api/team/status"));
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toContain("无效");
  });

  it("非队长修改返回 403", async () => {
    const data = readMockData();
    data.users.find((u) => u.builderId === "222")!.teamId = "T-001";
    data.teams.find((t) => t.teamId === "T-001")!.memberIds.push("222");
    writeMockData(data);

    const res = await updateStatus(authedPut("222", { teamId: "T-001", status: "开发中" }, "http://localhost:3000/api/team/status"));
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toContain("队长");
  });

  it("队长成功切换状态", async () => {
    const res = await updateStatus(authedPut("111", { teamId: "T-001", status: "开发中" }, "http://localhost:3000/api/team/status"));
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.status).toBe("开发中");
  });
});

describe("POST /api/team/leave-request", () => {
  it("未入队返回 400", async () => {
    const res = await leaveRequest(authedPost("222", {}, "http://localhost:3000/api/team/leave-request"));
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toContain("未加入");
  });

  it("已有异常标记返回 400（防重复）", async () => {
    const data = readMockData();
    data.users.find((u) => u.builderId === "111")!.abnormalMark = "申请离队";
    writeMockData(data);

    const res = await leaveRequest(authedPost("111", {}, "http://localhost:3000/api/team/leave-request"));
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toContain("重复");
  });

  it("成功申请离队：API 返回 ok", async () => {
    const res = await leaveRequest(authedPost("111", {}, "http://localhost:3000/api/team/leave-request"));
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});
