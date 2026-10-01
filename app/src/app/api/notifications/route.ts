import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listNotifications, sendNotification } from "@/features/notifications/service";
import { toErrorResponse } from "@/lib/errors";
import { NotificationType } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Autentikasi diperlukan" } },
        { status: 401 },
      );
    }

    const sp = req.nextUrl.searchParams;
    const recipient = sp.get("recipient") || undefined;
    const type = (sp.get("type") as NotificationType) || undefined;
    const limit = sp.get("limit") ? parseInt(sp.get("limit")!) : 50;

    const data = await listNotifications({ recipient, type, limit });
    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json(toErrorResponse(e), {
      status: (e as { statusCode?: number }).statusCode ?? 500,
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Autentikasi diperlukan" } },
        { status: 401 },
      );
    }

    const body = await req.json();
    const notification = await sendNotification(body);
    return NextResponse.json({ data: notification }, { status: 201 });
  } catch (e) {
    return NextResponse.json(toErrorResponse(e), {
      status: (e as { statusCode?: number }).statusCode ?? 500,
    });
  }
}
