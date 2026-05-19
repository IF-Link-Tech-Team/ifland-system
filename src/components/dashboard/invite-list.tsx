"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useEffect } from "react";

interface Invite {
  teamId: string;
  teamName: string;
  captainName: string;
  captainId: string;
}

interface InviteListProps {
  onAccept?: () => void;
}

async function fetchInvites(): Promise<Invite[]> {
  const res = await fetch("/api/team/invites/received");
  if (res.ok) {
    const json = await res.json();
    if (json.ok) return json.data;
  }
  return [];
}

export function InviteList({ onAccept }: InviteListProps) {
  const [invites, setInvites] = useState<Invite[] | null>(null);
  const [pending, startTransition] = useTransition();

  // 初次加载
  useEffect(() => {
    let cancelled = false;
    fetchInvites().then((data) => {
      if (!cancelled) setInvites(data);
    });
    return () => { cancelled = true; };
  }, []);

  const handleAccept = (teamId: string) => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/team/invite/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teamId }),
        });
        const json = await res.json();
        if (json.ok) {
          toast.success("已加入队伍！");
          setInvites((prev) => prev?.filter((i) => i.teamId !== teamId) ?? null);
          onAccept?.();
        } else {
          toast.error(json.error ?? "接受邀请失败");
        }
      } catch {
        toast.error("网络错误");
      }
    });
  };

  const handleReject = (teamId: string) => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/team/invite/reject", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teamId }),
        });
        const json = await res.json();
        if (json.ok) {
          toast.success("已拒绝邀请");
          setInvites((prev) => prev?.filter((i) => i.teamId !== teamId) ?? null);
        } else {
          toast.error(json.error ?? "拒绝邀请失败");
        }
      } catch {
        toast.error("网络错误");
      }
    });
  };

  if (invites === null) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-muted-foreground text-sm">加载邀请中...</p>
      </div>
    );
  }

  if (invites.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-neon-magenta">
        收到的邀请 ({invites.length})
      </h3>
      {invites.map((invite) => (
        <div
          key={invite.teamId}
          className="flex items-center justify-between rounded-lg border border-neon-magenta/20 bg-card p-3"
        >
          <div>
            <p className="text-sm font-medium">{invite.teamName}</p>
            <p className="text-muted-foreground text-xs">
              队长: {invite.captainName}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={pending}
              className="border border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan hover:bg-neon-cyan/20"
              onClick={() => handleAccept(invite.teamId)}
            >
              同意
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              className="text-muted-foreground"
              onClick={() => handleReject(invite.teamId)}
            >
              拒绝
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
