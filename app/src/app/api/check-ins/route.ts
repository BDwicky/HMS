import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions/guard";
import { PERM_CHECKIN_PROCESS } from "@/lib/permissions";
import { processCheckIn, checkInSchema } from "@/features/stays/service";
import { toErrorResponse } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    requirePermission(session, PERM_CHECKIN_PROCESS);
    const body = await req.json();

    const parsed = checkInSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Parameter check-in tidak valid",
            fields: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 422 },
      );
    }

    const stay = await processCheckIn(parsed.data, session?.user?.id);
    return NextResponse.json({ data: stay }, { status: 201 });
  } catch (e) {
    return NextResponse.json(toErrorResponse(e), {
      status: (e as { statusCode?: number }).statusCode ?? 500,
    });
  }
}
