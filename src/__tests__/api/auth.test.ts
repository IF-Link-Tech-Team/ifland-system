import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST, DELETE } from "@/app/api/auth/login/route";

vi.mock("@/lib/mock-delay", () => ({
  withMockDelay: vi.fn().mockResolvedValue(undefined),
}));

function makeLoginRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/login", () => {
  it("缺少登录参数时返回 400", async () => {
    const req = makeLoginRequest({});
    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.ok).toBe(false);
    expect(json.error).toContain("邮箱");
  });

  it("builderId 不存在时返回 401", async () => {
    const req = makeLoginRequest({ builderId: "999" });
    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(401);
    expect(json.ok).toBe(false);
    expect(json.error).toContain("不存在");
  });

  it("登录成功时返回用户信息并设置 Cookie", async () => {
    const req = makeLoginRequest({ builderId: "111" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.builderId).toBe("111");
    expect(json.name).toBe("选手甲");
    expect(json.role).toBe("NAVIGATOR");
    expect(json.teamId).toBe("T-001");

    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toContain("auth_token=111");
    expect(setCookie).toContain("HttpOnly");
  });
});

describe("DELETE /api/auth/login (退出登录)", () => {
  it("清除 auth_token Cookie", async () => {
    const res = await DELETE();
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toContain("auth_token=");
    expect(setCookie).toContain("Max-Age=0");
  });
});
