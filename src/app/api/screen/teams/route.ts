import { NextResponse } from "next/server";
import { readMockData } from "@/lib/mock-db";

const MOCK_DELAY = 200;

export async function GET() {
  await new Promise((r) => setTimeout(r, MOCK_DELAY));

  const data = readMockData();

  // 返回全部队伍信息，附带成员详情
  const teams = data.teams.map((team) => {
    const members = team.memberIds
      .map((id) => data.users.find((u) => u.builderId === id))
      .filter(Boolean)
      .map((u) => ({
        builderId: u!.builderId,
        name: u!.name,
        role: u!.role,
        avatar: u!.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${u!.builderId}`,
      }));

    return {
      teamId: team.teamId,
      name: team.name,
      slogan: team.slogan,
      captainId: team.captainId,
      status: team.status,
      memberCount: team.memberIds.length,
      members,
    };
  });

  return NextResponse.json({ ok: true, data: teams });
}
