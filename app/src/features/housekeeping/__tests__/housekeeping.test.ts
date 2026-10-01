import { describe, it, expect } from "vitest";
import { createTaskSchema, updateTaskStatusSchema } from "../service";

describe("Housekeeping Task Validation", () => {
  it("validates valid task creation schema", () => {
    const valid = {
      roomId: "room-101",
      assignedToId: "staff-1",
      notes: "Daily room turnover cleaning",
    };
    const parsed = createTaskSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it("rejects task creation without roomId", () => {
    const invalid = {
      roomId: "",
      notes: "Clean room",
    };
    const parsed = createTaskSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it("validates task status update actions", () => {
    expect(updateTaskStatusSchema.safeParse({ action: "START" }).success).toBe(true);
    expect(updateTaskStatusSchema.safeParse({ action: "COMPLETE" }).success).toBe(true);
    expect(updateTaskStatusSchema.safeParse({ action: "INSPECT_PASS", notes: "Lulus inspeksi" }).success).toBe(true);
    expect(updateTaskStatusSchema.safeParse({ action: "INSPECT_FAIL", notes: "Kamar mandi masih basah" }).success).toBe(true);
    expect(updateTaskStatusSchema.safeParse({ action: "ASSIGN", assignedToId: "staff-2" }).success).toBe(true);
  });

  it("rejects invalid task status actions", () => {
    expect(updateTaskStatusSchema.safeParse({ action: "INVALID_ACTION" }).success).toBe(false);
  });
});
