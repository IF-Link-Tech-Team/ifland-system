"use client";

import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

export function ScreenLink() {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="text-ifland-primary hover:bg-ifland-primary/10"
      onClick={() => window.open("/screen", "_blank")}
      title="查看大屏"
    >
      <Home className="h-5 w-5" />
    </Button>
  );
}
