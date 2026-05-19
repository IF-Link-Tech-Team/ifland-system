"use client";

import type { User } from "@/types";
import { ROLE_LABELS } from "@/types";
import Image from "next/image";

interface ProfileCardProps {
  user: User;
}

export function ProfileCard({ user }: ProfileCardProps) {
  const avatarSrc =
    user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user.builderId}`;

  return (
    <div className="flex items-start gap-4 rounded-lg border border-neon-cyan/20 bg-card p-4">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-neon-cyan/30">
        <Image
          src={avatarSrc}
          alt={user.name}
          fill
          className="object-cover"
          unoptimized
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
