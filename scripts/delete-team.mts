/**
 * 删除指定队伍
 * 用法: npx tsx scripts/delete-team.mts T-018
 */
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), quiet: true });

const APP_ID = process.env.FEISHU_APP_ID!;
const APP_SECRET = process.env.FEISHU_APP_SECRET!;
const BASE_TOKEN = process.env.FEISHU_BASE_APP_TOKEN!;
const TABLE_TEAMS = process.env.FEISHU_TABLE_ID_TEAMS!;
const TARGET = process.argv[2];

if (!TARGET) { console.error('用法: npx tsx scripts/delete-team.mts <团队ID>'); process.exit(1); }

async function main() {
  const { tenant_access_token: token } = await (await fetch(
    'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET }) }
  )).json() as any;

  const filter = encodeURIComponent(`CurrentValue.[团队ID]="${TARGET}"`);
  const { data } = await (await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${TABLE_TEAMS}/records?filter=${filter}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  )).json() as any;

  if (!data?.items?.length) { console.log(`未找到 ${TARGET}`); return; }

  const rec = data.items[0];
  const { code, msg } = await (await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${TABLE_TEAMS}/records/${rec.record_id}`,
    { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }
  )).json() as any;

  console.log(code === 0 ? `已删除 ${TARGET}` : `失败: ${code} ${msg}`);
}

main().catch(console.error);
