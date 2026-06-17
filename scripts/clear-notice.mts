import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), quiet: true });

const APP_ID = process.env.FEISHU_APP_ID!;
const APP_SECRET = process.env.FEISHU_APP_SECRET!;
const BASE = process.env.FEISHU_BASE_APP_TOKEN!;
const TBL = process.env.FEISHU_TABLE_ID_SYSTEM!;
const RECORD_ID = 'recvk97kBQPqzG';

async function main() {
  const r = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET }),
  });
  const { tenant_access_token: token } = await r.json() as any;

  const res = await fetch(`https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE}/tables/${TBL}/records/${RECORD_ID}`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { '全局跑马灯通知': '' } }),
  });
  const data = await res.json() as any;
  console.log(data.code === 0 ? '已清空跑马灯通知' : `失败: ${data.code} ${data.msg}`);
}

main().catch(console.error);
