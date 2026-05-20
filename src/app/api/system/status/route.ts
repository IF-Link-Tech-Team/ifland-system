import { NextResponse } from "next/server";
import { getSystemConfig } from "@/lib/data-service";
import { withMockDelay } from "@/lib/mock-delay";

export async function GET() {
  await withMockDelay(200);

  const config = await getSystemConfig();

  return NextResponse.json({
    ok: true,
    data: {
      marqueeNotice: config.marqueeNotice,
      endTime: config.endTime,
    },
  });
}
