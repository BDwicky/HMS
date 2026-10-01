import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions/guard";
import { PERM_ROOMS_VIEW } from "@/lib/permissions";
import { listStays } from "@/features/stays/service";
import { StayStatus } from "@prisma/client";
import { toErrorResponse } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    requirePermission(session, PERM_ROOMS_VIEW);
    const sp = req.nextUrl.searchParams;

    const data = await listStays({
      status: (sp.get("status") as StayStatus) || undefined,
      search: sp.get("search") || sp.get("q") || undefined,
      page: sp.get("page") ? Number(sp.get("page")) : 1,
      limit: sp.get("limit") ? Number(sp.get("limit")) : 20,
    });

    return NextResponse.json({ data: data.items, meta: data.pagination });
  } catch (e) {
    return NextResponse.json(toErrorResponse(e), {
      status: (e as { statusCode?: number }).statusCode ?? 500,
    });
  }
}
