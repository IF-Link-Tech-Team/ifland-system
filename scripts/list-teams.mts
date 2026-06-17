/**
 * 列出所有队伍及其受邀名单
 */
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const APP_ID = process.env.FEISHU_APP_ID!;
const APP_SECRET = process.env.FEISHU_APP_SECRET!;
const BASE_TOKEN = process.env.FEISHU_BASE_APP_TOKEN!;
const TABLE_TEAMS = process.env.FEISHU_TABLE_ID_TEAMS!;

async function main() {
  const tokenRes = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET }),
  });
  const { tenant_access_token: token } = await tokenRes.json() as any;

  const res = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${TABLE_TEAMS}/records?page_size=100`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  const data = await res.json() as any;
  console.log('code:', data.code, 'total:', data.data?.total);

  if (data.data?.items) {
    for (const rec of data.data.items) {
      const f = rec.fields;
      console.log(`  ${f['团队ID']} | ${f['队名']} | record_id: ${rec.record_id} | pending: "${f['受邀名单 (pendingInvites)']}"`);
    }
  }
}

main().catch(console.error);
