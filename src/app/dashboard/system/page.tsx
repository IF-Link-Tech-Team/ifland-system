"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Monitor } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useHackathonData } from "@/hooks/useHackathonData";
import type { TeamInfo, Workshop } from "@/types";

const WORKSHOPS: Workshop[] = ["工坊一(313)", "工坊二(314)", "工坊三(309)"];
const WORKSHOP_LABELS = ["工坊一", "工坊二", "工坊三"];

// 倒计时组件（绿色区顶部）
function Countdown({ endTime }: { endTime: string }) {
  const [timeLeft, setTimeLeft] = useState({ h: "00", m: "00", s: "00" });

  useEffect(() => {
    const update = () => {
      const diff = new Date(endTime).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ h: "00", m: "00", s: "00" });
        return;
      }
      const h = String(Math.floor(diff / 3600000)).padStart(2, "0");
      const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0");
      const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");
      setTimeLeft({ h, m, s });
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [endTime]);

  return (
    <div className="font-mono text-5xl font-black tracking-wider text-ifland-dark">
      {timeLeft.h}:{timeLeft.m}:{timeLeft.s}
    </div>
  );
}

// 状态颜色映射
const STATUS_COLORS: Record<string, string> = {
  "头脑风暴中": "bg-ifland-orange/90 text-white border-ifland-orange",
  "开发中": "bg-ifland-purple/90 text-white border-ifland-purple",
  "Demo提交": "bg-ifland-dark/80 text-ifland-primary border-ifland-dark",
};

