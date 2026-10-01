import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions/guard";
import { PERM_AUDIT_LOGS_VIEW } from "@/lib/permissions";
import { listAuditLogs } from "@/features/audit/service";
import { toErrorResponse } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    requirePermission(session, PERM_AUDIT_LOGS_VIEW);

    const sp = req.nextUrl.searchParams;
    const data = await listAuditLogs({
      resourceType: sp.get("resourceType") || undefined,
      resourceId: sp.get("resourceId") || undefined,
      userId: sp.get("userId") || undefined,
      action: sp.get("action") || undefined,
      startDate: sp.get("startDate") || undefined,
      endDate: sp.get("endDate") || undefined,
      page: sp.get("page") ? parseInt(sp.get("page")!) : 1,
      limit: sp.get("limit") ? parseInt(sp.get("limit")!) : 30,
    });

    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json(toErrorResponse(e), {
      status: (e as { statusCode?: number }).statusCode ?? 500,
    });
  }
}
