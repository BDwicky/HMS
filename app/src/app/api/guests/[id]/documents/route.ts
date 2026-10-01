import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions/guard";
import { PERM_GUESTS_UPDATE } from "@/lib/permissions";
import { addGuestDocument, guestDocumentCreateSchema } from "@/features/guests/service";
import { toErrorResponse } from "@/lib/errors";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    requirePermission(session, PERM_GUESTS_UPDATE);
    const { id } = await params;
    const body = await req.json();

    const parsed = guestDocumentCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Input tidak valid", fields: parsed.error.flatten().fieldErrors } },
        { status: 422 },
      );
    }

    const doc = await addGuestDocument(id, parsed.data);
    return NextResponse.json({ data: doc }, { status: 201 });
  } catch (e) {
    return NextResponse.json(toErrorResponse(e), { status: (e as { statusCode?: number }).statusCode ?? 500 });
  }
}
