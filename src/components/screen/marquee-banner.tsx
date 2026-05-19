"use client";

interface MarqueeBannerProps {
  text: string;
}

export function MarqueeBanner({ text }: MarqueeBannerProps) {
  if (!text) return null;

  return (
    <div className="overflow-hidden bg-destructive/90 py-2">
      <div className="animate-marquee whitespace-nowrap text-sm font-medium text-white">
        🔴 {text} &nbsp;&nbsp;&nbsp;&nbsp; 🔴 {text} &nbsp;&nbsp;&nbsp;&nbsp; 🔴 {text}
      </div>
    </div>
  );
}
