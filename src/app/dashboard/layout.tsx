"use client";

import { BottomNav } from "@/components/dashboard/bottom-nav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen w-full">
      <main className="h-full w-full overflow-y-auto pb-24 md:pb-0">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
