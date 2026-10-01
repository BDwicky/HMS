import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { expirePendingReservations } from "@/features/scheduler/service";
import { toErrorResponse } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    // Check either secret header or admin session
    const cronSecret = req.headers.get("x-cron-secret");
    const expectedSecret = process.env.CRON_SECRET;

    if (!expectedSecret || cronSecret !== expectedSecret) {
      const session = await auth();
      if (!session?.user?.roleName?.includes("Admin") && !session?.user?.roleName?.includes("Manager")) {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: "Akses cron ditolak" } },
          { status: 403 },
        );
      }
    }

    const sp = req.nextUrl.searchParams;
    const timeoutMinutes = sp.get("timeoutMinutes")
      ? parseInt(sp.get("timeoutMinutes")!)
      : 120;

    const result = await expirePendingReservations(timeoutMinutes);
    return NextResponse.json({ data: result });
  } catch (e) {
    return NextResponse.json(toErrorResponse(e), {
      status: (e as { statusCode?: number }).statusCode ?? 500,
    });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
