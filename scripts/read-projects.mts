import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), quiet: true });

const APP_ID = process.env.FEISHU_APP_ID!;
const APP_SECRET = process.env.FEISHU_APP_SECRET!;
const BASE = process.env.FEISHU_BASE_APP_TOKEN_PROJECTS!;
const TBL = process.env.FEISHU_TABLE_ID_PROJECTS!;

async function main() {
  const r = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET }),
  });
  const { tenant_access_token: token } = await r.json() as any;
  console.log('Token:', token ? 'yes' : 'no');

  // 获取字段列表
  const fieldsRes = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE}/tables/${TBL}/fields`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const fieldsData = await fieldsRes.json() as any;
  console.log('\n=== 表头字段 ===');
  for (const f of fieldsData.data?.items || []) {
    console.log(`  ${f.field_name} (${f.type})`);
  }

  // 获取前3条数据
  const recordsRes = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE}/tables/${TBL}/records/search`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ page_size: 3 }),
    }
  );
  const recordsData = await recordsRes.json() as any;
  console.log('\n=== 前3条记录 ===');
  for (const item of recordsData.data?.items || []) {
    console.log('---');
    for (const [key, val] of Object.entries(item.fields)) {
      const display = typeof val === 'object' ? JSON.stringify(val) : val;
      console.log(`  ${key}: ${String(display).substring(0, 120)}`);
    }
  }
}

main().catch(console.error);
