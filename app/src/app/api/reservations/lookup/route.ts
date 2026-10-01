import { NextRequest, NextResponse } from "next/server";
import { getReservationByReference } from "@/features/reservations/service";
import { toErrorResponse } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const ref = sp.get("bookingReference") || sp.get("ref");
    const email = sp.get("email");

    if (!ref) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Nomor referensi booking (bookingReference) wajib diisi" } },
        { status: 400 },
      );
    }

    const reservation = await getReservationByReference(ref.trim(), email ? email.trim() : undefined);
    return NextResponse.json({ data: reservation });
  } catch (e) {
    return NextResponse.json(toErrorResponse(e), {
      status: (e as { statusCode?: number }).statusCode ?? 500,
    });
  }
}
