import { NextRequest, NextResponse } from "next/server";
import {
  addConsentRecord,
  getBuilderIdFromCookie,
  readMockData,
  unauthorizedResponse,
  writeMockData,
} from "@/lib/mock-db";
import { createRecord } from "@/lib/feishu";
import { withMockDelay } from "@/lib/mock-delay";

const CONSENT_TABLE = () => process.env.FEISHU_TABLE_ID_CONSENT ?? "";

function feishuConsentEnabled(): boolean {
  return !!process.env.FEISHU_TABLE_ID_CONSENT && !!process.env.FEISHU_APP_ID;
}

async function writeToFeishu(fields: {
  builderId: string;
  version: string;
  ua: string;
  ip: string;
}) {
  const record = await createRecord(CONSENT_TABLE(), {
    用户标识: fields.builderId,
    授权场景: "首次登录系统",
    协议版本: fields.version,
    是否同意: "同意",
    网络环境: `${fields.ua} | IP: ${fields.ip}`,
    // 确认时间 为飞书 created_at 类型字段，由飞书系统自动生成，不通过 API 传入
  });
  return record !== null;
}

export async function POST(request: NextRequest) {
  await withMockDelay(500);

  const builderId = getBuilderIdFromCookie(request);
  if (!builderId) return unauthorizedResponse();

  try {
    const { version, action, ua } = await request.json();

    if (!version || !action) {
      return NextResponse.json(
        { ok: false, error: "缺少必要参数" },
        { status: 400 }
      );
    }

    if (action !== "AGREE") {
      return NextResponse.json(
        { ok: false, error: "无效的操作" },
        { status: 400 }
      );
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "未知";

    if (feishuConsentEnabled()) {
      const success = await writeToFeishu({
        builderId,
        version,
        ua: ua ?? "未知",
        ip,
      });

      if (!success) {
        return NextResponse.json(
          { ok: false, error: "写入授权记录失败" },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: true, data: { recorded: true } });
    }

    // Mock 模式
    const data = readMockData();

    const record = {
      builderId,
      scene: "首次登录系统" as const,
      version,
      agreed: true,
      ua: `${ua ?? "未知"} | IP: ${ip}`,
      createdAt: new Date().toISOString(),
    };

    addConsentRecord(data, record);
    writeMockData(data);

    return NextResponse.json({ ok: true, data: { recorded: true } });
  } catch {
    return NextResponse.json(
      { ok: false, error: "服务器错误" },
      { status: 500 }
    );
  }
}
