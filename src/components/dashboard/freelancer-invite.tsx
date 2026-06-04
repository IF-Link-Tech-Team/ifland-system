"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Send } from "lucide-react";

interface FreelancerInviteProps {
  onTeamCreated: () => void;
}

export function FreelancerInvite({ onTeamCreated }: FreelancerInviteProps) {
  const [targetId, setTargetId] = useState("");
  const [pending, startTransition] = useTransition();

  const handleInvite = () => {
    const id = targetId.trim();
    if (!id) {
      toast.error("请输入 Builder 号");
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/team/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetBuilderId: id }),
        });
        const json = await res.json();
        if (json.ok) {
          toast.success(`已向 ${id} 发送组队邀请`);
          setTargetId("");
          onTeamCreated();
        } else {
          toast.error(json.error ?? "邀请失败");
        }
      } catch {
        toast.error("网络错误");
      }
    });
  };

  return (
    <div className="rounded-lg border border-ifland-primary/20 bg-card p-4">
      <h3 className="mb-3 text-sm font-medium text-ifland-primary">发起组队</h3>
      <p className="mb-3 text-muted-foreground text-xs">
        输入对方的 Builder 号发起邀请，系统将自动创建新队伍并将你设为队长
      </p>
      <div className="flex gap-2">
        <Input
          placeholder="输入 Builder 号发起组队"
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleInvite()}
          disabled={pending}
          className="border-ifland-primary/30 bg-card placeholder:text-muted-foreground/50 focus:border-ifland-primary"
        />
        <Button
          onClick={handleInvite}
          disabled={pending}
          className="border border-ifland-primary/50 bg-ifland-primary/10 text-ifland-primary hover:bg-ifland-primary/20"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
