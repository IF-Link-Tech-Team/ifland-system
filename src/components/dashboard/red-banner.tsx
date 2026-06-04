"use client";

import { useState, useEffect } from "react";

export function RedBanner() {
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const fetchNotice = async () => {
      try {
        const res = await fetch("/api/system/status");
        if (res.ok) {
          const json = await res.json();
          if (json.ok) {
            setNotice(json.data.marqueeNotice ?? "");
          }
        }
      } catch {
        // 静默
      }
    };

    fetchNotice();
    const interval = setInterval(fetchNotice, 10000);
    return () => clearInterval(interval);
  }, []);

  if (!notice) return null;

  return (
    <div className="overflow-hidden bg-ifland-orange px-4 py-2">
      <div className="animate-marquee whitespace-nowrap text-sm font-bold text-white">
        {notice}
      </div>
    </div>
  );
}
