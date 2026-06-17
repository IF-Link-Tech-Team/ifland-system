/**
 * 查找指定 Builder 的信息及其所在队伍
 */
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), quiet: true });

const APP_ID = process.env.FEISHU_APP_ID!;
const APP_SECRET = process.env.FEISHU_APP_SECRET!;
const BASE_TOKEN = process.env.FEISHU_BASE_APP_TOKEN!;
const TABLE_USERS = process.env.FEISHU_TABLE_ID_USERS!;
const TABLE_TEAMS = process.env.FEISHU_TABLE_ID_TEAMS!;

async function main() {
  const tokenRes = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET }),
  });
  const { tenant_access_token: token } = await tokenRes.json() as any;

  // 查找用户
  const filter = encodeURIComponent(`CurrentValue.[Builder号]="428"`);
  const userRes = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${TABLE_USERS}/records?filter=${filter}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  const userData = await userRes.json() as any;
  console.log('user result code:', userData.code);
  if (userData.data?.items?.length) {
    const u = userData.data.items[0];
    console.log('用户:', u.fields['姓名'], '| 所属团队:', JSON.stringify(u.fields['所属团队']));
  } else {
    console.log('未找到用户 428');
  }

  // 查找所有队伍，找出队长是 428 的
  const teamRes = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${TABLE_TEAMS}/records?page_size=100`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  const teamData = await teamRes.json() as any;
  for (const rec of teamData.data?.items || []) {
    const f = rec.fields;
    const captain = f['队长'];
    const captainIds = extractRecordIds(captain);
    if (captainIds.includes('rec...')) {
      // 需要解析 captain 的 recordId → builderId
      console.log(`  ${f['团队ID']} | ${f['队名']} | 队长record_ids: ${JSON.stringify(captainIds)}`);
    }
  }
}

function extractRecordIds(val: unknown): string[] {
  if (!val) return [];
  if (typeof val === 'string') return [val];
  if (Array.isArray(val)) {
    return val.flatMap(item => {
      if (typeof item === 'string') return [item];
      if (item && typeof item === 'object' && 'record_ids' in item) return (item as any).record_ids || [];
      return [];
    });
  }
  return [];
}

main().catch(console.error);
