"use client";

import { useState, useEffect } from "react";

interface CountdownProps {
  endTime: string;
}

function calcRemaining(endTime: string) {
  const diff = new Date(endTime).getTime() - Date.now();
  if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0, expired: true };
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { hours, minutes, seconds, expired: false };
}

export function Countdown({ endTime }: CountdownProps) {
  const [remaining, setRemaining] = useState(() => calcRemaining(endTime));

  useEffect(() => {
    const timer = setInterval(() => {
      setRemaining(calcRemaining(endTime));
    }, 1000);
    return () => clearInterval(timer);
  }, [endTime]);

  if (remaining.expired) {
    return (
      <div className="text-center">
        <p className="text-3xl font-bold text-ifland-orange md:text-5xl">
          比赛已结束
        </p>
      </div>
    );
  }

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="text-center">
      <p className="mb-2 text-sm text-muted-foreground">距离比赛结束</p>
      <div className="flex items-center justify-center gap-2 md:gap-4">
        {[
          { value: pad(remaining.hours), label: "时" },
          { value: pad(remaining.minutes), label: "分" },
          { value: pad(remaining.seconds), label: "秒" },
        ].map((item) => (
          <div key={item.label} className="flex flex-col items-center">
            <span className="rounded-lg border border-ifland-primary/30 bg-card px-3 py-2 text-3xl font-mono font-bold text-ifland-primary md:px-6 md:py-4 md:text-6xl">
              {item.value}
            </span>
            <span className="mt-1 text-xs text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
