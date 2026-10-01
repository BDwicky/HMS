import { describe, it, expect } from "vitest";
import { createMaintenanceSchema, updateMaintenanceSchema } from "../service";
import { MaintenancePriority, MaintenanceStatus } from "@prisma/client";

describe("Maintenance Request Validation", () => {
  it("validates valid maintenance request", () => {
    const valid = {
      roomId: "room-102",
      category: "PLUMBING",
      description: "Wastafel bocor di bawah kabinet",
      priority: MaintenancePriority.HIGH,
      takeOutOfService: true,
      photoUrls: ["https://example.com/photo1.jpg"],
    };
    const parsed = createMaintenanceSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it("rejects empty description or empty roomId", () => {
    expect(
      createMaintenanceSchema.safeParse({
        roomId: "",
        description: "Bocor",
      }).success,
    ).toBe(false);

    expect(
      createMaintenanceSchema.safeParse({
        roomId: "room-102",
        description: "",
      }).success,
    ).toBe(false);
  });

  it("validates maintenance update status", () => {
    expect(
      updateMaintenanceSchema.safeParse({
        status: MaintenanceStatus.IN_PROGRESS,
        notes: "Sedang menunggu suku cadang",
      }).success,
    ).toBe(true);

    expect(
      updateMaintenanceSchema.safeParse({
        status: MaintenanceStatus.RESOLVED,
      }).success,
    ).toBe(true);
  });

  it("rejects invalid status", () => {
    expect(
      updateMaintenanceSchema.safeParse({
        status: "UNKNOWN_STATUS",
      }).success,
    ).toBe(false);
  });
});
