import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions/guard";
import { PERM_SETTINGS_VIEW, PERM_SETTINGS_MANAGE } from "@/lib/permissions";
import { getHotelSettings, upsertHotelSettings, hotelSettingUpdateSchema } from "@/features/settings/service";
import { toErrorResponse } from "@/lib/errors";

export async function GET() {
  try {
    const session = await auth();
    requirePermission(session, PERM_SETTINGS_VIEW);
    const settings = await getHotelSettings();
    return NextResponse.json({ data: settings });
  } catch (e) {
    return NextResponse.json(toErrorResponse(e), { status: (e as { statusCode?: number }).statusCode ?? 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    requirePermission(session, PERM_SETTINGS_MANAGE);
    const body = await req.json();
    const parsed = hotelSettingUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Input tidak valid", fields: parsed.error.flatten().fieldErrors } },
        { status: 422 },
      );
    }
    const settings = await upsertHotelSettings(parsed.data);
    return NextResponse.json({ data: settings });
  } catch (e) {
    return NextResponse.json(toErrorResponse(e), { status: (e as { statusCode?: number }).statusCode ?? 500 });
  }
}
