import { describe, it, expect, beforeEach } from "vitest";
import fs from "fs";
import path from "path";
import type { MockData } from "@/types";

const MOCK_PATH = path.join(process.cwd(), "src/mocks/mock_data.json");
const ORIGINAL_DATA = fs.readFileSync(MOCK_PATH, "utf-8");

function readMockData(): MockData {
  return JSON.parse(fs.readFileSync(MOCK_PATH, "utf-8"));
}

function writeMockData(data: MockData): void {
  fs.writeFileSync(MOCK_PATH, JSON.stringify(data, null, 2), "utf-8");
}

// 每个测试前恢复原始数据
beforeEach(() => {
  fs.writeFileSync(MOCK_PATH, ORIGINAL_DATA, "utf-8");
});

describe("mock-db 工具函数", () => {
  it("readMockData 返回正确的数据结构", () => {
    const data = readMockData();
    expect(data.users).toHaveLength(4);
    expect(data.teams).toHaveLength(2);
    expect(data.system).toBeDefined();
  });

  it("用户 111 是 T-001 队长", () => {
    const data = readMockData();
    const user111 = data.users.find((u) => u.builderId === "111");
    expect(user111?.teamId).toBe("T-001");

    const team001 = data.teams.find((t) => t.teamId === "T-001");
    expect(team001?.captainId).toBe("111");
    expect(team001?.memberIds).toContain("111");
  });

  it("用户 222 是自由人", () => {
    const data = readMockData();
    const user222 = data.users.find((u) => u.builderId === "222");
    expect(user222?.teamId).toBeNull();
  });
});

describe("组队逻辑 - 邀请流程", () => {
  it("队长邀请自由人后 pendingInvites 正确追加", () => {
    const data = readMockData();
    const team = data.teams.find((t) => t.teamId === "T-001")!;
    team.pendingInvites.push("222");
    writeMockData(data);

    const updated = readMockData();
    const updatedTeam = updated.teams.find((t) => t.teamId === "T-001")!;
    expect(updatedTeam.pendingInvites).toContain("222");
  });

  it("锁位校验: memberIds + pendingInvites >= 3 时禁止邀请", () => {
    const data = readMockData();
    const team = data.teams.find((t) => t.teamId === "T-001")!;

    // 当前 1 人 + 2 个 pending = 3，达到上限
    team.pendingInvites = ["222", "333"];
    writeMockData(data);

    const updated = readMockData();
    const updatedTeam = updated.teams.find((t) => t.teamId === "T-001")!;
    const isFull = updatedTeam.memberIds.length + updatedTeam.pendingInvites.length >= 3;
    expect(isFull).toBe(true);
  });
});

describe("组队逻辑 - 接受邀请与排他清理", () => {
  it("接受邀请后成员正确加入 + pendingInvites 移除", () => {
    const data = readMockData();
    const team = data.teams.find((t) => t.teamId === "T-001")!;
    team.pendingInvites.push("222");

    // 模拟接受
    const user222 = data.users.find((u) => u.builderId === "222")!;
    user222.teamId = "T-001";
    team.memberIds.push("222");
    team.pendingInvites = team.pendingInvites.filter((id) => id !== "222");
    writeMockData(data);

    const updated = readMockData();
    const updatedTeam = updated.teams.find((t) => t.teamId === "T-001")!;
    expect(updatedTeam.memberIds).toContain("222");
    expect(updatedTeam.pendingInvites).not.toContain("222");
  });

  it("排他清理: 接受 T-001 后从 T-002 的 pendingInvites 中移除", () => {
    const data = readMockData();
    const team001 = data.teams.find((t) => t.teamId === "T-001")!;
    const team002 = data.teams.find((t) => t.teamId === "T-002")!;

    // 两个队伍都邀请 333
    team001.pendingInvites.push("333");
    team002.pendingInvites.push("333");

    // 333 接受 T-001
    const user333 = data.users.find((u) => u.builderId === "333")!;
    user333.teamId = "T-001";
    team001.memberIds.push("333");
    team001.pendingInvites = team001.pendingInvites.filter((id) => id !== "333");

    // 排他清理
    for (const team of data.teams) {
      if (team.teamId === "T-001") continue;
      team.pendingInvites = team.pendingInvites.filter((id) => id !== "333");
    }

    writeMockData(data);

    const updated = readMockData();
    const updatedTeam002 = updated.teams.find((t) => t.teamId === "T-002")!;
    expect(updatedTeam002.pendingInvites).not.toContain("333");
  });
});

describe("离队申请", () => {
  it("申请离队后打异常标记", () => {
    const data = readMockData();
    const user222 = data.users.find((u) => u.builderId === "222")!;

    // 先让 222 加入队伍
    user222.teamId = "T-001";
    data.teams.find((t) => t.teamId === "T-001")!.memberIds.push("222");

    // 申请离队
    user222.abnormalMark = "申请离队";
    writeMockData(data);

    const updated = readMockData();
    const updatedUser = updated.users.find((u) => u.builderId === "222")!;
    expect(updatedUser.abnormalMark).toBe("申请离队");
  });
});
