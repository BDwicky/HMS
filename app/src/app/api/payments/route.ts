import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions/guard";
import { PERM_PAYMENTS_PROCESS } from "@/lib/permissions";
import { recordPayment, recordPaymentSchema } from "@/features/payments/service";
import { toErrorResponse } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    requirePermission(session, PERM_PAYMENTS_PROCESS);
    const body = await req.json();

    const parsed = recordPaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Parameter pembayaran tidak valid",
            fields: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 422 },
      );
    }

    const payment = await recordPayment(parsed.data, session?.user?.id);
    return NextResponse.json({ data: payment }, { status: 201 });
  } catch (e) {
    return NextResponse.json(toErrorResponse(e), {
      status: (e as { statusCode?: number }).statusCode ?? 500,
    });
  }
}
