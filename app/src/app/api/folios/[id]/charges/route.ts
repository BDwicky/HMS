import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions/guard";
import { PERM_FOLIOS_ADD_CHARGE } from "@/lib/permissions";
import { addFolioCharge, addChargeSchema } from "@/features/folios/service";
import { toErrorResponse } from "@/lib/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    requirePermission(session, PERM_FOLIOS_ADD_CHARGE);
    const { id } = await params;
    const body = await req.json();

    const parsed = addChargeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Parameter tagihan tambahan tidak valid",
            fields: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 422 },
      );
    }

    const result = await addFolioCharge(id, parsed.data);
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (e) {
    return NextResponse.json(toErrorResponse(e), {
      status: (e as { statusCode?: number }).statusCode ?? 500,
    });
  }
}
