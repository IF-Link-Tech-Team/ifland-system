"use client";

import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
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
    <div className="min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-md space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="neon-glow-cyan text-xl font-bold text-neon-cyan">
            Dashboard
          </h1>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            退出
          </Button>
        </div>

        <div className="rounded-lg border border-neon-cyan/20 bg-card p-4">
          <p className="text-lg font-semibold">{user.name}</p>
          <p className="text-muted-foreground text-sm">Builder #{user.builderId}</p>
          <p className="text-muted-foreground text-sm">角色: {user.role}</p>
          <p className="text-muted-foreground text-sm">
            状态: {user.teamId ? `已加入 ${user.teamId}` : "自由人"}
          </p>
        </div>
      </div>
    </div>
  );
}
