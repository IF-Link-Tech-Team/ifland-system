"use client";

import { useState, useSyncExternalStore, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface FeishuPendingInfo {
  name: string;
  avatarUrl: string;
}

function readFeishuPendingInfo(): FeishuPendingInfo | null {
  if (typeof document === "undefined") return null;
  const cookies = document.cookie.split(";").reduce(
    (acc, c) => {
      const [k, v] = c.trim().split("=");
      acc[k] = v;
      return acc;
    },
    {} as Record<string, string>
  );
  if (cookies["feishu_pending_info"]) {
    try {
      return JSON.parse(decodeURIComponent(cookies["feishu_pending_info"]));
    } catch {
      return null;
    }
  }
  return null;
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageContent />
    </Suspense>
  );
}

function useFeishuPending(isBindMode: boolean) {
  return useSyncExternalStore(
    () => () => {},
    () => (isBindMode ? readFeishuPendingInfo() : null),
    () => null
  );
}

function LoginPageContent() {
  const [builderId, setBuilderId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feishuLoading, setFeishuLoading] = useState(false);
  const { login, feishuLogin, feishuBind } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isBindMode = searchParams.get("bind") === "1";
  const hasOauthError = searchParams.get("error") === "oauth_failed";
  const oauthErrorDetail = searchParams.get("detail") ?? "";
  const feishuPending = useFeishuPending(isBindMode);

  const handleLogin = async () => {
    const id = builderId.trim();
    if (!id) {
      toast.error("请输入 Builder 号");
      return;
    }

    setSubmitting(true);
    try {
      await login(id);
      toast.success("登录成功");
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "登录失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBind = async () => {
    const id = builderId.trim();
    if (!id) {
      toast.error("请输入你的 Builder 号");
      return;
    }

    setSubmitting(true);
    try {
      await feishuBind(id);
      toast.success("绑定成功");
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "绑定失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFeishuLogin = async () => {
    setFeishuLoading(true);
    try {
      await feishuLogin();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "飞书登录失败");
      setFeishuLoading(false);
    }
  };

  // 绑定模式
  if (isBindMode) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-6">
        <div className="flex flex-col items-center gap-2">
          <h1 className="neon-glow-cyan text-2xl font-bold tracking-wider text-neon-cyan">
            绑定 Builder 号
          </h1>
          <p className="text-muted-foreground text-sm text-center">
            首次使用飞书登录，请输入你的 Builder 号完成绑定
          </p>
          {hasOauthError && (
            <div className="space-y-1">
              <p className="text-destructive text-xs">飞书授权失败</p>
              {oauthErrorDetail && (
                <p className="text-destructive/70 text-xs break-all">{oauthErrorDetail}</p>
              )}
            </div>
          )}
        </div>

        {feishuPending && (
          <div className="flex items-center gap-3 rounded-lg border border-neon-cyan/20 bg-card/50 px-4 py-3">
            {feishuPending.avatarUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={feishuPending.avatarUrl}
                alt=""
                className="h-8 w-8 rounded-full"
              />
            )}
            <span className="text-sm">{feishuPending.name}</span>
          </div>
        )}

        <div className="w-full max-w-xs space-y-4">
          <Input
            placeholder="输入你的 Builder 号"
            value={builderId}
            onChange={(e) => setBuilderId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleBind()}
            className="border-neon-cyan/30 bg-card text-center text-lg placeholder:text-muted-foreground/50 focus:border-neon-cyan"
            disabled={submitting}
          />
          <Button
            onClick={handleBind}
            disabled={submitting}
            className="neon-border-cyan w-full border border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan hover:bg-neon-cyan/20"
          >
            {submitting ? "绑定中..." : "确认绑定"}
          </Button>
        </div>

        <Button
          variant="ghost"
          className="text-muted-foreground/60 text-xs"
          onClick={() => router.push("/login")}
        >
          返回普通登录
        </Button>
      </div>
    );
  }

  // 普通登录模式
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-6">
      <div className="flex flex-col items-center gap-2">
        <h1 className="neon-glow-cyan text-3xl font-bold tracking-wider text-neon-cyan">
          IF.Land
        </h1>
        <p className="text-muted-foreground text-sm">输入 Builder 号进入系统</p>
      </div>

      <div className="w-full max-w-xs space-y-4">
        <Input
          placeholder="Builder 号 (如 111)"
          value={builderId}
          onChange={(e) => setBuilderId(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          className="border-neon-cyan/30 bg-card text-center text-lg placeholder:text-muted-foreground/50 focus:border-neon-cyan"
          disabled={submitting}
        />
        <Button
          onClick={handleLogin}
          disabled={submitting}
          className="neon-border-cyan w-full border border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan hover:bg-neon-cyan/20"
        >
          {submitting ? "登录中..." : "进入系统"}
        </Button>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-muted-foreground/50 text-xs">或</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <Button
          onClick={handleFeishuLogin}
          disabled={feishuLoading}
          variant="outline"
          className="w-full border-blue-500/40 bg-blue-500/5 text-blue-400 hover:bg-blue-500/15 hover:text-blue-300"
        >
          {feishuLoading ? "跳转中..." : "飞书登录"}
        </Button>
      </div>

      <p className="text-muted-foreground/60 text-xs">
        测试账号: 111 / 222 / 333 / 444
      </p>
    </div>
  );
}
