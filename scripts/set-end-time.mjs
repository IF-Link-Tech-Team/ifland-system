/**
 * 更新飞书系统控制台的"比赛结束时间"
 * 用法: node scripts/set-end-time.mjs
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
const { FEISHU_APP_ID, FEISHU_APP_SECRET, FEISHU_BASE_APP_TOKEN, FEISHU_TABLE_ID_SYSTEM } = process.env;

async function getToken() {
  const res = await fetch(`${BASE_URL}/open-apis/auth/v3/tenant_access_token/internal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app_id: FEISHU_APP_ID, app_secret: FEISHU_APP_SECRET }),
  });
  const data = await res.json();
  return data.tenant_access_token;
}

async function main() {
  const token = await getToken();

  // 先查系统控制台表格的所有记录
  const searchRes = await fetch(
    `${BASE_URL}/open-apis/bitable/v1/apps/${FEISHU_BASE_APP_TOKEN}/tables/${FEISHU_TABLE_ID_SYSTEM}/records/search`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ page_size: 10 }),
    }
  );
  const searchData = await searchRes.json();
  console.log("系统控制台记录:", JSON.stringify(searchData, null, 2));

  const items = searchData.data?.items ?? [];
  if (items.length === 0) {
    console.log("❌ 系统控制台表格为空，需要先手动创建一条记录。");
    return;
  }

  const record = items[0];
  const recordId = record.record_id;
  console.log(`\n找到记录: ${recordId}`);

  // 更新"比赛结束时间"
  const updateRes = await fetch(
    `${BASE_URL}/open-apis/bitable/v1/apps/${FEISHU_BASE_APP_TOKEN}/tables/${FEISHU_TABLE_ID_SYSTEM}/records/${recordId}`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ fields: { "比赛结束时间": "2026-06-07 09:00:00" } }),
    }
  );
  const updateData = await updateRes.json();
  if (updateData.code === 0) {
    console.log("✅ 比赛结束时间已更新为: 2026-06-07 09:00:00");
  } else {
    console.log(`❌ 更新失败: ${updateData.msg}`);
  }
}

main().catch(console.error);
