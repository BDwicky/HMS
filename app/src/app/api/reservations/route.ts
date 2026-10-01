import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions/guard";
import { PERM_RESERVATIONS_VIEW, PERM_RESERVATIONS_CREATE } from "@/lib/permissions";
import {
  listReservations,
  createReservation,
  reservationCreateSchema,
} from "@/features/reservations/service";
import { ReservationStatus, ReservationSource } from "@prisma/client";
import { toErrorResponse } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    requirePermission(session, PERM_RESERVATIONS_VIEW);
    const sp = req.nextUrl.searchParams;

    const data = await listReservations({
      status: (sp.get("status") as ReservationStatus) || undefined,
      checkIn: sp.get("checkIn") || undefined,
      checkOut: sp.get("checkOut") || undefined,
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

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const body = await req.json();

    const parsed = reservationCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Input reservasi tidak valid",
            fields: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 422 },
      );
    }

    // If source is STAFF or WALK_IN, require staff permission
    if (parsed.data.source !== ReservationSource.ONLINE) {
      requirePermission(session, PERM_RESERVATIONS_CREATE);
    }

    const reservation = await createReservation(parsed.data, session?.user?.id);
    return NextResponse.json({ data: reservation }, { status: 201 });
  } catch (e) {
    return NextResponse.json(toErrorResponse(e), {
      status: (e as { statusCode?: number }).statusCode ?? 500,
    });
  }
}
