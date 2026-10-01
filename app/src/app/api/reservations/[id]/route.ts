import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions/guard";
import { PERM_RESERVATIONS_VIEW } from "@/lib/permissions";
import { getReservation } from "@/features/reservations/service";
import { toErrorResponse } from "@/lib/errors";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    requirePermission(session, PERM_RESERVATIONS_VIEW);
    const { id } = await params;

    const reservation = await getReservation(id);
    return NextResponse.json({ data: reservation });
  } catch (e) {
    return NextResponse.json(toErrorResponse(e), {
      status: (e as { statusCode?: number }).statusCode ?? 500,
    });
  }
}
