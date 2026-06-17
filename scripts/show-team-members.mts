/**
 * 读取指定队伍的所有成员信息
 * 用法: npx tsx scripts/show-team-members.mts T-011
 */
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), quiet: true });

const APP_ID = process.env.FEISHU_APP_ID!;
const APP_SECRET = process.env.FEISHU_APP_SECRET!;
const BASE_TOKEN = process.env.FEISHU_BASE_APP_TOKEN!;
const TABLE_USERS = process.env.FEISHU_TABLE_ID_USERS!;
const TABLE_TEAMS = process.env.FEISHU_TABLE_ID_TEAMS!;
const TARGET = process.argv[2];

if (!TARGET) { console.error('用法: npx tsx scripts/show-team-members.mts <团队ID>'); process.exit(1); }

async function main() {
  const { tenant_access_token: token } = await (await fetch(
    'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET }) }
  )).json() as any;

  // 1. 找团队 recordId
  const filter = encodeURIComponent(`CurrentValue.[团队ID]="${TARGET}"`);
  const teamRes = await (await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${TABLE_TEAMS}/records?filter=${filter}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  )).json() as any;

  if (!teamRes.data?.items?.length) { console.log(`未找到 ${TARGET}`); return; }

  const teamRec = teamRes.data.items[0];
  const teamRecordId = teamRec.record_id;
  const teamName = teamRec.fields['队名'];

  // 2. 获取所有用户
  const userRes = await (await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${TABLE_USERS}/records?page_size=200`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  )).json() as any;

  // 3. 解析队长
  const captainVal = teamRec.fields['队长'];
  let captainRecordIds: string[] = [];
  if (Array.isArray(captainVal)) {
    for (const item of captainVal) {
      if (item && typeof item === 'object' && 'record_ids' in item) {
        captainRecordIds.push(...(item as any).record_ids);
      }
    }
  }

  // 4. 找成员
  const members: Array<{ builderId: string; name: string; recordId: string; isCaptain: boolean }> = [];
  for (const u of userRes.data?.items || []) {
    const teamRef = u.fields['所属团队'];
    const linkedIds = extractRecordIds(teamRef);
    if (linkedIds.includes(teamRecordId)) {
      members.push({
        recordId: u.record_id,
        builderId: u.fields['Builder号'] || '?',
        name: u.fields['姓名'] || '(未知)',
        isCaptain: captainRecordIds.includes(u.record_id),
      });
    }
  }

  console.log(`\n=== ${TARGET} "${teamName}" 成员列表 (${members.length}人) ===`);
  const pending = teamRec.fields['受邀名单 (pendingInvites)'];
  console.log(`受邀名单: ${pending || '(空)'}`);
  console.log(`队伍状态: ${teamRec.fields['队伍状态']}`);
  console.log(`所属工坊: ${teamRec.fields['所属工坊'] || '(无)'}`);
  console.log('');

  for (const m of members) {
    const badge = m.isCaptain ? ' [队长]' : '';
    console.log(`  Builder #${m.builderId} | ${m.name}${badge}`);
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
