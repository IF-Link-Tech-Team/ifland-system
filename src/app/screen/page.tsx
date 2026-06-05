"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import type { SystemStatusResponse, TeamInfo, TeamStatus } from "@/types";

const POLL_INTERVAL = 5000;

/* ─── 工具函数 ─── */

type RemainingTime = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
};

function calcRemaining(endTime?: string): RemainingTime {
  if (!endTime) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: false };
  const diff = new Date(endTime).getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
    expired: false,
  };
}

function formatNumber(value: number) {
  return String(Math.max(0, value)).padStart(2, "0");
}

function getLocalClock() {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

function minutesUntil(hour: number, minute = 0) {
  const now = new Date();
  const target = new Date(now);
  target.setHours(hour, minute, 0, 0);
  if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
  return Math.max(0, Math.round((target.getTime() - now.getTime()) / 60000));
}

/** 根据当前系统时间计算太阳节点：19:00–次日5:30 显示"距离日出"倒计时到5:30；其他时间显示"距离日落"倒计时到19:00 */
function calcSunNode() {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const currentMinutes = hour * 60 + minute;
  const sunsetBoundary = 19 * 60; // 19:00
  const sunriseBoundary = 5 * 60 + 30; // 5:30

  // 19:00 到次日 5:30 之间 → 距离日出
  if (currentMinutes >= sunsetBoundary || currentMinutes < sunriseBoundary) {
    return {
      title: "距离日出",
      label: "日出: 05:30",
      minutes: minutesUntil(5, 30),
    };
  }
  // 5:30 到 19:00 → 距离日落
  return {
    title: "距离日落",
    label: "日落: 19:00",
    minutes: minutesUntil(19, 0),
  };
}

function formatDuration(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}M`;
  return `${hours}H ${minutes}M`;
}

/* ─── 严格工坊分组（枚举匹配，未选工坊不归入任何工坊） ─── */

function splitWorkshops(teams: TeamInfo[]): [TeamInfo[], TeamInfo[], TeamInfo[]] {
  const rows: [TeamInfo[], TeamInfo[], TeamInfo[]] = [[], [], []];
  const workshopMap: Record<string, number> = {
    "工坊一(313)": 0,
    "工坊二(314)": 1,
    "工坊三(309)": 2,
  };

  teams.forEach((team) => {
    const key = team.workshop as string | null;
    if (key && workshopMap[key] !== undefined) {
      rows[workshopMap[key]].push(team);
    }
    // 未选择工坊的队伍不归入任何工坊行
  });

  return rows;
}

/* ─── 队伍状态色标 ─── */

const STATUS_DOT: Record<TeamStatus, { color: string; label: string }> = {
  "头脑风暴中": { color: "bg-ifland-orange", label: "头脑风暴中" },
  "开发中": { color: "bg-ifland-purple", label: "开发中" },
  "Demo提交": { color: "bg-ifland-dark", label: "Demo提交" },
};

/* ─── 子组件 ─── */

function TimeCard({ title, body, label }: { title: string; body: string; label: string }) {
  const titleParts = title === "距离下一个时间节点" ? ["距离下一个", "时间节点"] : [title];
  const bodyParts = body.split(" ");

  return (
    <section className="relative overflow-hidden bg-ifland-dark p-[clamp(12px,1.3vw,24px)] text-ifland-primary">
      <div className="relative z-10 h-full min-h-[clamp(82px,7.6vw,146px)]">
        <div className="relative z-20">
          <h2 className="text-[clamp(18px,1.65vw,34px)] font-black leading-[0.96] tracking-[-0.04em]">
            {titleParts.map((part) => (
              <span key={part} className="block whitespace-nowrap">{part}</span>
            ))}
          </h2>
          <p className="mt-[0.35vw] text-[clamp(10px,0.9vw,18px)] font-bold text-white">
            {label}
          </p>
        </div>
        <div className="absolute bottom-[-0.2vw] right-0 z-10 text-right font-black leading-[0.84] tracking-[-0.06em] text-[clamp(34px,3.85vw,78px)]">
          {bodyParts.map((part) => (
            <span key={part} className="block">{part}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

function CountdownDisplay({ remaining }: { remaining: RemainingTime }) {
  const values = [
    { value: remaining.days, label: "DAYS" },
    { value: remaining.hours, label: "HOURS" },
    { value: remaining.minutes, label: "MIN" },
    { value: remaining.seconds, label: "SEC" },
  ];

  return (
    <div>
      <div className="grid grid-cols-[1fr_0.08fr_1fr_0.08fr_1fr_0.08fr_1fr] items-center">
        {values.map((item, index) => (
          <div key={item.label} className="contents">
            <div className="text-center">
              <div className="font-mono text-[clamp(72px,10vw,210px)] font-black leading-[0.82] tracking-[-0.08em]">
                {formatNumber(item.value)}
              </div>
            </div>
            {index < values.length - 1 && (
              <div className="text-center text-[clamp(46px,5.2vw,96px)] font-black leading-none opacity-20">
                :
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-[1.5vw] grid grid-cols-4 text-center font-mono text-[clamp(10px,0.75vw,16px)] font-black tracking-[0.6em] opacity-50">
        {values.map((item) => (
          <span key={item.label}>{item.label}</span>
        ))}
      </div>
    </div>
  );
}

function ProgressBar({ present, total }: { present: number; total: number }) {
  const percent = total > 0 ? Math.round((present / total) * 100) : 0;
  const filled = Math.max(1, Math.round(percent / 4));

  return (
    <section className="mt-[1.1vw] grid grid-cols-[auto_1fr_auto] items-center gap-[1.4vw] rounded-[10px] bg-ifland-primary/30 px-[1.1vw] py-[0.85vw] text-ifland-dark">
      <span className="text-[clamp(12px,0.95vw,18px)] font-black">整体进度</span>
      <div className="grid grid-cols-[repeat(25,minmax(0,1fr))] gap-[0.35vw] rounded-[14px] border-[3px] border-ifland-dark bg-ifland-primary p-[0.35vw]">
        {Array.from({ length: 25 }).map((_, index) => (
          <span
            key={index}
            className={`h-[clamp(16px,1.7vw,34px)] rounded-[5px] ${
              index < filled ? "bg-ifland-dark" : "bg-ifland-primary/70"
            }`}
          />
        ))}
      </div>
      <span className="font-mono text-[clamp(20px,2vw,40px)] font-black tracking-[0.18em]">
        {percent}%
      </span>
    </section>
  );
}

/** 单支队伍卡片：紧凑型横向卡片 */
function TeamSeatCard({ team }: { team: TeamInfo }) {
  const isAway = (m: TeamInfo["members"][number]) => String(m.presenceStatus).includes("离");
  const statusInfo = STATUS_DOT[team.status];

  return (
    <div className="flex w-full flex-col rounded-lg border border-ifland-primary/30 bg-ifland-primary px-3 py-2 gap-1.5 h-auto shrink-0 text-ifland-dark">
      {/* 第一行：队名 */}
      <span className="text-sm font-bold text-ifland-dark">
        {team.name}
      </span>
      {/* 第二行：状态 + 头像 */}
      <div className="flex flex-row items-center gap-2">
        {statusInfo && (
          <span className="flex shrink-0 items-center gap-1 rounded-full border border-ifland-dark/20 bg-ifland-dark/10 px-1.5 py-0.5">
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${statusInfo.color}`} />
            <span className="whitespace-nowrap text-[10px] font-bold text-ifland-dark">{statusInfo.label}</span>
          </span>
        )}
        <div className="ml-auto flex shrink-0 flex-row -space-x-2">
          {team.members.slice(0, 3).map((member) => (
            <div key={member.builderId} className={`relative h-7 w-7 overflow-hidden rounded-full border-2 border-ifland-dark bg-white ${isAway(member) ? "opacity-40 grayscale" : ""}`}>
              <Image
                src={member.avatar}
                alt={member.name}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WorkshopRow({
  label,
  teams,
}: {
  label: string;
  teams: TeamInfo[];
}) {
  return (
    <section className="grid grid-cols-[clamp(84px,7vw,142px)_1fr] gap-[1vw] bg-ifland-dark p-[1.1vw]">
      <div className="flex items-center justify-center">
        <div className="flex flex-col items-center justify-center gap-[0.35vw] text-[clamp(34px,3.4vw,72px)] font-black leading-[0.98] text-ifland-primary">
          {label.split("").map((char) => (
            <span key={char}>{char}</span>
          ))}
        </div>
      </div>
      <div className="flex h-full w-full flex-col gap-3 overflow-y-auto pr-2">
        {teams.length > 0 ? (
          teams.map((team) => (
            <TeamSeatCard key={team.teamId} team={team} />
          ))
        ) : (
          <div className="flex items-center justify-center text-sm text-ifland-primary/40">
            暂无队伍
          </div>
        )}
      </div>
    </section>
  );
}

/* ─── 主组件 ─── */

function BrandScreen({ status, teams }: { status: SystemStatusResponse | null; teams: TeamInfo[] }) {
  const [remaining, setRemaining] = useState(() => calcRemaining(status?.endTime));
  const [clock, setClock] = useState(() => getLocalClock());

  useEffect(() => {
    const timer = setInterval(() => {
      setRemaining(calcRemaining(status?.endTime));
      setClock(getLocalClock());
    }, 1000);
    return () => clearInterval(timer);
  }, [status?.endTime]);

  const workshops = useMemo(() => splitWorkshops(teams), [teams]);
  const present = teams.reduce((sum, team) => sum + team.presentCount, 0);
  const total = teams.reduce((sum, team) => sum + team.memberCount, 0);
  const nextNodeMinutes = remaining.expired
    ? 0
    : Math.min(remaining.days * 1440 + remaining.hours * 60 + remaining.minutes, 610);
  const sunNode = calcSunNode();

  return (
    <main className="min-h-[100dvh] overflow-hidden bg-ifland-primary text-ifland-dark">
      {/* 跑马灯通知 */}
      {status?.marqueeNotice && (
        <div className="absolute top-0 left-0 z-50 w-full overflow-hidden bg-ifland-orange py-2">
          <div className="animate-marquee whitespace-nowrap text-sm font-bold text-white">
            {status.marqueeNotice}&nbsp;&nbsp;&nbsp;&nbsp;{status.marqueeNotice}&nbsp;&nbsp;&nbsp;&nbsp;{status.marqueeNotice}
          </div>
        </div>
      )}

      <div className="grid min-h-[100dvh] grid-cols-[50.2vw_1fr] gap-[2vw] px-[2.35vw] py-[2vw]">
        {/* 左侧面板 */}
        <section className="flex min-h-0 flex-col">
          <header>
            <div className="text-[clamp(40px,4vw,86px)] font-black leading-[0.85] tracking-[-0.07em]">
              IF.Land
            </div>
            <div className="text-[clamp(22px,2.1vw,45px)] font-light leading-none tracking-[-0.06em]">
              Hackathon
            </div>
          </header>

          <div className="mt-[1vw]">
            <CountdownDisplay remaining={remaining} />
          </div>

          <div className="mt-[0.7vw] grid grid-cols-[1fr_1fr_1fr] gap-[0.7vw]">
            <TimeCard title="当前时间" label="118.81631°E  31.890438°N" body={clock} />
            <TimeCard title={sunNode.title} label={sunNode.label} body={formatDuration(sunNode.minutes)} />
            <TimeCard title="距离下一个时间节点" label="提交项目海报" body={formatDuration(nextNodeMinutes)} />
          </div>

          <ProgressBar present={present} total={total} />
        </section>

        {/* 右侧面板 */}
        <section className="grid min-h-0 grid-rows-[1fr_1fr] gap-[1.6vw]">
          <div className="grid grid-cols-2 gap-[1.6vw]">
            <WorkshopRow label="工坊一" teams={workshops[0]} />
            <WorkshopRow label="工坊二" teams={workshops[1]} />
          </div>
          <WorkshopRow label="工坊三" teams={workshops[2]} />
        </section>
      </div>
    </main>
  );
}

/* ─── 页面入口 ─── */

export default function ScreenPage() {
  const [status, setStatus] = useState<SystemStatusResponse | null>(null);
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
        // 网络抖动时保留上一帧
      }
    };

    poll();
    const interval = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  return <BrandScreen status={status} teams={teams} />;
}
