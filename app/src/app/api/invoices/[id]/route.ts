import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions/guard";
import { PERM_INVOICES_VIEW } from "@/lib/permissions";
import { getInvoice } from "@/features/invoices/service";
import { toErrorResponse } from "@/lib/errors";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    requirePermission(session, PERM_INVOICES_VIEW);
    const { id } = await params;

    const invoice = await getInvoice(id);
    return NextResponse.json({ data: invoice });
  } catch (e) {
    return NextResponse.json(toErrorResponse(e), {
      status: (e as { statusCode?: number }).statusCode ?? 500,
    });
  }
}
