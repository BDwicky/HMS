import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions/guard";
import { PERM_REFUNDS_PROCESS } from "@/lib/permissions";
import { processRefund, refundSchema } from "@/features/payments/service";
import { toErrorResponse } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    requirePermission(session, PERM_REFUNDS_PROCESS);
    const body = await req.json();

    const parsed = refundSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Parameter pengembalian dana (refund) tidak valid",
            fields: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 422 },
      );
    }

    const refund = await processRefund(parsed.data);
    return NextResponse.json({ data: refund }, { status: 201 });
  } catch (e) {
    return NextResponse.json(toErrorResponse(e), {
      status: (e as { statusCode?: number }).statusCode ?? 500,
    });
  }
}
