import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions/guard";
import { PERM_RESERVATIONS_NO_SHOW } from "@/lib/permissions";
import { markNoShow } from "@/features/reservations/service";
import { toErrorResponse } from "@/lib/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    requirePermission(session, PERM_RESERVATIONS_NO_SHOW);
    const { id } = await params;

    const noShow = await markNoShow(id, session?.user?.id);
    return NextResponse.json({ data: noShow });
  } catch (e) {
    return NextResponse.json(toErrorResponse(e), {
      status: (e as { statusCode?: number }).statusCode ?? 500,
    });
  }
}
