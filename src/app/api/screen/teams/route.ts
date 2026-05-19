import { NextResponse } from "next/server";
import { getAllTeams, getAllUsers } from "@/lib/data-service";

const MOCK_DELAY = 200;

export async function GET() {
  if (process.env.USE_FEISHU !== "true") {
    await new Promise((r) => setTimeout(r, MOCK_DELAY));
  }

  const teams = await getAllTeams();
  const allUsers = await getAllUsers();

  const result = teams.map((team) => {
    const members = team.memberIds
      .map((id) => allUsers.find((u) => u.builderId === id))
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

  return NextResponse.json({ ok: true, data: result });
}
