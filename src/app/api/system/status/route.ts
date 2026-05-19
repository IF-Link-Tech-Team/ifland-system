import { NextResponse } from "next/server";
import { getSystemConfig } from "@/lib/data-service";

const MOCK_DELAY = 200;

export async function GET() {
  if (process.env.USE_FEISHU !== "true") {
    await new Promise((r) => setTimeout(r, MOCK_DELAY));
  }

  const config = await getSystemConfig();

  return NextResponse.json({
    ok: true,
    data: {
      marqueeNotice: config.marqueeNotice,
      endTime: config.endTime,
    },
  });
}
