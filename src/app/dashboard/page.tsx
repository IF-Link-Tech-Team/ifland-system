"use client";

import { useState, useEffect, useTransition } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ProfileCard } from "@/components/dashboard/profile-card";
import { InviteList } from "@/components/dashboard/invite-list";
import { RedBanner } from "@/components/dashboard/red-banner";
import { ScreenLink } from "@/components/dashboard/screen-link";
import { TeamPanel } from "@/components/dashboard/team-panel";
import { FreelancerInvite } from "@/components/dashboard/freelancer-invite";
import { LogOut } from "lucide-react";
import { PWAInstallButton } from "@/components/dashboard/pwa-install";
import type { User, Team } from "@/types";

async function fetchDashboardData(): Promise<{ team: Team | null; teamMembers: User[] } | null> {
  const res = await fetch("/api/team/my");
  if (res.ok) {
    const json = await res.json();
    if (json.ok) return json.data;
  }
  return null;
}

export default function DashboardPage() {
  const { user: authUser, loading: authLoading, logout, refreshUser } = useAuth();
  const router = useRouter();
  const [team, setTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [, startTransition] = useTransition();

  const handleDataRefresh = () => {
    startTransition(async () => {
      const data = await fetchDashboardData();
      if (data) {
        setTeam(data.team);
        setTeamMembers(data.teamMembers);
      }
      await refreshUser();
    });
  };

  // 未登录时重定向
  useEffect(() => {
    if (!authLoading && !authUser) {
      router.replace("/login");
    }
  }, [authLoading, authUser, router]);

  // 首次加载
  useEffect(() => {
    if (!authUser) return;
    fetchDashboardData().then((data) => {
      if (data) {
        setTeam(data.team);
        setTeamMembers(data.teamMembers);
      }
      setDataLoading(false);
    });
  }, [authUser]);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  if (authLoading || dataLoading || !authUser) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="neon-glow-cyan text-neon-cyan">加载中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <RedBanner />

      <div className="mx-auto max-w-md p-4 md:p-8">
        {/* 顶部导航 */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="neon-glow-cyan text-xl font-bold text-neon-cyan">
            IF.Land
          </h1>
          <div className="flex items-center gap-2">
            <PWAInstallButton />
            <ScreenLink />
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:bg-destructive/10"
              onClick={handleLogout}
              title="退出登录"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* 个人名片 */}
        <div className="mb-6">
          <ProfileCard user={authUser} onAvatarUpdate={handleDataRefresh} />
        </div>

        {/* 互斥展示：自由人 vs 团队面板 */}
        {authUser.teamId && team ? (
          <div className="mb-6">
            <TeamPanel
              user={authUser}
              team={team}
              teamMembers={teamMembers}
              onTeamUpdate={handleDataRefresh}
              onUserUpdate={handleDataRefresh}
            />
          </div>
        ) : (
          <>
            {/* 自由人：邀请列表 + 发起组队 */}
            <div className="mb-6">
              <InviteList onAccept={handleDataRefresh} />
            </div>
            <div className="mb-6">
              <FreelancerInvite onTeamCreated={handleDataRefresh} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