export default function SystemPage() {
  const { teams, config, loading } = useHackathonData();

  // PC端：友好提示页
  const pcFallback = (
    <div className="hidden md:flex min-h-screen flex-col items-center justify-center gap-4 bg-ifland-dark">
      <Monitor className="h-16 w-16 text-ifland-primary/40" />
      <p className="text-lg text-gray-400">请在手机端查看此页面</p>
      <Link
        href="/screen"
        className="text-ifland-primary underline underline-offset-4 hover:text-ifland-primary/80"
      >
        或前往大屏控制台 →
      </Link>
    </div>
  );

  if (loading) {
    return (
      <>
        {pcFallback}
        <div className="flex md:hidden min-h-screen items-center justify-center bg-ifland-dark">
          <p className="text-ifland-primary">加载中...</p>
        </div>
      </>
    );
  }

  const endTime = config?.endTime || new Date(Date.now() + 86400000).toISOString();

  // 与大屏端对齐：日落时间固定19:00，endTime 是比赛结束时间
  const sunsetMinutesUntil = (() => {
    const now = new Date();
    const target = new Date(now);
    target.setHours(19, 0, 0, 0);
    if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
    return Math.max(0, Math.round((target.getTime() - now.getTime()) / 60000));
  })();
  const sunsetH = Math.floor(sunsetMinutesUntil / 60);
  const sunsetM = sunsetMinutesUntil % 60;

  // 比赛倒计时
  const raceDiff = new Date(endTime).getTime() - Date.now();
  const raceHours = Math.max(0, Math.floor(raceDiff / 3600000));
  const raceMinutes = Math.max(0, Math.floor((raceDiff % 3600000) / 60000));

  // 进度条（24h 黑客松周期）
  const totalDuration = 24 * 3600000;
  const elapsed = Date.now() - (new Date(endTime).getTime() - totalDuration);
  const progress = Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)));

  return (
    <>
      {pcFallback}

      {/* 固定绿色背景层 */}
      <div
        className="fixed left-0 top-0 z-0 flex h-[55vh] w-full flex-col items-center bg-ifland-primary md:hidden"
        style={{ paddingTop: "max(3rem, env(safe-area-inset-top))" }}
      >
        <h1 className="text-ifland-dark text-2xl font-black tracking-widest">IF.Land</h1>
        <p className="text-ifland-dark/60 text-sm font-medium tracking-wider">HACKATHON</p>
        <div className="mt-6">
          <Countdown endTime={endTime} />
        </div>
      </div>

      {/* Scroll Snap 滚动视口 */}
      <div className="mx-auto h-screen w-full max-w-md snap-y snap-mandatory overflow-y-auto bg-transparent md:hidden relative">

        {/* 吸附点1：透明占位（抽屉半开状态） */}
        <div className="relative z-10 h-[45vh] w-full shrink-0 snap-start bg-transparent pointer-events-none" />

        {/* 吸附点2：深色抽屉（全屏状态） */}
        <div className="relative z-20 w-full min-h-screen snap-start rounded-t-[2.5rem] bg-ifland-dark px-6 pt-6 pb-32 text-white shadow-[0_-20px_40px_rgba(0,0,0,0.3)] flex flex-col gap-6">
          {/* 顶部把手 */}
          <div className="mx-auto mb-2 h-1.5 w-12 flex-shrink-0 rounded-full bg-gray-600" />

          {/* 核心数据区：日落时间与进度 */}
          <div className="flex w-full flex-col gap-4">
            <div className="flex w-full flex-row items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-ifland-primary text-xl font-bold tracking-wide">距离日落还有</span>
                <span className="text-sm font-medium text-gray-300">日落时间: 19:00</span>
                <span className="mt-1 text-xs text-gray-500">118.816311°E<br />31.890438°N</span>
              </div>
              <div className="text-ifland-primary text-6xl font-black leading-none tracking-tighter">
                {String(sunsetH).padStart(2, "0")}H<br />{String(sunsetM).padStart(2, "0")}M
              </div>
            </div>

            {/* 整体进度条 */}
            <div className="flex w-full items-center gap-3">
              <span className="text-ifland-primary whitespace-nowrap text-sm font-bold">整体进度</span>
              <div className="h-5 flex-1 overflow-hidden rounded-full bg-gray-800 p-1">
                <div
                  className="h-full rounded-full bg-ifland-primary"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-sm font-bold text-white">{progress}%</span>
            </div>
          </div>

          {/* 通知 */}
          {config?.marqueeNotice && (
            <div className="rounded-lg border border-ifland-orange/20 bg-ifland-orange/10 px-4 py-2 text-sm text-ifland-orange">
              {config.marqueeNotice}
            </div>
          )}

          {/* 工坊队伍列表 */}
          {WORKSHOPS.map((ws, i) => {
            const wsTeams = teams.filter((t) => t.workshop === ws);
            return (
              <div key={ws}>
                <h3 className="mb-3 text-sm font-semibold text-ifland-primary">
                  {WORKSHOP_LABELS[i]}
                  <span className="ml-2 text-xs text-gray-500">
                    {wsTeams.length} 支队伍
                  </span>
                </h3>

                {wsTeams.length === 0 ? (
                  <p className="text-xs text-gray-600">暂无队伍</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {wsTeams.map((team) => (
                      <TeamCard key={team.teamId} team={team} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function TeamCard({ team }: { team: TeamInfo }) {
  const statusColor = STATUS_COLORS[team.status] || "bg-gray-700 text-gray-300 border-gray-600";

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-ifland-primary p-3 text-ifland-dark relative">
      <div className="flex items-start justify-between">
        <span className="text-sm font-bold leading-tight">{team.name}</span>
        <Badge className={statusColor}>{team.status}</Badge>
      </div>

      {team.slogan && (
        <p className="text-xs text-ifland-dark/60 line-clamp-1">{team.slogan}</p>
      )}

      <div className="flex items-center">
        <div className="flex -space-x-2">
          {team.members.slice(0, 3).map((member) => (
            <div
              key={member.builderId}
              className={`relative h-8 w-8 overflow-hidden rounded-full ring-2 ring-ifland-primary bg-white ${
                member.presenceStatus === "离场" ? "grayscale opacity-40" : ""
              }`}
            >
              <Image
                src={member.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${member.builderId}`}
                alt={member.name}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          ))}
        </div>
        <span className="ml-3 text-xs text-ifland-dark/50">
          {team.presentCount}/{team.memberCount} 在场
        </span>
      </div>
    </div>
  );
}
