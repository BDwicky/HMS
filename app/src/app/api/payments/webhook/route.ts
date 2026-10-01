import { NextRequest, NextResponse } from "next/server";
import { recordPayment } from "@/features/payments/service";
import { PaymentMethod } from "@prisma/client";
import { toErrorResponse } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const providerTransactionId =
      body.order_id || body.transaction_id || body.id || body.external_id;
    const reservationId = body.reservationId || body.custom_field1;
    const amount = Number(body.gross_amount || body.amount || 0);

    if (!reservationId || !providerTransactionId || amount <= 0) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Payload webhook tidak valid" } },
        { status: 400 },
      );
    }

    const payment = await recordPayment({
      reservationId,
      amount,
      method: (body.payment_type as PaymentMethod) || PaymentMethod.QRIS,
      provider: body.provider || "GATEWAY_WEBHOOK",
      providerTransactionId: String(providerTransactionId),
      idempotencyKey: `webhook_${providerTransactionId}`,
    });

    return NextResponse.json({ status: "OK", data: payment });
  } catch (e) {
    return NextResponse.json(toErrorResponse(e), {
      status: (e as { statusCode?: number }).statusCode ?? 500,
    });
  }
}
