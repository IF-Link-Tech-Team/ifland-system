"use client";

import { useRef, useState, useTransition } from "react";
import type { SafeUser, UserRole } from "@/types";
import { ROLE_LABELS, SELECTABLE_ROLES } from "@/types";
import Image from "next/image";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ProfileCardProps {
  user: SafeUser;
  onAvatarUpdate?: () => void;
}

export function ProfileCard({ user, onAvatarUpdate }: ProfileCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>(user.role);

  const avatarSrc =
    user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user.builderId}`;

  const handlePresenceToggle = () => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/user/presence", { method: "POST" });
        const json = await res.json();
        if (json.ok) {
          onAvatarUpdate?.();
        }
      } catch {
        toast.error("操作失败");
      }
    });
  };

  const handleRoleSelect = (role: UserRole) => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/user/role", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role }),
        });
        const json = await res.json();
        if (json.ok) {
          setSelectedRole(role);
          setShowRolePicker(false);
          toast.success(`已选择角色: ${ROLE_LABELS[role]}`);
          onAvatarUpdate?.();
        } else {
          toast.error(json.error ?? "选择失败");
        }
      } catch {
        toast.error("选择失败");
      }
    });
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("图片大小不能超过 5MB");
      return;
    }

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("avatar", file);

        const res = await fetch("/api/upload/avatar", {
          method: "POST",
          body: formData,
        });

        const json = await res.json();
        if (json.ok) {
          toast.success("头像已更新");
          onAvatarUpdate?.();
        } else {
          toast.error(json.error ?? "上传失败");
        }
      } catch {
        toast.error("上传失败");
      }
    });

    // 重置 input 值，允许重复选择同一文件
    e.target.value = "";
  };

  return (
    <div className="flex items-start gap-4 rounded-lg border border-ifland-primary/20 bg-card p-4">
      <div
        className="group relative h-16 w-16 shrink-0 cursor-pointer overflow-hidden rounded-full border-2 border-ifland-primary/40"
        onClick={handleAvatarClick}
      >
        <Image
          src={avatarSrc}
          alt={user.name}
          fill
          className="object-cover"
          unoptimized
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
          <Camera className="h-5 w-5 text-ifland-primary" />
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          disabled={pending}
        />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <h2 className="truncate text-lg font-semibold text-ifland-primary">{user.name}</h2>
        <p className="text-muted-foreground text-sm">
          Builder #{user.builderId}
        </p>
        {/* 角色标签 */}
        {selectedRole === "ANOMALY" ? (
          <button
            onClick={() => setShowRolePicker(true)}
            className="inline-flex items-center gap-1 rounded border border-ifland-purple/40 bg-ifland-purple/10 px-2 py-0.5 text-xs text-ifland-purple animate-pulse cursor-pointer"
          >
            选择角色 ✦
          </button>
        ) : (
          <span className="inline-block rounded border border-ifland-purple/40 bg-ifland-purple/10 px-2 py-0.5 text-xs text-ifland-purple">
            {ROLE_LABELS[selectedRole]}
          </span>
        )}

        {/* 角色选择器 */}
        {showRolePicker && (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {SELECTABLE_ROLES.map((role) => (
              <button
                key={role}
                onClick={() => handleRoleSelect(role)}
                disabled={pending}
                className="rounded border border-ifland-primary/30 bg-ifland-primary/5 px-2.5 py-1 text-xs font-medium text-ifland-primary hover:bg-ifland-primary/20 transition-colors"
              >
                {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : ROLE_LABELS[role]}
              </button>
            ))}
            <button
              onClick={() => setShowRolePicker(false)}
              className="rounded border border-muted/30 bg-muted/5 px-2.5 py-1 text-xs text-muted-foreground"
            >
              取消
            </button>
          </div>
        )}
        <button
          onClick={handlePresenceToggle}
          disabled={pending}
          className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-bold ${
            user.presenceStatus === "离场"
              ? "border-ifland-primary/40 bg-ifland-primary/10 text-ifland-primary"
              : "border-muted/40 bg-muted/10 text-muted-foreground"
          }`}
        >
          {pending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            user.presenceStatus === "离场" ? "入场" : "离场"
          )}
        </button>
        {user.phone && (
          <p className="text-muted-foreground text-xs">📞 {user.phone}</p>
        )}
        {user.bio && (
          <p className="text-muted-foreground mt-1 text-xs">{user.bio}</p>
        )}
      </div>
    </div>
  );
}
