import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions/guard";
import { PERM_STAYS_MANAGE } from "@/lib/permissions";
import { changeRoom, changeRoomSchema } from "@/features/stays/service";
import { toErrorResponse } from "@/lib/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    requirePermission(session, PERM_STAYS_MANAGE);
    const { id } = await params;
    const body = await req.json();

    const parsed = changeRoomSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Parameter pindah kamar tidak valid",
            fields: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 422 },
      );
    }

    const updatedStay = await changeRoom(id, parsed.data, session?.user?.id);
    return NextResponse.json({ data: updatedStay });
  } catch (e) {
    return NextResponse.json(toErrorResponse(e), {
      status: (e as { statusCode?: number }).statusCode ?? 500,
    });
  }
}
