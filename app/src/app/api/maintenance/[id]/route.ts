import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions/guard";
import { PERM_MAINTENANCE_MANAGE } from "@/lib/permissions";
import {
  updateMaintenanceRequest,
  updateMaintenanceSchema,
} from "@/features/maintenance/service";
import { toErrorResponse } from "@/lib/errors";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    requirePermission(session, PERM_MAINTENANCE_MANAGE);
    const { id } = await params;
    const body = await req.json();

    const parsed = updateMaintenanceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Status pemeliharaan tidak valid",
            fields: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 422 },
      );
    }

    const updated = await updateMaintenanceRequest(id, parsed.data);
    return NextResponse.json({ data: updated });
  } catch (e) {
    return NextResponse.json(toErrorResponse(e), {
      status: (e as { statusCode?: number }).statusCode ?? 500,
    });
  }
}
