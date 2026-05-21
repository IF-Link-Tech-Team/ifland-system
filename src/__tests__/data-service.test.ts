import { afterEach, describe, expect, it } from "vitest";
import { getDataSource, FeishuDataSource, MockDataSource } from "@/lib/data-source";
import { getUserByBuilderId, getTeamById } from "@/lib/data-service";

const originalUseFeishu = process.env.USE_FEISHU;

afterEach(() => {
  if (originalUseFeishu === undefined) {
    delete process.env.USE_FEISHU;
  } else {
    process.env.USE_FEISHU = originalUseFeishu;
  }
});

describe("DataSource selection", () => {
  it("USE_FEISHU 未设置时使用 MockDataSource", () => {
    delete process.env.USE_FEISHU;
    expect(getDataSource()).toBeInstanceOf(MockDataSource);
  });

  it("USE_FEISHU=true 时使用 FeishuDataSource", () => {
    process.env.USE_FEISHU = "true";
    expect(getDataSource()).toBeInstanceOf(FeishuDataSource);
  });
});

describe("data-service facade", () => {
  it("保留旧入口：可通过 getUserByBuilderId 读取相同用户数据", async () => {
    delete process.env.USE_FEISHU;
    const user = await getUserByBuilderId("111");
    expect(user?.builderId).toBe("111");
    expect(user?.name).toBe("选手甲");
    expect(user?.teamId).toBe("T-001");
  });

  it("保留旧入口：可通过 getTeamById 读取相同队伍数据", async () => {
    delete process.env.USE_FEISHU;
    const team = await getTeamById("T-001");
    expect(team?.teamId).toBe("T-001");
    expect(team?.captainId).toBe("111");
    expect(team?.memberIds).toEqual(["111"]);
  });
});
