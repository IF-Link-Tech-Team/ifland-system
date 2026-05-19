"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function LoginPage() {
  const [builderId, setBuilderId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

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
      </div>

      <p className="text-muted-foreground/60 text-xs">
        测试账号: 111 / 222 / 333 / 444
      </p>
    </div>
  );
}
