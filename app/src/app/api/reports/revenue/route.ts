import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions/guard";
import { PERM_REPORTS_VIEW } from "@/lib/permissions";
import { getRevenueReport } from "@/features/reports/service";
import { toErrorResponse } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    requirePermission(session, PERM_REPORTS_VIEW);

    const sp = req.nextUrl.searchParams;
    const today = new Date().toISOString().split("T")[0];
    const sevenDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const startDate = sp.get("startDate") || sevenDaysAgo;
    const endDate = sp.get("endDate") || today;

    const data = await getRevenueReport({ startDate, endDate });
    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json(toErrorResponse(e), {
      status: (e as { statusCode?: number }).statusCode ?? 500,
    });
  }
}
