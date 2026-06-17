/**
 * 查询 T-018 队伍详情 + 解除队长身份
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

  // 找 T-018
  const filter = encodeURIComponent(`CurrentValue.[团队ID]="T-018"`);
  const teamRes = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${TABLE_TEAMS}/records?filter=${filter}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  const teamData = await teamRes.json() as any;
  const rec = teamData.data?.items?.[0];
  if (!rec) { console.log('未找到 T-018'); return; }

  const f = rec.fields;
  console.log('T-018 队长字段原始值:', JSON.stringify(f['队长']));

  // 获取所有用户
  const userRes = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${TABLE_USERS}/records?page_size=200`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  const userData = await userRes.json() as any;
  const userMap = new Map<string, string>(); // recordId -> builderId
  for (const u of (userData.data?.items || [])) {
    const bid = u.fields['Builder号'];
    if (bid) userMap.set(u.record_id, bid);
  }

  // 解析队长 recordIds
  const captainVal = f['队长'];
  let captainRecordIds: string[] = [];
  if (Array.isArray(captainVal)) {
    for (const item of captainVal) {
      if (item && typeof item === 'object' && 'record_ids' in item) {
        captainRecordIds.push(...(item as any).record_ids);
      }
    }
  }

  console.log('队长 recordIds:', captainRecordIds);
  const captainBuilderIds = captainRecordIds.map(rid => userMap.get(rid) || rid);
  console.log('队长 Builder 号:', captainBuilderIds);

  // 成员：找所属团队关联到 T-018 record_id 的用户
  const members: string[] = [];
  for (const u of (userData.data?.items || [])) {
    const teamRef = u.fields['所属团队'];
    const linkedIds = extractRecordIds(teamRef);
    if (linkedIds.includes(rec.record_id)) {
      members.push(u.fields['Builder号'] || u.record_id);
    }
  }
  console.log('所有成员:', members);

  // 解除 428 的队长和团队归属
  if (captainBuilderIds.includes('428')) {
    console.log('\n428 是 T-018 队长，现在解除...');
    
    // 1. 清空 428 的所属团队
    const user428 = (userData.data?.items || []).find((u: any) => u.fields['Builder号'] === '428');
    if (user428) {
      const updUser = await fetch(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${TABLE_USERS}/records/${user428.record_id}`,
        {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: { '所属团队': null } }),
        }
      );
      const updData = await updUser.json() as any;
      console.log('清空 428 所属团队:', updData.code === 0 ? '成功' : `失败(${updData.code})`);
    }

    // 2. 清空 T-018 的队长字段
    const updTeam = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${TABLE_TEAMS}/records/${rec.record_id}`,
      {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { '队长': null } }),
      }
    );
    const updTeamData = await updTeam.json() as any;
    console.log('清空 T-018 队长:', updTeamData.code === 0 ? '成功' : `失败(${updTeamData.code})`);
  } else {
    console.log('428 不是 T-018 队长');
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
