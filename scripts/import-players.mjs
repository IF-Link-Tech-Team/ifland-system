/**
 * 批量导入 CSV 选手数据到飞书用户表
 * 用法: node scripts/import-players.mjs
 * 前置条件: .env.local 中已配置飞书环境变量
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// 加载 .env.local
const envContent = readFileSync(resolve(__dirname, "..", ".env.local"), "utf-8");
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

// 解析 CSV
function parseCSV(filePath) {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.trim().split("\n");
  const header = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    const obj = {};
    header.forEach((h, i) => {
      obj[h.trim()] = (values[i] ?? "").trim();
    });
    return obj;
  });
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

// 查询已有用户 Builder号 列表，避免重复创建
async function getExistingBuilderIds(token) {
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

// 创建单条记录
async function createRecord(token, fields) {
  const res = await fetch(
    `${BASE_URL}/open-apis/bitable/v1/apps/${FEISHU_BASE_APP_TOKEN}/tables/${FEISHU_TABLE_ID_USERS}/records`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    }
  );
  const data = await res.json();
  return data.code === 0;
}

// 更新已有记录
async function updateRecord(token, recordId, fields) {
  const res = await fetch(
    `${BASE_URL}/open-apis/bitable/v1/apps/${FEISHU_BASE_APP_TOKEN}/tables/${FEISHU_TABLE_ID_USERS}/records/${recordId}`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    }
  );
  const data = await res.json();
  return data.code === 0;
}

async function main() {
  console.log("🔑 获取飞书 Token...");
  const token = await getToken();

  // 解析两个 CSV
  const innerPlayers = parseCSV(resolve(__dirname, "..", "csv", "IF.Land校内选手腾讯云邮件收件人列表.csv"));
  const outerPlayers = parseCSV(resolve(__dirname, "..", "csv", "IF.Land校外选手腾讯云邮件收件人列表.csv"));
  const allPlayers = [...innerPlayers, ...outerPlayers];
  console.log(`📋 校内 ${innerPlayers.length} 人 + 校外 ${outerPlayers.length} 人 = 共 ${allPlayers.length} 人`);

  // 查询已有用户
  console.log("🔍 查询飞书已有用户...");
  const existingRecords = await getExistingBuilderIds(token);
  const existingMap = new Map();
  for (const rec of existingRecords) {
    const fields = rec.fields ?? {};
    // 解析 Builder号 字段（可能是文本或对象）
    let builderId = "";
    const raw = fields["Builder号"];
    if (typeof raw === "string") builderId = raw;
    else if (raw && typeof raw === "object" && "text" in raw) builderId = raw.text;
    else if (Array.isArray(raw)) builderId = raw.map((v) => (typeof v === "string" ? v : v?.text ?? "")).join("");
    if (builderId) existingMap.set(builderId, rec.record_id);
  }
  console.log(`📋 飞书已有 ${existingMap.size} 个用户`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (let i = 0; i < allPlayers.length; i++) {
    const player = allPlayers[i];
    const builderId = player.player_code;
    const email = player.email_address;
    const password = player.system_password;

    // 构造飞书字段
    const fields = {
      "Builder号": builderId,
      "邮箱": email,
      "密码哈希": password,
      "在场状态": "在场",
      "角色": "ANOMALY",
    };

    const existingRecordId = existingMap.get(builderId);
    if (existingRecordId) {
      // 已存在：更新密码和邮箱
      const ok = await updateRecord(token, existingRecordId, fields);
      if (ok) {
        updated++;
        console.log(`  ✏️  [${i + 1}/${allPlayers.length}] 更新 ${builderId} (${email})`);
      } else {
        console.error(`  ❌ [${i + 1}/${allPlayers.length}] 更新失败 ${builderId}`);
      }
    } else {
      // 不存在：创建新记录
      const ok = await createRecord(token, fields);
      if (ok) {
        created++;
        console.log(`  ➕ [${i + 1}/${allPlayers.length}] 创建 ${builderId} (${email})`);
      } else {
        console.error(`  ❌ [${i + 1}/${allPlayers.length}] 创建失败 ${builderId}`);
      }
    }

    // 避免频率限制
    if ((i + 1) % 10 === 0) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  console.log(`\n🎉 导入完成！新建 ${created} 人，更新 ${updated} 人`);
}

main().catch((err) => {
  console.error("❌", err.message);
  process.exit(1);
});
