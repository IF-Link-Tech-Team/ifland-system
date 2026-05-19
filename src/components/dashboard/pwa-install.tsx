"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // iOS 检测（不依赖 effect，直接计算）
  const isIOS = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    const ua = navigator.userAgent;
    return /iPad|iPhone|iPod/.test(ua) && !/CriOS|FxiOS/.test(ua);
  }, []);

  useEffect(() => {
    // 监听 beforeinstallprompt (Android/Chrome/鸿蒙)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      if (result.outcome === "accepted") {
        setDeferredPrompt(null);
      }
    }
  };

  // 不支持安装且不是 iOS 时隐藏
  if (!deferredPrompt && !isIOS) return null;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="border-neon-green/50 text-neon-green hover:bg-neon-green/10"
        onClick={handleInstall}
      >
        <Download className="mr-1 h-4 w-4" />
        安装到桌面
      </Button>

      {/* iOS 引导蒙层 */}
      {showIOSGuide && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-6"
          onClick={() => setShowIOSGuide(false)}
        >
          <div
            className="w-full max-w-sm rounded-t-xl border border-neon-cyan/20 bg-card p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-neon-cyan">安装到主屏幕</h3>
              <button onClick={() => setShowIOSGuide(false)}>
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <p>1. 点击 Safari 底部的 <strong>分享按钮</strong> 📤</p>
              <p>2. 在弹出的菜单中选择 <strong>&ldquo;添加到主屏幕&rdquo;</strong></p>
              <p>3. 点击右上角的 <strong>&ldquo;添加&rdquo;</strong></p>
            </div>
            <p className="mt-4 text-muted-foreground text-xs">
              安装后可以从主屏幕直接打开，获得类似原生 App 的体验
            </p>
          </div>
        </div>
      )}
    </>
  );
}
