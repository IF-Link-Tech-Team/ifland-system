import { NextRequest, NextResponse } from "next/server";
import {
  findConsentByBuilderId,
  getBuilderIdFromCookie,
  readMockData,
  unauthorizedResponse,
} from "@/lib/mock-db";
import { getUserByBuilderId } from "@/lib/data-service";
import { searchRecords } from "@/lib/feishu";
import { withMockDelay } from "@/lib/mock-delay";

const CONSENT_TABLE = () => process.env.FEISHU_TABLE_ID_CONSENT ?? "";

function feishuConsentEnabled(): boolean {
  return !!process.env.FEISHU_TABLE_ID_CONSENT && !!process.env.FEISHU_APP_ID;
}

async function checkFeishuConsent(builderId: string): Promise<boolean> {
  const records = await searchRecords(CONSENT_TABLE(), {
    conjunction: "and",
    conditions: [
      { field_name: "用户标识", operator: "is", value: [builderId] },
      { field_name: "授权场景", operator: "is", value: ["首次登录系统"] },
    ],
  });
  return records.length > 0;
}

export async function GET(request: NextRequest) {
  await withMockDelay(300);

  const builderId = getBuilderIdFromCookie(request);
  if (!builderId) return unauthorizedResponse();

  if (feishuConsentEnabled()) {
    // 优先从用户表的授权状态字段判断
    const user = await getUserByBuilderId(builderId);
    if (user?.consentStatus === "已授权") {
      return NextResponse.json({
        ok: true,
        data: { needsConsent: false },
      });
    }
    // 兜底：查授权记录表
    const hasConsented = await checkFeishuConsent(builderId);
    return NextResponse.json({
      ok: true,
      data: { needsConsent: !hasConsented },
    });
  }

  const data = readMockData();
  const record = findConsentByBuilderId(data, builderId, "首次登录系统");

  return NextResponse.json({
    ok: true,
    data: { needsConsent: !record },
  });
}
