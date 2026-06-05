/**
 * 调试：查看飞书用户表原始数据中的角色字段值
 * 用法: node scripts/debug-role-field.mjs
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const envContent = readFileSync(resolve(__dirname, "..", ".env.local"), "utf-8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  process.env[key] = trimmed.slice(eqIdx + 1);
}

const BASE_URL = "https://open.feishu.cn";
const { FEISHU_APP_ID, FEISHU_APP_SECRET, FEISHU_BASE_APP_TOKEN, FEISHU_TABLE_ID_USERS } = process.env;

async function getToken() {
  const res = await fetch(`${BASE_URL}/open-apis/auth/v3/tenant_access_token/internal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app_id: FEISHU_APP_ID, app_secret: FEISHU_APP_SECRET }),
  });
  const data = await res.json();
  return data.tenant_access_token;
}

async function listRecords(token) {
  const res = await fetch(`${BASE_URL}/open-apis/bitable/v1/apps/${FEISHU_BASE_APP_TOKEN}/tables/${FEISHU_TABLE_ID_USERS}/records/search`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ page_size: 10, filter: { conjunction: "and", conditions: [{ field_name: "Builder号", operator: "is", value: ["900"] }] } }),
  });
  const data = await res.json();
  console.log("=== Builder#900 原始字段 ===");
  if (data.data?.items?.[0]) {
    const fields = data.data.items[0].fields;
    console.log("角色字段原始值:", JSON.stringify(fields["角色"], null, 2));
    console.log("角色字段类型:", typeof fields["角色"]);
  } else {
    console.log("未找到记录");
    console.log("API 返回:", JSON.stringify(data, null, 2));
  }
}

async function main() {
  const token = await getToken();
  await listRecords(token);
}

main().catch(console.error);