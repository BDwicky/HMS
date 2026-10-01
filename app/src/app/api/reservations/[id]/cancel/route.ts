import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions/guard";
import { PERM_RESERVATIONS_CANCEL } from "@/lib/permissions";
import { cancelReservation, reservationCancelSchema } from "@/features/reservations/service";
import { toErrorResponse } from "@/lib/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    requirePermission(session, PERM_RESERVATIONS_CANCEL);
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const parsed = reservationCancelSchema.safeParse(body);
    const reason = parsed.success ? parsed.data.reason : undefined;

    const cancelled = await cancelReservation(id, {
      reason,
      cancelledById: session?.user?.id,
    });

    return NextResponse.json({ data: cancelled });
  } catch (e) {
    return NextResponse.json(toErrorResponse(e), {
      status: (e as { statusCode?: number }).statusCode ?? 500,
    });
  }
}
