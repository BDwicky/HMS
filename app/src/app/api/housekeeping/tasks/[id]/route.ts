import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions/guard";
import { PERM_HOUSEKEEPING_UPDATE_STATUS } from "@/lib/permissions";
import {
  updateHousekeepingTaskStatus,
  updateTaskStatusSchema,
} from "@/features/housekeeping/service";
import { toErrorResponse } from "@/lib/errors";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    requirePermission(session, PERM_HOUSEKEEPING_UPDATE_STATUS);
    const { id } = await params;
    const body = await req.json();

    const parsed = updateTaskStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Aksi status housekeeping tidak valid",
            fields: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 422 },
      );
    }

    const updatedTask = await updateHousekeepingTaskStatus(id, parsed.data, session?.user?.id);
    return NextResponse.json({ data: updatedTask });
  } catch (e) {
    return NextResponse.json(toErrorResponse(e), {
      status: (e as { statusCode?: number }).statusCode ?? 500,
    });
  }
}
