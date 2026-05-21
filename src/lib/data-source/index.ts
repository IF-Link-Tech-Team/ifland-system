import { FeishuDataSource } from "./feishu";
import { MockDataSource } from "./mock";
import type { DataSource } from "./types";

export function getDataSource(): DataSource {
  return process.env.USE_FEISHU === "true"
    ? new FeishuDataSource()
    : new MockDataSource();
}

export type { DataSource };
export { FeishuDataSource, MockDataSource };
