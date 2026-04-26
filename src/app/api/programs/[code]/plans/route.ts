import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const plans = await db.coursePlan.findMany({
    where: { programCode: code },
    select: { id: true, title: true, updatedAt: true },
    orderBy: { id: "desc" },
  });
  return NextResponse.json(plans);
}
