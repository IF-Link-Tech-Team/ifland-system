import { NextResponse } from "next/server";
import { getDataSource } from "@/lib/data-source";

export async function GET() {
  try {
    const ds = getDataSource();
    const projects = await ds.getShowcaseProjects();
    return NextResponse.json({ success: true, data: projects });
  } catch (err) {
    console.error("[API /projects] error:", err);
    return NextResponse.json({ success: false, data: [] }, { status: 500 });
  }
}
