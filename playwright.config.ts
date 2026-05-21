import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30000,
  use: {
    baseURL: "http://localhost:3000",
    headless: true,
  },
  webServer: {
    command: "env USE_FEISHU= npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: false,
    timeout: 30000,
  },
});
