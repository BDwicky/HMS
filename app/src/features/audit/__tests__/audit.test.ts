import { describe, it, expect } from "vitest";
import { RecordAuditLogInput } from "../service";

describe("Audit Logging Contract", () => {
  it("structures valid audit log payload", () => {
    const input: RecordAuditLogInput = {
      userId: "usr-admin-1",
      action: "reservation.cancel",
      resourceType: "Reservation",
      resourceId: "res-123",
      previousData: { status: "CONFIRMED" },
      newData: { status: "CANCELLED" },
      ipAddress: "127.0.0.1",
      userAgent: "Vitest/Test-Agent",
    };

    expect(input.action).toBe("reservation.cancel");
    expect(input.resourceType).toBe("Reservation");
    expect(input.resourceId).toBe("res-123");
    expect(input.previousData).toEqual({ status: "CONFIRMED" });
  });

  it("handles optional user and IP for system automated actions", () => {
    const systemAction: RecordAuditLogInput = {
      action: "system.no_show_auto_processed",
      resourceType: "Reservation",
      resourceId: "res-999",
      newData: { status: "NO_SHOW" },
    };

    expect(systemAction.userId).toBeUndefined();
    expect(systemAction.ipAddress).toBeUndefined();
    expect(systemAction.action).toBe("system.no_show_auto_processed");
  });
});
