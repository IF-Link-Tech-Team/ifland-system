import { NextResponse } from "next/server";
import {
  getSystemConfig,
  getTeamById,
  updateUser,
  deleteTeam,
  updateSystemConfig,
} from "@/lib/data-service";
import { withMockDelay } from "@/lib/mock-delay";

export async function GET() {
  await withMockDelay(200);

  const config = await getSystemConfig();

  // I-10: forceDisbandTrigger 处理 — 先清空标记，再执行解散，防止重复触发
  if (config.forceDisbandTrigger) {
    const targetTeamId = config.forceDisbandTrigger;

    // 第一步：立即清空触发器（标记为"已处理"），防止重复触发
    await updateSystemConfig({ forceDisbandTrigger: null });

    const team = await getTeamById(targetTeamId);

    if (team) {
      // 2. 清空该队所有成员的所属团队
      for (const memberId of team.memberIds) {
        await updateUser(memberId, { teamId: null });
      }
      // 队长也需要清空
      if (team.captainId && !team.memberIds.includes(team.captainId)) {
        await updateUser(team.captainId, { teamId: null });
      }

      // 3. 删除队伍记录
      await deleteTeam(targetTeamId);
    }
  }

  return NextResponse.json({
    ok: true,
    data: {
      marqueeNotice: config.marqueeNotice,
      endTime: config.endTime,
    },
  });
}
