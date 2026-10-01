import { describe, it, expect } from "vitest";
import { guestCreateSchema, guestDocumentCreateSchema } from "../service";
import { DocumentType } from "@prisma/client";

describe("Guest Management Validation", () => {
  it("validates valid guest input", () => {
    const valid = {
      firstName: "Budi",
      lastName: "Santoso",
      email: "budi.santoso@example.com",
      phone: "+6281234567890",
      nationality: "Indonesia",
      notes: "VIP guest, prefers high floor",
    };
    const parsed = guestCreateSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it("rejects guest with empty first name", () => {
    const invalid = {
      firstName: "",
      email: "test@example.com",
    };
    expect(guestCreateSchema.safeParse(invalid).success).toBe(false);
  });

  it("validates identity document input", () => {
    const valid = {
      documentType: DocumentType.KTP,
      documentNumber: "3171012345670001",
      isVerified: true,
    };
    const parsed = guestDocumentCreateSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it("rejects document number shorter than 3 characters", () => {
    const invalid = {
      documentType: DocumentType.PASSPORT,
      documentNumber: "12",
    };
    expect(guestDocumentCreateSchema.safeParse(invalid).success).toBe(false);
  });
});
