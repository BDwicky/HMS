import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions/guard";
import { PERM_ROOMS_VIEW, PERM_RATE_PLANS_MANAGE } from "@/lib/permissions";
import { getRoomRates, upsertRoomRate, bulkUpsertRoomRates, roomRateUpsertSchema, roomRateBulkSchema } from "@/features/pricing/service";
import { toErrorResponse } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    requirePermission(session, PERM_ROOMS_VIEW);
    const sp = req.nextUrl.searchParams;
    const data = await getRoomRates({
      roomTypeId: sp.get("roomTypeId") ?? undefined,
      ratePlanId: sp.get("ratePlanId") ?? undefined,
      startDate: sp.get("startDate") ?? undefined,
      endDate: sp.get("endDate") ?? undefined,
    });
    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json(toErrorResponse(e), { status: (e as { statusCode?: number }).statusCode ?? 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    requirePermission(session, PERM_RATE_PLANS_MANAGE);
    const body = await req.json();

    // Bulk mode
    if (body.startDate && body.endDate) {
      const parsed = roomRateBulkSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: { code: "VALIDATION_ERROR", message: "Input tidak valid", fields: parsed.error.flatten().fieldErrors } },
          { status: 422 },
        );
      }
      const count = await bulkUpsertRoomRates(parsed.data);
      return NextResponse.json({ data: { updatedDays: count } });
    }

    // Single date
    const parsed = roomRateUpsertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Input tidak valid", fields: parsed.error.flatten().fieldErrors } },
        { status: 422 },
      );
    }
    const data = await upsertRoomRate(parsed.data);
    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json(toErrorResponse(e), { status: (e as { statusCode?: number }).statusCode ?? 500 });
  }
}
