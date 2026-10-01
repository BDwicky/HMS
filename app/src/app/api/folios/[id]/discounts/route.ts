import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions/guard";
import { PERM_FOLIOS_APPLY_DISCOUNT } from "@/lib/permissions";
import { applyFolioDiscount, addDiscountSchema } from "@/features/folios/service";
import { toErrorResponse } from "@/lib/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    requirePermission(session, PERM_FOLIOS_APPLY_DISCOUNT);
    const { id } = await params;
    const body = await req.json();

    const parsed = addDiscountSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Parameter diskon tidak valid",
            fields: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 422 },
      );
    }

    const result = await applyFolioDiscount(id, parsed.data);
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (e) {
    return NextResponse.json(toErrorResponse(e), {
      status: (e as { statusCode?: number }).statusCode ?? 500,
    });
  }
}
