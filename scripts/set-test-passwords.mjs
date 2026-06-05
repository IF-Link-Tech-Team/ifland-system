/**
 * 批量将所有飞书用户密码设为明文 "1234"
 * 用法: node scripts/set-test-passwords.mjs
 * 前置条件: .env.local 中已配置 FEISHU_APP_ID, FEISHU_APP_SECRET, FEISHU_BASE_APP_TOKEN, FEISHU_TABLE_ID_USERS
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "..", ".env.local");

// 手动加载 .env.local
const envContent = readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  let value = trimmed.slice(eqIdx + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  process.env[key] = value;
}

const BASE_URL = "https://open.feishu.cn";
const { FEISHU_APP_ID, FEISHU_APP_SECRET, FEISHU_BASE_APP_TOKEN, FEISHU_TABLE_ID_USERS } = process.env;

if (!FEISHU_APP_ID || !FEISHU_APP_SECRET || !FEISHU_BASE_APP_TOKEN || !FEISHU_TABLE_ID_USERS) {
  console.error("❌ 缺少飞书环境变量，请检查 .env.local");
  process.exit(1);
}

async function getToken() {
  const res = await fetch(`${BASE_URL}/open-apis/auth/v3/tenant_access_token/internal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app_id: FEISHU_APP_ID, app_secret: FEISHU_APP_SECRET }),
  });
  const data = await res.json();
  if (data.code !== 0) throw new Error(`获取 Token 失败: ${data.msg}`);
  return data.tenant_access_token;
}

async function searchAllUsers(token) {
  const allItems = [];
  let pageToken;
  do {
    const body = { page_size: 500 };
    if (pageToken) body.page_token = pageToken;
    const res = await fetch(
      `${BASE_URL}/open-apis/bitable/v1/apps/${FEISHU_BASE_APP_TOKEN}/tables/${FEISHU_TABLE_ID_USERS}/records/search`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    const data = await res.json();
    if (data.code !== 0) throw new Error(`搜索用户失败: ${data.msg}`);
    allItems.push(...(data.data?.items ?? []));
    pageToken = data.data?.has_more ? data.data?.page_token : undefined;
  } while (pageToken);
  return allItems;
}

async function batchUpdatePasswords(token, records, plainPassword) {
  const recordIds = records.map((r) => r.record_id);
  // 飞书批量更新每批最多 500 条
  const BATCH_SIZE = 500;
  let updated = 0;
  
  for (let i = 0; i < recordIds.length; i += BATCH_SIZE) {
    const batch = recordIds.slice(i, i + BATCH_SIZE);
    const res = await fetch(
      `${BASE_URL}/open-apis/base/v3/bases/${FEISHU_BASE_APP_TOKEN}/tables/${FEISHU_TABLE_ID_USERS}/records/batch_update`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          record_id_list: batch,
          patch: { "密码哈希": plainPassword },
        }),
      }
    );
    const data = await res.json();
    if (data.code !== 0) {
      console.error(`  ❌ 批次 ${Math.floor(i / BATCH_SIZE) + 1} 失败: ${data.msg}`);
    } else {
      updated += batch.length;
      console.log(`  ✅ 批次 ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} 条`);
    }
    // 避免频率限制
    if (i + BATCH_SIZE < recordIds.length) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  return updated;
}

async function main() {
  console.log("🔑 获取飞书 Token...");
  const token = await getToken();

  console.log("🔍 搜索所有用户记录...");
  const users = await searchAllUsers(token);
  console.log(`📋 找到 ${users.length} 个用户`);

  console.log("🔧 批量更新密码为 1234...");
  const updated = await batchUpdatePasswords(token, users, "1234");
  console.log(`🎉 完成！共更新 ${updated} 个用户的密码`);
}

main().catch((err) => {
  console.error("❌", err.message);
  process.exit(1);
});
