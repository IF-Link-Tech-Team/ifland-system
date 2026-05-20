"use client";

import type { TeamInfo, TeamStatus } from "@/types";
import Image from "next/image";

interface TeamBoardProps {
  teams: TeamInfo[];
}

const STATUS_COLORS: Record<TeamStatus, string> = {
  "头脑风暴中": "text-neon-yellow",
  "开发中": "text-neon-cyan",
  "Demo提交": "text-neon-green",
};

const STATUS_BG: Record<TeamStatus, string> = {
  "头脑风暴中": "bg-neon-yellow/10 border-neon-yellow/30",
  "开发中": "bg-neon-cyan/10 border-neon-cyan/30",
  "Demo提交": "bg-neon-green/10 border-neon-green/30",
};

export function TeamBoard({ teams }: TeamBoardProps) {
  if (teams.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        暂无队伍数据
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {teams.map((team) => (
        <div
          key={team.teamId}
          className="rounded-lg border border-border bg-card p-4 transition-all hover:border-neon-cyan/30"
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-neon-cyan">{team.name}</h3>
              {team.slogan && (
                <p className="mt-0.5 text-muted-foreground text-xs">
                  {team.slogan}
                </p>
              )}
            </div>
            <span
              className={`rounded border px-2 py-0.5 text-xs ${STATUS_BG[team.status]} ${STATUS_COLORS[team.status]}`}
            >
              {team.status}
            </span>
          </div>

          <div className="mt-3 flex items-center gap-2">
            {team.members.map((member) => (
              <div key={member.builderId} className="flex items-center gap-1.5">
                <div className="relative h-6 w-6 overflow-hidden rounded-full border border-neon-cyan/20">
                  <Image
                    src={member.avatar}
                    alt={member.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <span className="text-xs">{member.name}</span>
              </div>
            ))}
          </div>

          <p className="mt-2 text-muted-foreground/60 text-xs">
            {team.memberCount}/3 人
          </p>
        </div>
      ))}
    </div>
  );
}
