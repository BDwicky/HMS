import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions/guard";
import { PERM_ROOMS_VIEW, PERM_ROOMS_MANAGE } from "@/lib/permissions";
import { getRoom, updateRoom, roomUpdateSchema } from "@/features/rooms/service";
import { toErrorResponse } from "@/lib/errors";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    requirePermission(session, PERM_ROOMS_VIEW);
    const { id } = await params;
    const data = await getRoom(id);
    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json(toErrorResponse(e), { status: (e as { statusCode?: number }).statusCode ?? 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    requirePermission(session, PERM_ROOMS_MANAGE);
    const { id } = await params;
    const body = await req.json();
    const parsed = roomUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Input tidak valid", fields: parsed.error.flatten().fieldErrors } },
        { status: 422 },
      );
    }
    const data = await updateRoom(id, parsed.data);
    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json(toErrorResponse(e), { status: (e as { statusCode?: number }).statusCode ?? 500 });
  }
}
