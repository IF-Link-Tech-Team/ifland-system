"use client";

import { useRef, useTransition } from "react";
import type { SafeUser } from "@/types";
import { ROLE_LABELS } from "@/types";
import Image from "next/image";
import { Camera } from "lucide-react";
import { toast } from "sonner";

interface ProfileCardProps {
  user: SafeUser;
  onAvatarUpdate?: () => void;
}

export function ProfileCard({ user, onAvatarUpdate }: ProfileCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  const avatarSrc =
    user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user.builderId}`;

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
    <div className="flex items-start gap-4 rounded-lg border border-neon-cyan/20 bg-card p-4">
      <div
        className="group relative h-16 w-16 shrink-0 cursor-pointer overflow-hidden rounded-full border border-neon-cyan/30"
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
          <Camera className="h-5 w-5 text-white" />
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
        <h2 className="truncate text-lg font-semibold">{user.name}</h2>
        <p className="text-muted-foreground text-sm">
          Builder #{user.builderId}
        </p>
        <span className="inline-block rounded border border-neon-magenta/40 bg-neon-magenta/10 px-2 py-0.5 text-xs text-neon-magenta">
          {ROLE_LABELS[user.role]}
        </span>
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
