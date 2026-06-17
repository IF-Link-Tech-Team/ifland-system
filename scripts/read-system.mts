import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), quiet: true });

const APP_ID = process.env.FEISHU_APP_ID!;
const APP_SECRET = process.env.FEISHU_APP_SECRET!;
const BASE = process.env.FEISHU_BASE_APP_TOKEN!;
const TBL = process.env.FEISHU_TABLE_ID_SYSTEM!;

async function main() {
  const r = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET }),
  });
  const { tenant_access_token: token } = await r.json() as any;
  console.log('Token obtained:', token ? 'yes' : 'no');

  const d = await fetch(`https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE}/tables/${TBL}/records`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await d.json() as any;
  console.log('Code:', data.code, data.msg);
  console.log('Items:', data.data?.items?.length);
  
  for (const item of data.data?.items || []) {
    console.log('---');
    console.log('Record ID:', item.record_id);
    console.log('Fields:', JSON.stringify(item.fields, null, 2));
  }
}

main().catch(console.error);
