"use client";

import { useState, useEffect, useCallback } from "react";
import type { TeamInfo, SystemConfig } from "@/types";

interface HackathonData {
  teams: TeamInfo[];
  config: SystemConfig | null;
  loading: boolean;
  refresh: () => void;
}

const POLL_INTERVAL = 5000;

export function useHackathonData(): HackathonData {
  const [teams, setTeams] = useState<TeamInfo[]>([]);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [teamsRes, statusRes] = await Promise.all([
        fetch("/api/screen/teams"),
        fetch("/api/system/status"),
      ]);

      if (teamsRes.ok) {
        const teamsJson = await teamsRes.json();
        if (teamsJson.ok) setTeams(teamsJson.data);
      }

      if (statusRes.ok) {
        const statusJson = await statusRes.json();
        if (statusJson.ok) {
          setConfig({
            marqueeNotice: statusJson.data.marqueeNotice,
            endTime: statusJson.data.endTime,
            forceDisbandTrigger: null,
          });
        }
      }
    } catch {
      // 静默失败
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [fetchData]);

  return { teams, config, loading, refresh: fetchData };
}
