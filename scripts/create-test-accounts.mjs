/**
 * 创建 5 个新测试账号（有密码、未选角色、未组队）
 * 用法: node scripts/create-test-accounts.mjs
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// 加载 .env.local — 只按第一个 = 分割
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

console.log("APP_ID:", FEISHU_APP_ID);
console.log("APP_SECRET:", FEISHU_APP_SECRET);

if (!FEISHU_APP_ID || !FEISHU_APP_SECRET || !FEISHU_BASE_APP_TOKEN || !FEISHU_TABLE_ID_USERS) {
  console.error("❌ 缺少飞书环境变量，请检查 .env.local");
  process.exit(1);
}

async function getTenantToken() {
  const res = await fetch(`${BASE_URL}/open-apis/auth/v3/tenant_access_token/internal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app_id: FEISHU_APP_ID, app_secret: FEISHU_APP_SECRET }),
  });
  const json = await res.json();
  return json.tenant_access_token;
}

async function createRecord(token, fields) {
  const res = await fetch(`${BASE_URL}/open-apis/bitable/v1/apps/${FEISHU_BASE_APP_TOKEN}/tables/${FEISHU_TABLE_ID_USERS}/records`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ fields }),
  });
  const json = await res.json();
  return json;
}

const TEST_ACCOUNTS = [
  { builderId: "900", name: "测试选手F", password: "1234" },
  { builderId: "901", name: "测试选手G", password: "1234" },
  { builderId: "902", name: "测试选手H", password: "1234" },
  { builderId: "903", name: "测试选手I", password: "1234" },
  { builderId: "904", name: "测试选手J", password: "1234" },
];

async function main() {
  const token = await getTenantToken();

  for (const acc of TEST_ACCOUNTS) {
    const fields = {
      "Builder号": acc.builderId,
      "姓名": acc.name,
      "密码哈希": acc.password,
      "角色": "未选择",
      "在场状态": "在场",
      "邮箱": `test${acc.builderId}@ifland.test`,
    };

    const result = await createRecord(token, fields);
    if (result.code === 0) {
      console.log(`✅ 创建成功: ${acc.name} (Builder #${acc.builderId})`);
    } else {
      console.log(`❌ 创建失败: ${acc.name} — ${result.msg}`);
    }
  }

  console.log("\n完成！5 个测试账号已创建。");
}

main().catch(console.error);