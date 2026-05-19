import { NextResponse } from "next/server";
import { readMockData } from "@/lib/mock-db";

const MOCK_DELAY = 200;

export async function GET() {
  await new Promise((r) => setTimeout(r, MOCK_DELAY));

  const data = readMockData();
  return NextResponse.json({
    ok: true,
    data: {
      marqueeNotice: data.system.marqueeNotice,
      endTime: data.system.endTime,
    },
  });
}
