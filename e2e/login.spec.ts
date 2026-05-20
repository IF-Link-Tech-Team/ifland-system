import { test, expect } from "@playwright/test";

test.describe("登录流程", () => {
  test("输入 Builder 号 → Cookie 设置 → Dashboard 渲染", async ({ page }) => {
    await page.goto("/login");

    // 输入有效的 Builder 号
    await page.locator('input[placeholder*="Builder"]').fill("111");

    // 点击"进入系统"按钮
    await page.locator('button:has-text("进入系统")').click();

    // 应跳转到 /dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Dashboard 应显示用户名
    await expect(page.getByRole("heading", { name: "选手甲" })).toBeVisible();

    // Cookie 应已设置
    const cookies = await page.context().cookies();
    const authToken = cookies.find((c) => c.name === "auth_token");
    expect(authToken).toBeDefined();
    expect(authToken!.value).toBe("111");
  });

  test("无效 Builder 号显示错误", async ({ page }) => {
    await page.goto("/login");

    await page.locator('input[placeholder*="Builder"]').fill("999");
    await page.locator('button:has-text("进入系统")').click();

    // 应显示错误提示
    await expect(page.locator("text=不存在")).toBeVisible();

    // 仍在 /login
    await expect(page).toHaveURL(/\/login/);
  });
});
