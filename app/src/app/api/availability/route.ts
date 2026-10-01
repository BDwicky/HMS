import { NextRequest, NextResponse } from "next/server";
import { checkAvailability, availabilityQuerySchema } from "@/features/availability/service";
import { toErrorResponse } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;

    const query = {
      checkIn: sp.get("checkIn") || "",
      checkOut: sp.get("checkOut") || "",
      adults: sp.get("adults") || "1",
      children: sp.get("children") || "0",
      roomTypeId: sp.get("roomTypeId") || undefined,
    };

    const parsed = availabilityQuerySchema.safeParse(query);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Parameter pencarian ketersediaan tidak valid",
            fields: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 422 },
      );
    }

    const results = await checkAvailability(parsed.data);
    return NextResponse.json({ data: results });
  } catch (e) {
    return NextResponse.json(toErrorResponse(e), {
      status: (e as { statusCode?: number }).statusCode ?? 500,
    });
  }
}
