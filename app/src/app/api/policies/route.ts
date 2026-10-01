import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions/guard";
import { PERM_ROOMS_VIEW, PERM_POLICIES_MANAGE } from "@/lib/permissions";
import {
  listCancellationPolicies,
  createCancellationPolicy,
  cancellationPolicySchema,
  listModificationPolicies,
  createModificationPolicy,
  modificationPolicySchema,
  listNoShowPolicies,
  createNoShowPolicy,
  noShowPolicySchema,
} from "@/features/pricing/service";
import { toErrorResponse } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    requirePermission(session, PERM_ROOMS_VIEW);
    const type = req.nextUrl.searchParams.get("type");

    if (type === "cancellation") {
      const data = await listCancellationPolicies();
      return NextResponse.json({ data });
    }
    if (type === "modification") {
      const data = await listModificationPolicies();
      return NextResponse.json({ data });
    }
    if (type === "no-show" || type === "noShow") {
      const data = await listNoShowPolicies();
      return NextResponse.json({ data });
    }

    const [cancellation, modification, noShow] = await Promise.all([
      listCancellationPolicies(),
      listModificationPolicies(),
      listNoShowPolicies(),
    ]);

    return NextResponse.json({
      data: {
        cancellation,
        modification,
        noShow,
      },
    });
  } catch (e) {
    return NextResponse.json(toErrorResponse(e), { status: (e as { statusCode?: number }).statusCode ?? 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    requirePermission(session, PERM_POLICIES_MANAGE);
    const body = await req.json();
    const type = body.type;

    if (type === "cancellation") {
      const parsed = cancellationPolicySchema.safeParse(body.data);
      if (!parsed.success) {
        return NextResponse.json(
          { error: { code: "VALIDATION_ERROR", message: "Input tidak valid", fields: parsed.error.flatten().fieldErrors } },
          { status: 422 },
        );
      }
      const data = await createCancellationPolicy(parsed.data);
      return NextResponse.json({ data }, { status: 201 });
    }

    if (type === "modification") {
      const parsed = modificationPolicySchema.safeParse(body.data);
      if (!parsed.success) {
        return NextResponse.json(
          { error: { code: "VALIDATION_ERROR", message: "Input tidak valid", fields: parsed.error.flatten().fieldErrors } },
          { status: 422 },
        );
      }
      const data = await createModificationPolicy(parsed.data);
      return NextResponse.json({ data }, { status: 201 });
    }

    if (type === "no-show" || type === "noShow") {
      const parsed = noShowPolicySchema.safeParse(body.data);
      if (!parsed.success) {
        return NextResponse.json(
          { error: { code: "VALIDATION_ERROR", message: "Input tidak valid", fields: parsed.error.flatten().fieldErrors } },
          { status: 422 },
        );
      }
      const data = await createNoShowPolicy(parsed.data);
      return NextResponse.json({ data }, { status: 201 });
    }

    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Tipe kebijakan harus 'cancellation', 'modification', atau 'no-show'" } },
      { status: 422 },
    );
  } catch (e) {
    return NextResponse.json(toErrorResponse(e), { status: (e as { statusCode?: number }).statusCode ?? 500 });
  }
}
