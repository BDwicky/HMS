import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions/guard";
import { PERM_GUESTS_VIEW, PERM_GUESTS_CREATE } from "@/lib/permissions";
import { listGuests, createGuest, guestCreateSchema, checkDuplicateGuest } from "@/features/guests/service";
import { toErrorResponse } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    requirePermission(session, PERM_GUESTS_VIEW);
    const sp = req.nextUrl.searchParams;

    const data = await listGuests({
      query: sp.get("query") || sp.get("q") || undefined,
      page: sp.get("page") ? Number(sp.get("page")) : 1,
      limit: sp.get("limit") ? Number(sp.get("limit")) : 20,
    });

    return NextResponse.json({ data: data.items, meta: data.pagination });
  } catch (e) {
    return NextResponse.json(toErrorResponse(e), { status: (e as { statusCode?: number }).statusCode ?? 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    requirePermission(session, PERM_GUESTS_CREATE);
    const body = await req.json();

    const parsed = guestCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Input tidak valid", fields: parsed.error.flatten().fieldErrors } },
        { status: 422 },
      );
    }

    // Check duplicate warning
    const duplicateCheck = await checkDuplicateGuest({
      email: parsed.data.email,
      phone: parsed.data.phone,
    });

    const guest = await createGuest(parsed.data);

    return NextResponse.json(
      {
        data: guest,
        meta: {
          duplicateWarning: duplicateCheck.hasDuplicate
            ? "Terdapat tamu lain dengan email atau nomor telepon yang sama"
            : null,
        },
      },
      { status: 201 },
    );
  } catch (e) {
    return NextResponse.json(toErrorResponse(e), { status: (e as { statusCode?: number }).statusCode ?? 500 });
  }
}
