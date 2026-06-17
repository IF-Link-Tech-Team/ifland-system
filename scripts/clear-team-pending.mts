/**
 * 清空指定队伍的受邀名单(pendingInvites)
 * 用法: npx tsx scripts/clear-team-pending.mts T-007
 */
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const APP_ID = process.env.FEISHU_APP_ID!;
const APP_SECRET = process.env.FEISHU_APP_SECRET!;
const BASE_TOKEN = process.env.FEISHU_BASE_APP_TOKEN!;
const TABLE_TEAMS = process.env.FEISHU_TABLE_ID_TEAMS!;
const TARGET_TEAM = process.argv[2];

if (!TARGET_TEAM) {
  console.error("用法: npx tsx scripts/clear-team-pending.mts <团队ID>");
  process.exit(1);
}

async function main() {
  // 1. 获取 token
  const tokenRes = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET }),
  });
  const tokenData = await tokenRes.json();
  const token = tokenData.tenant_access_token;

  // 2. 查找目标团队记录
  const filter = `CurrentValue.[团队ID]="${TARGET_TEAM}"`;
  const searchRes = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${TABLE_TEAMS}/records?filter=${encodeURIComponent(filter)}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  const searchData = await searchRes.json();

  if (!searchData.data?.items?.length) {
    console.error(`未找到团队 ${TARGET_TEAM}`);
    process.exit(1);
  }

  const record = searchData.data.items[0];
  const pending = record.fields['受邀名单 (pendingInvites)'];
  console.log(`团队 ${TARGET_TEAM} 当前受邀名单:`, JSON.stringify(pending));

  // 3. 清空受邀名单
  const updateRes = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${TABLE_TEAMS}/records/${record.record_id}`,
    {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { '受邀名单 (pendingInvites)': '' } }),
    }
  );
  const updateData = await updateRes.json();
  console.log('更新结果:', updateData.code === 0 ? '成功' : `失败(code=${updateData.code}, msg=${updateData.msg})`);
}

main().catch(console.error);
