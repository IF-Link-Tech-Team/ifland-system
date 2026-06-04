"use client";

import type { TeamInfo, TeamStatus, Workshop } from "@/types";
import Image from "next/image";
import { MapPin } from "lucide-react";

interface TeamBoardProps {
  teams: TeamInfo[];
}

const STATUS_COLORS: Record<TeamStatus, string> = {
  "头脑风暴中": "text-ifland-orange",
  "开发中": "text-ifland-primary",
  "Demo提交": "text-ifland-purple",
};

const STATUS_BG: Record<TeamStatus, string> = {
  "头脑风暴中": "bg-ifland-orange/10 border-ifland-orange/30",
  "开发中": "bg-ifland-primary/10 border-ifland-primary/30",
  "Demo提交": "bg-ifland-purple/10 border-ifland-purple/30",
};

export function TeamBoard({ teams }: TeamBoardProps) {
  if (teams.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        暂无队伍数据
      </div>
    );
  }

  // 按工坊分组
  const workshopGroups = new Map<Workshop | "未选择", TeamInfo[]>();
  for (const team of teams) {
    const key: Workshop | "未选择" = team.workshop ?? "未选择";
    if (!workshopGroups.has(key)) workshopGroups.set(key, []);
    workshopGroups.get(key)!.push(team);
  }

  // 确保工坊按固定顺序展示
  const orderedKeys: (Workshop | "未选择")[] = [
    "工坊一(313)",
    "工坊二(314)",
    "工坊三(309)",
    "未选择",
  ];

  return (
    <div className="space-y-6">
      {orderedKeys.map((key) => {
        const groupTeams = workshopGroups.get(key);
        if (!groupTeams || groupTeams.length === 0) return null;

        return (
          <div key={key}>
            <div className="mb-3 flex items-center gap-2">
              {key !== "未选择" ? (
                <>
                  <MapPin className="h-4 w-4 text-ifland-orange" />
                  <h3 className="text-sm font-semibold text-ifland-orange">
                    {key}
                  </h3>
                </>
              ) : (
                <h3 className="text-sm font-semibold text-muted-foreground">
                  未选择工坊
                </h3>
              )}
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {groupTeams.map((team) => (
                <div
                  key={team.teamId}
                  className="rounded-lg border border-border bg-card p-4 transition-all hover:border-ifland-primary/30"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-ifland-primary">{team.name}</h4>
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
                        <div className={`relative h-6 w-6 overflow-hidden rounded-full border ${member.presenceStatus === "离场" ? "border-muted/30" : "border-ifland-primary/20"}`}>
                          <Image
                            src={member.avatar}
                            alt={member.name}
                            fill
                            className={`object-cover ${member.presenceStatus === "离场" ? "grayscale opacity-40" : ""}`}
                            unoptimized
                          />
                        </div>
                        <span className={`text-xs ${member.presenceStatus === "离场" ? "text-muted-foreground/40 line-through" : ""}`}>
                          {member.name}
                        </span>
                      </div>
                    ))}
                  </div>

                  <p className="mt-2 text-muted-foreground/60 text-xs">
                    {team.presentCount}/{team.memberCount} 人在场
                  </p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
