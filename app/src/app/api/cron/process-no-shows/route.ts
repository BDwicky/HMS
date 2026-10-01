import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { processAutomatedNoShows } from "@/features/scheduler/service";
import { toErrorResponse } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
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

    const result = await processAutomatedNoShows();
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
