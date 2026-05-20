import { beforeEach, vi } from "vitest";
import { execSync } from "child_process";
import type { MockData } from "@/types";

// mock_data.json 原始数据
const ORIGINAL_DATA: MockData = JSON.parse(
  execSync("git show HEAD:src/mocks/mock_data.json", { encoding: "utf-8" })
);

// 内存中的 mock 数据副本
let memoryData: MockData;

beforeEach(() => {
  memoryData = JSON.parse(JSON.stringify(ORIGINAL_DATA));
});

// 拦截 mock-db 的读写，走内存而非文件，避免测试间文件竞争
vi.mock("@/lib/mock-db", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/mock-db")>();
  return {
    ...original,
    readMockData: () => memoryData,
    writeMockData: (data: MockData) => { memoryData = data; },
  };
});
