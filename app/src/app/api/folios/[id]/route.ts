import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions/guard";
import { PERM_FOLIOS_VIEW } from "@/lib/permissions";
import { getFolio } from "@/features/folios/service";
import { toErrorResponse } from "@/lib/errors";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    requirePermission(session, PERM_FOLIOS_VIEW);
    const { id } = await params;

    const folio = await getFolio(id);
    return NextResponse.json({ data: folio });
  } catch (e) {
    return NextResponse.json(toErrorResponse(e), {
      status: (e as { statusCode?: number }).statusCode ?? 500,
    });
  }
}
