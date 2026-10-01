import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions/guard";
import { PERM_REPORTS_VIEW } from "@/lib/permissions";
import { getDashboardKPIs } from "@/features/reports/service";
import { toErrorResponse } from "@/lib/errors";

export async function GET() {
  try {
    const session = await auth();
    requirePermission(session, PERM_REPORTS_VIEW);

    const data = await getDashboardKPIs();
    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json(toErrorResponse(e), {
      status: (e as { statusCode?: number }).statusCode ?? 500,
    });
  }
}
