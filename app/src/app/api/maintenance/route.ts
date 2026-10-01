import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions/guard";
import { PERM_MAINTENANCE_VIEW, PERM_MAINTENANCE_MANAGE } from "@/lib/permissions";
import {
  listMaintenanceRequests,
  createMaintenanceRequest,
  createMaintenanceSchema,
} from "@/features/maintenance/service";
import { MaintenanceStatus, MaintenancePriority } from "@prisma/client";
import { toErrorResponse } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    requirePermission(session, PERM_MAINTENANCE_VIEW);
    const sp = req.nextUrl.searchParams;

    const data = await listMaintenanceRequests({
      status: (sp.get("status") as MaintenanceStatus) || undefined,
      priority: (sp.get("priority") as MaintenancePriority) || undefined,
      roomId: sp.get("roomId") || undefined,
      page: sp.get("page") ? Number(sp.get("page")) : 1,
      limit: sp.get("limit") ? Number(sp.get("limit")) : 30,
    });

    return NextResponse.json({ data: data.items, meta: data.pagination });
  } catch (e) {
    return NextResponse.json(toErrorResponse(e), {
      status: (e as { statusCode?: number }).statusCode ?? 500,
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    requirePermission(session, PERM_MAINTENANCE_MANAGE);
    const body = await req.json();

    const parsed = createMaintenanceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Parameter permintaan perbaikan tidak valid",
            fields: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 422 },
      );
    }

    const reqRecord = await createMaintenanceRequest(parsed.data, session?.user?.id);
    return NextResponse.json({ data: reqRecord }, { status: 201 });
  } catch (e) {
    return NextResponse.json(toErrorResponse(e), {
      status: (e as { statusCode?: number }).statusCode ?? 500,
    });
  }
}
