import { test, expect } from "@playwright/test";

test.describe("组队流程", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[placeholder*="Builder"]').fill("111");
    await page.locator('button:has-text("进入系统")').click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test("队长邀请自由人", async ({ page }) => {
    // 应显示邀请输入框（111 是 T-001 队长，未满）
    const inviteInput = page.locator('input[placeholder*="Builder"]');
    await expect(inviteInput).toBeVisible();

    // 输入自由人 Builder 号
    await inviteInput.fill("222");
    await page.locator('button >> svg.lucide-send').click();

    // 应显示成功提示
    await expect(page.locator("text=已向 222 发送邀请")).toBeVisible({ timeout: 5000 });
  });
});

test.describe("自由人接受邀请", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[placeholder*="Builder"]').fill("222");
    await page.locator('button:has-text("进入系统")').click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test("自由人看到邀请列表和建队入口", async ({ page }) => {
    // 222 是自由人，应看到 Dashboard
    await expect(page.locator("text=IF.Land")).toBeVisible();
  });
});
