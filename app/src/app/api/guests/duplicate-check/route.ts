import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions/guard";
import { PERM_GUESTS_VIEW } from "@/lib/permissions";
import { checkDuplicateGuest } from "@/features/guests/service";
import { toErrorResponse } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    requirePermission(session, PERM_GUESTS_VIEW);
    const sp = req.nextUrl.searchParams;

    const email = sp.get("email");
    const phone = sp.get("phone");
    const excludeId = sp.get("excludeId") ?? undefined;

    const result = await checkDuplicateGuest({ email, phone, excludeId });
    return NextResponse.json({ data: result });
  } catch (e) {
    return NextResponse.json(toErrorResponse(e), { status: (e as { statusCode?: number }).statusCode ?? 500 });
  }
}
