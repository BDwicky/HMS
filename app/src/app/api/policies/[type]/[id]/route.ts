import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions/guard";
import { PERM_POLICIES_MANAGE } from "@/lib/permissions";
import {
  updateCancellationPolicy,
  cancellationPolicySchema,
  updateModificationPolicy,
  modificationPolicySchema,
  updateNoShowPolicy,
  noShowPolicySchema,
} from "@/features/pricing/service";
import { toErrorResponse } from "@/lib/errors";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> },
) {
  try {
    const session = await auth();
    requirePermission(session, PERM_POLICIES_MANAGE);
    const { type, id } = await params;
    const body = await req.json();

    if (type === "cancellation") {
      const parsed = cancellationPolicySchema.partial().safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: { code: "VALIDATION_ERROR", message: "Input tidak valid", fields: parsed.error.flatten().fieldErrors } },
          { status: 422 },
        );
      }
      const data = await updateCancellationPolicy(id, parsed.data);
      return NextResponse.json({ data });
    }

    if (type === "modification") {
      const parsed = modificationPolicySchema.partial().safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: { code: "VALIDATION_ERROR", message: "Input tidak valid", fields: parsed.error.flatten().fieldErrors } },
          { status: 422 },
        );
      }
      const data = await updateModificationPolicy(id, parsed.data);
      return NextResponse.json({ data });
    }

    if (type === "no-show" || type === "noShow") {
      const parsed = noShowPolicySchema.partial().safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: { code: "VALIDATION_ERROR", message: "Input tidak valid", fields: parsed.error.flatten().fieldErrors } },
          { status: 422 },
        );
      }
      const data = await updateNoShowPolicy(id, parsed.data);
      return NextResponse.json({ data });
    }

    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Tipe kebijakan harus 'cancellation', 'modification', atau 'no-show'" } },
      { status: 422 },
    );
  } catch (e) {
    return NextResponse.json(toErrorResponse(e), { status: (e as { statusCode?: number }).statusCode ?? 500 });
  }
}
