"use client";

import { useState, useEffect } from "react";
import { Countdown } from "@/components/screen/countdown";
import { TeamBoard } from "@/components/screen/team-board";
import { MarqueeBanner } from "@/components/screen/marquee-banner";
import type { TeamStatus } from "@/types";

interface SystemStatus {
  marqueeNotice: string;
  endTime: string;
}

interface TeamInfo {
  teamId: string;
  name: string;
  slogan: string;
  captainId: string;
  status: TeamStatus;
  memberCount: number;
  members: {
    builderId: string;
    name: string;
    role: string;
    avatar: string;
  }[];
}

const POLL_INTERVAL = 5000;

export default function ScreenPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [teams, setTeams] = useState<TeamInfo[]>([]);

  useEffect(() => {
    const poll = async () => {
      try {
        const [statusRes, teamsRes] = await Promise.all([
          fetch("/api/system/status"),
          fetch("/api/screen/teams"),
        ]);

        if (statusRes.ok) {
          const json = await statusRes.json();
          if (json.ok) setStatus(json.data);
        }

        if (teamsRes.ok) {
          const json = await teamsRes.json();
          if (json.ok) setTeams(json.data);
        }
      } catch {
        // 静默
      }
    };

    poll();
    const interval = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen">
      {/* 跑马灯 */}
      <MarqueeBanner text={status?.marqueeNotice ?? ""} />

      <div className="mx-auto max-w-6xl p-6 lg:p-12">
        {/* 标题 */}
        <div className="mb-8 text-center">
          <h1 className="neon-glow-cyan text-3xl font-bold tracking-wider text-neon-cyan lg:text-5xl">
            IF.Land
          </h1>
          <p className="mt-1 text-muted-foreground text-sm">黑客松现场大屏</p>
        </div>

        {/* 倒计时 */}
        <div className="mb-10">
          {status?.endTime ? (
            <Countdown endTime={status.endTime} />
          ) : (
            <div className="text-center text-muted-foreground">
              加载倒计时...
            </div>
          )}
        </div>

        {/* 队伍看板 */}
        <div>
          <h2 className="neon-glow-magenta mb-4 text-lg font-semibold text-neon-magenta">
            全场队伍状态
          </h2>
          <TeamBoard teams={teams} />
        </div>
      </div>
    </div>
  );
}
