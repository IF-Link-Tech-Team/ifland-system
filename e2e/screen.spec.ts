import { test, expect } from "@playwright/test";

test.describe("大屏轮询", () => {
  test("无鉴权访问 → 倒计时渲染 → 队伍看板更新", async ({ page }) => {
    await page.goto("/screen");

    // 标题应显示
    await expect(page.locator("text=IF.Land")).toBeVisible();

    // 大屏副标题
    await expect(page.locator("text=黑客松现场大屏")).toBeVisible();

    // 队伍状态区域
    await expect(page.locator("text=全场队伍状态")).toBeVisible();

    // 应显示至少一个队伍卡片
    await expect(page.locator("text=CyberPioneers")).toBeVisible();

    // 倒计时区域应存在：未结束时显示时/分，结束后显示结束态
    await expect(page.locator("text=距离比赛结束").or(page.locator("text=比赛已结束"))).toBeVisible();
  });
});
