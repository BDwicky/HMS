import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions/guard";
import { PERM_GUESTS_VIEW, PERM_GUESTS_UPDATE } from "@/lib/permissions";
import { getGuest, updateGuest, guestUpdateSchema } from "@/features/guests/service";
import { toErrorResponse } from "@/lib/errors";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    requirePermission(session, PERM_GUESTS_VIEW);
    const { id } = await params;
    const guest = await getGuest(id);
    return NextResponse.json({ data: guest });
  } catch (e) {
    return NextResponse.json(toErrorResponse(e), { status: (e as { statusCode?: number }).statusCode ?? 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    requirePermission(session, PERM_GUESTS_UPDATE);
    const { id } = await params;
    const body = await req.json();

    const parsed = guestUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Input tidak valid", fields: parsed.error.flatten().fieldErrors } },
        { status: 422 },
      );
    }

    const guest = await updateGuest(id, parsed.data);
    return NextResponse.json({ data: guest });
  } catch (e) {
    return NextResponse.json(toErrorResponse(e), { status: (e as { statusCode?: number }).statusCode ?? 500 });
  }
}
