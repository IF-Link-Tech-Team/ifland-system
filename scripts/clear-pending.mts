import 'dotenv/config';
import { searchRecords, updateRecord } from '../src/lib/feishu';

const TABLE = process.env.FEISHU_TABLE_ID_TEAMS!;

async function main() {
  const records = await searchRecords(TABLE);
  console.log('Teams found:', records.length);

  for (const rec of records) {
    const f = rec.fields as Record<string, unknown>;
    const pending = f['受邀名单 (pendingInvites)'];
    console.log(f['团队ID'], f['队名'], 'pending:', JSON.stringify(pending));

    if (pending && String(pending).trim()) {
      console.log('  -> clearing pending...');
      await updateRecord(TABLE, rec.record_id as string, { '受邀名单 (pendingInvites)': '' });
      console.log('  -> cleared');
    }
  }

  console.log('Done - all pendingInvites cleared');
}

main().catch(console.error);
