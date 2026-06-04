"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useTransition, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { SafeUser, Team, TeamStatus, Workshop } from "@/types";
import { ROLE_LABELS } from "@/types";
import Image from "next/image";
import { Pencil, Send, LogOut, MapPin } from "lucide-react";

interface TeamPanelProps {
  user: SafeUser;
  team: Team;
  teamMembers: SafeUser[];
  onTeamUpdate: () => void;
  onUserUpdate: () => void;
}

const STATUS_OPTIONS: TeamStatus[] = ["头脑风暴中", "开发中", "Demo提交"];
const WORKSHOP_OPTIONS: Workshop[] = ["工坊一(313)", "工坊二(314)", "工坊三(309)"];

export function TeamPanel({ user, team, teamMembers, onTeamUpdate, onUserUpdate }: TeamPanelProps) {
  const isCaptain = team.captainId === user.builderId;
  const canInvite = isCaptain && team.memberIds.length + team.pendingInvites.length < 3;
  const [inviteId, setInviteId] = useState("");
  const [pending, startTransition] = useTransition();

  // 队长编辑状态
  const [editingName, setEditingName] = useState(false);
  const [editingSlogan, setEditingSlogan] = useState(false);
  const [nameValue, setNameValue] = useState(team.name);
  const [sloganValue, setSloganValue] = useState(team.slogan);

  // 当 team 数据从外部更新时，重置编辑状态和本地值
  useEffect(() => {
    setNameValue(team.name);
    setSloganValue(team.slogan);
    setEditingName(false);
    setEditingSlogan(false);
  }, [team.name, team.slogan]);

  const handleInvite = () => {
    const targetId = inviteId.trim();
    if (!targetId) {
      toast.error("请输入 Builder 号");
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/team/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetBuilderId: targetId }),
        });
        const json = await res.json();
        if (json.ok) {
          toast.success(`已向 ${targetId} 发送邀请`);
          setInviteId("");
          onTeamUpdate();
        } else {
          toast.error(json.error ?? "邀请失败");
        }
      } catch {
        toast.error("网络错误");
      }
    });
  };

  const handleUpdateName = () => {
    if (!nameValue.trim()) return;
    startTransition(async () => {
      try {
        const res = await fetch("/api/team/name", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teamId: team.teamId, name: nameValue.trim() }),
        });
        const json = await res.json();
        if (json.ok) {
          toast.success("队名已更新");
          setEditingName(false);
          onTeamUpdate();
        } else {
          toast.error(json.error ?? "修改失败");
        }
      } catch {
        toast.error("网络错误");
      }
    });
  };

  const handleUpdateSlogan = () => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/team/slogan", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teamId: team.teamId, slogan: sloganValue.trim() }),
        });
        const json = await res.json();
        if (json.ok) {
          toast.success("宣言已更新");
          setEditingSlogan(false);
          onTeamUpdate();
        } else {
          toast.error(json.error ?? "修改失败");
        }
      } catch {
        toast.error("网络错误");
      }
    });
  };

  const handleStatusChange = (status: TeamStatus) => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/team/status", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teamId: team.teamId, status }),
        });
        const json = await res.json();
        if (json.ok) {
          toast.success(`状态已切换为: ${status}`);
          onTeamUpdate();
        } else {
          toast.error(json.error ?? "修改失败");
        }
      } catch {
        toast.error("网络错误");
      }
    });
  };

  const handleLeaveRequest = () => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/team/leave-request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        const json = await res.json();
        if (json.ok) {
          toast.success("已申请离队，等待管理员处理");
          onUserUpdate();
        } else {
          toast.error(json.error ?? "申请失败");
        }
      } catch {
        toast.error("网络错误");
      }
    });
  };

  const handleWorkshopChange = (workshop: Workshop | null) => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/team/workshop", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workshop }),
        });
        const json = await res.json();
        if (json.ok) {
          toast.success(workshop ? `已加入${workshop}` : "已离开工坊");
          onTeamUpdate();
        } else {
          toast.error(json.error ?? "操作失败");
        }
      } catch {
        toast.error("网络错误");
      }
    });
  };

  const hasAbnormalMark = !!user.abnormalMark;

  return (
    <div className="space-y-4">
      {/* 队伍信息头 */}
      <div className="rounded-lg border border-ifland-primary/20 bg-card p-4">
        <div className="flex items-center gap-2">
          {editingName && isCaptain ? (
            <div className="flex flex-1 gap-2">
              <Input
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleUpdateName()}
                className="text-lg"
                disabled={pending}
              />
              <Button size="sm" onClick={handleUpdateName} disabled={pending}>确定</Button>
            </div>
          ) : (
            <h2
              className="flex-1 text-lg font-semibold text-ifland-primary"
              onClick={() => isCaptain && setEditingName(true)}
            >
              {team.name || "未命名队伍"}
              {isCaptain && <Pencil className="ml-2 inline h-3 w-3 cursor-pointer text-muted-foreground" />}
            </h2>
          )}
        </div>

        {editingSlogan && isCaptain ? (
          <div className="mt-2 flex gap-2">
            <Input
              value={sloganValue}
              onChange={(e) => setSloganValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUpdateSlogan()}
              placeholder="输入一句话宣言"
              disabled={pending}
            />
            <Button size="sm" onClick={handleUpdateSlogan} disabled={pending}>确定</Button>
          </div>
        ) : (
          <p
            className="mt-1 text-muted-foreground text-sm"
            onClick={() => isCaptain && setEditingSlogan(true)}
          >
            {team.slogan || "暂无宣言"}
            {isCaptain && <Pencil className="ml-2 inline h-3 w-3 cursor-pointer text-muted-foreground" />}
          </p>
        )}

        <p className="mt-2 text-xs text-muted-foreground/60">
          队伍 ID: {team.teamId} · 人数: {team.memberIds.length}/3
          {team.pendingInvites.length > 0 && ` · 待处理邀请: ${team.pendingInvites.length}`}
        </p>

        {/* 工坊信息 */}
        {isCaptain && (
          <div className="mt-3 flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-ifland-primary" />
            {team.workshop ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-ifland-primary">{team.workshop}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                  disabled={pending}
                  onClick={() => handleWorkshopChange(null)}
                >
                  离开工坊
                </Button>
              </div>
            ) : (
              <div className="flex gap-1.5">
                {WORKSHOP_OPTIONS.map((w) => (
                  <Button
                    key={w}
                    size="sm"
                    variant="outline"
                    className="h-6 border-ifland-primary/30 px-2 text-xs text-ifland-primary hover:border-ifland-primary hover:bg-ifland-primary/10"
                    disabled={pending}
                    onClick={() => handleWorkshopChange(w)}
                  >
                    {w}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}
        {!isCaptain && team.workshop && (
          <div className="mt-3 flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-ifland-primary" />
            <span className="text-xs font-medium text-ifland-primary">{team.workshop}</span>
          </div>
        )}
      </div>

      {/* 队员列表 */}
      <div className="space-y-2">
        {teamMembers.map((member) => (
          <div
            key={member.builderId}
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
          >
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-ifland-primary/30">
              <Image
                src={member.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${member.builderId}`}
                alt={member.name}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {member.name}
                {member.builderId === team.captainId && (
                  <span className="ml-2 text-xs text-ifland-orange">队长</span>
                )}
              </p>
              <p className="text-muted-foreground text-xs">
                #{member.builderId} · {ROLE_LABELS[member.role]}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* 队长专属控件 */}
      {isCaptain && (
        <div className="space-y-3">
          {/* 状态切换 */}
          <div className="flex gap-2">
            {STATUS_OPTIONS.map((s) => (
              <Button
                key={s}
                size="sm"
                variant={team.status === s ? "default" : "outline"}
                className={
                  team.status === s
                    ? "border border-ifland-primary/50 bg-ifland-primary/10 text-ifland-primary"
                    : "text-muted-foreground"
                }
                disabled={pending}
                onClick={() => handleStatusChange(s)}
              >
                {s}
              </Button>
            ))}
          </div>

          {/* 邀请队员 */}
          {canInvite && (
            <div className="flex gap-2">
              <Input
                placeholder="输入 Builder 号邀请入队"
                value={inviteId}
                onChange={(e) => setInviteId(e.target.value)}
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
          )}

          {!canInvite && (
            <p className="text-muted-foreground text-xs text-center">
              队伍名额已满（含待处理邀请）
            </p>
          )}
        </div>
      )}

      {/* 离队申请 */}
      {!isCaptain && (
        <Button
          variant="outline"
          className="w-full text-destructive hover:bg-destructive/10"
          disabled={hasAbnormalMark || pending}
          onClick={handleLeaveRequest}
        >
          <LogOut className="mr-2 h-4 w-4" />
          {hasAbnormalMark ? "已申请离队（等待管理员处理）" : "申请离队"}
        </Button>
      )}
    </div>
  );
}
