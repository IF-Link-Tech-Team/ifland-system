import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const ROOT = path.resolve(__dirname, "..");
const MOCK_DATA_PATH = path.join(ROOT, "src/mocks/mock_data.json");

export function resetMockData() {
  const raw = execSync("git show HEAD:src/mocks/mock_data.json", {
    cwd: ROOT,
    encoding: "utf-8",
  });
  fs.writeFileSync(MOCK_DATA_PATH, raw);
}
