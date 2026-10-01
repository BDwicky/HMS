import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions/guard";
import { PERM_ROOMS_VIEW, PERM_ROOMS_MANAGE } from "@/lib/permissions";
import { listRooms, createRoom, roomCreateSchema } from "@/features/rooms/service";
import { toErrorResponse } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    requirePermission(session, PERM_ROOMS_VIEW);
    const sp = req.nextUrl.searchParams;
    const data = await listRooms({
      includeInactive: sp.get("includeInactive") === "true",
      roomTypeId: sp.get("roomTypeId") ?? undefined,
    });
    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json(toErrorResponse(e), { status: (e as { statusCode?: number }).statusCode ?? 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    requirePermission(session, PERM_ROOMS_MANAGE);
    const body = await req.json();
    const parsed = roomCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Input tidak valid", fields: parsed.error.flatten().fieldErrors } },
        { status: 422 },
      );
    }
    const data = await createRoom(parsed.data);
    return NextResponse.json({ data }, { status: 201 });
  } catch (e) {
    return NextResponse.json(toErrorResponse(e), { status: (e as { statusCode?: number }).statusCode ?? 500 });
  }
}
