import { NextResponse } from "next/server";
import { getAllTeams, getAllUsers } from "@/lib/data-service";
import { withMockDelay } from "@/lib/mock-delay";

export async function GET() {
  await withMockDelay(200);

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
        presenceStatus: u!.presenceStatus,
      }));

    const presentCount = members.filter((m) => m.presenceStatus === "在场").length;

    return {
      teamId: team.teamId,
      name: team.name,
      slogan: team.slogan,
      captainId: team.captainId,
      status: team.status,
      memberCount: team.memberIds.length,
      presentCount,
      members,
    };
  });

  return NextResponse.json({ ok: true, data: result });
}
