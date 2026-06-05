"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Book, Monitor, User } from "lucide-react";

export function BottomNav() {
  const pathname = usePathname();

  const isSystemActive = pathname === "/dashboard/system";
  const isMyActive = pathname === "/dashboard" || (pathname.startsWith("/dashboard/") && !pathname.includes("system"));

  return (
    <nav
      className="fixed bottom-6 left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-[24rem] -translate-x-1/2 flex-row items-center justify-between rounded-full bg-white py-3 px-6 shadow-2xl md:hidden"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      {/* 左侧：手册 */}
      <a
        href="https://build-iflink.feishu.cn/wiki/OMbEw9b9CiBJyOkwGxscSizFn2t?fromScene=spaceOverview"
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-16 flex-col items-center gap-1 text-gray-400 hover:text-black"
      >
        <Book className="h-5 w-5" />
        <span className="text-[10px] font-bold">手册</span>
      </a>

      {/* 中间：系统大屏 */}
      <Link
        href="/dashboard/system"
        className={`flex w-16 flex-col items-center gap-1 ${isSystemActive ? "text-black" : "text-gray-400"}`}
      >
        <Monitor className="h-5 w-5" />
        <span className="text-[10px] font-bold">系统大屏</span>
      </Link>

      {/* 右侧：我的 */}
      <Link
        href="/dashboard"
        className={`flex w-16 flex-col items-center gap-1 ${isMyActive ? "text-black" : "text-gray-400"}`}
      >
        <User className="h-5 w-5" />
        <span className="text-[10px] font-bold">我的</span>
      </Link>
    </nav>
  );
}
