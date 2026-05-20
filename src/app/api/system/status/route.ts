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

  // I-10: forceDisbandTrigger 处理 — 管理员在飞书中输入目标团队ID，系统轮询到后执行解散
  if (config.forceDisbandTrigger) {
    const targetTeamId = config.forceDisbandTrigger;
    const team = await getTeamById(targetTeamId);

    if (team) {
      // 1. 清空该队所有成员的所属团队
      for (const memberId of team.memberIds) {
        await updateUser(memberId, { teamId: null });
      }
      // 队长也需要清空
      if (team.captainId && !team.memberIds.includes(team.captainId)) {
        await updateUser(team.captainId, { teamId: null });
      }

      // 2. 删除队伍记录
      await deleteTeam(targetTeamId);
    }

    // 3. 无论目标队伍是否存在，清空 forceDisbandTrigger（防止重复触发）
    await updateSystemConfig({ forceDisbandTrigger: null });
  }

  return NextResponse.json({
    ok: true,
    data: {
      marqueeNotice: config.marqueeNotice,
      endTime: config.endTime,
    },
  });
}
