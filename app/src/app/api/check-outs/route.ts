import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions/guard";
import { PERM_CHECKOUT_PROCESS } from "@/lib/permissions";
import { processCheckOut, checkOutSchema } from "@/features/stays/service";
import { toErrorResponse } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    requirePermission(session, PERM_CHECKOUT_PROCESS);
    const body = await req.json();

    const parsed = checkOutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Parameter check-out tidak valid",
            fields: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 422 },
      );
    }

    const closedStay = await processCheckOut(parsed.data.stayId, session?.user?.id);
    return NextResponse.json({ data: closedStay });
  } catch (e) {
    return NextResponse.json(toErrorResponse(e), {
      status: (e as { statusCode?: number }).statusCode ?? 500,
    });
  }
}
