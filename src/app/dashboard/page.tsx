"use client";

import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ProfileCard } from "@/components/dashboard/profile-card";
import { InviteList } from "@/components/dashboard/invite-list";
import { RedBanner } from "@/components/dashboard/red-banner";
import { ScreenLink } from "@/components/dashboard/screen-link";
import { LogOut } from "lucide-react";

export default function DashboardPage() {
  const { user, loading, logout, refreshUser } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="neon-glow-cyan text-neon-cyan">加载中...</p>
      </div>
    );
  }

  if (!user) {
    router.push("/login");
    return null;
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
          <ProfileCard user={user} />
        </div>

        {/* 邀请列表（自由人可见） */}
        {!user.teamId && (
          <div className="mb-6">
            <InviteList onAccept={refreshUser} />
          </div>
        )}

        {/* 组队状态提示 */}
        <div className="rounded-lg border border-border bg-card p-4 text-center">
          {user.teamId ? (
            <p className="text-sm">
              已加入队伍 <span className="font-medium text-neon-cyan">{user.teamId}</span>
            </p>
          ) : (
            <p className="text-muted-foreground text-sm">
              你当前是自由人，可以接受邀请或发起组队
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
