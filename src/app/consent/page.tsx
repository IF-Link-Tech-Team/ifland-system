"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const COUNTDOWN_SECONDS = 10;
const AGREEMENT_VERSION = "V1.0.0";

export default function ConsentPage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const countdownDone = countdown <= 0;
  const canSubmit = countdownDone && checked && !submitting;

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/consent/record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: AGREEMENT_VERSION,
          action: "AGREE",
          ua: navigator.userAgent ?? "未知",
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        toast.error(json.error ?? "提交失败");
        setSubmitting(false);
        return;
      }

      toast.success("授权成功");
      router.push("/dashboard");
    } catch {
      toast.error("网络错误，请重试");
      setSubmitting(false);
    }
  }, [canSubmit, router]);

  const buttonLabel = (() => {
    if (submitting) return "提交中...";
    if (!countdownDone) return `请阅读知情同意书（${countdown}s）`;
    if (!checked) return "请阅读并勾选同意";
    return "同意并进入主页";
  })();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* 顶部标题 */}
      <header className="flex shrink-0 items-center justify-center border-b border-border px-4 py-6">
        <h1 className="text-xl font-bold tracking-wider text-ifland-primary sm:text-2xl">
          知情同意书
        </h1>
      </header>

      {/* 协议内容 - 可滚动 */}
      <main className="flex-1 overflow-y-auto px-5 py-6">
        <div className="mx-auto max-w-lg space-y-5 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="mb-3 text-base font-semibold text-foreground">
              信息收集与使用
            </h2>
            <p>
              欢迎参加本次黑客松活动。在您使用本系统前，我们需要收集您的以下信息：
              姓名、手机号、邮箱、学校/单位、以及您在系统中的操作记录（包括组队、项目提交等）。
              这些信息仅用于本次活动期间的身份认证、队伍管理、项目评审及活动组织相关用途。
            </p>
            <p className="mt-2">
              活动结束后，未通过筛选或不再需要保留的个人信息将在特定时间后予以删除或匿名化处理。
              您的授权记录将作为电子证据留存，以备后续合规审查所需。
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-foreground">
              用户服务协议
            </h2>
            <p>
              您在使用本系统期间，承诺遵守活动现场的各项规定，不得利用系统进行任何违法违规行为。
              您理解并同意，系统后台将对您在本系统中的操作进行必要的记录和审计。
              如发现异常行为，组委会有权根据情况进行处理，包括但不限于取消参赛资格。
            </p>
            <p className="mt-2">
              本系统基于飞书多维表格实现数据管理，您的数据将受到飞书平台安全机制的保护。
              后台采用严格的权限隔离机制，仅授权管理人员可访问您的个人信息。
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-foreground">
              授权确认
            </h2>
            <p>
              点击下方&ldquo;同意并进入主页&rdquo;即表示您确认：
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>您已年满 18 周岁（或已获得监护人同意）</li>
              <li>您已完整阅读并理解上述《知情同意书》及《用户服务协议》的全部内容</li>
              <li>您同意我们按照上述说明收集、使用和保存您的个人信息</li>
              <li>您理解并可随时联系现场工作人员咨询相关隐私问题</li>
            </ul>
          </section>
        </div>
      </main>

      {/* 底部操作区 - 固定 */}
      <footer className="shrink-0 border-t border-border px-5 py-5">
        <div className="mx-auto max-w-lg space-y-4">
          {/* 复选框 */}
          <label className="flex cursor-pointer items-start gap-3 select-none">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-ifland-primary"
            />
            <span className="text-sm text-muted-foreground">
              我已阅读并同意《知情同意书》及《用户服务协议》
            </span>
          </label>

          {/* 提交按钮 */}
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full border border-ifland-primary/50 bg-ifland-primary/10 py-6 text-base text-ifland-primary hover:bg-ifland-primary/20 disabled:border-border disabled:bg-muted disabled:text-muted-foreground"
          >
            {buttonLabel}
          </Button>
        </div>
      </footer>
    </div>
  );
}
