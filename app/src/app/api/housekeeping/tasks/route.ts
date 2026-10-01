import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions/guard";
import { PERM_HOUSEKEEPING_VIEW, PERM_HOUSEKEEPING_MANAGE } from "@/lib/permissions";
import {
  listHousekeepingTasks,
  createHousekeepingTask,
  createTaskSchema,
} from "@/features/housekeeping/service";
import { HousekeepingTaskStatus } from "@prisma/client";
import { toErrorResponse } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    requirePermission(session, PERM_HOUSEKEEPING_VIEW);
    const sp = req.nextUrl.searchParams;

    const data = await listHousekeepingTasks({
      status: (sp.get("status") as HousekeepingTaskStatus) || undefined,
      roomId: sp.get("roomId") || undefined,
      assignedToId: sp.get("assignedToId") || undefined,
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
    requirePermission(session, PERM_HOUSEKEEPING_MANAGE);
    const body = await req.json();

    const parsed = createTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Parameter tugas housekeeping tidak valid",
            fields: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 422 },
      );
    }

    const task = await createHousekeepingTask(parsed.data, session?.user?.id);
    return NextResponse.json({ data: task }, { status: 201 });
  } catch (e) {
    return NextResponse.json(toErrorResponse(e), {
      status: (e as { statusCode?: number }).statusCode ?? 500,
    });
  }
}
