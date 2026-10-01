import { describe, it, expect } from "vitest";
import { ExpireReservationsResult, ProcessNoShowsResult } from "../service";

describe("Scheduler & Automation Contracts", () => {
  it("structures expiration result correctly", () => {
    const mockResult: ExpireReservationsResult = {
      expiredCount: 2,
      expiredIds: ["res-exp-1", "res-exp-2"],
    };

    expect(mockResult.expiredCount).toBe(2);
    expect(mockResult.expiredIds).toContain("res-exp-1");
  });

  it("structures no-show processing result correctly", () => {
    const mockResult: ProcessNoShowsResult = {
      processedCount: 1,
      processedIds: ["res-ns-1"],
    };

    expect(mockResult.processedCount).toBe(1);
    expect(mockResult.processedIds[0]).toBe("res-ns-1");
  });
});
