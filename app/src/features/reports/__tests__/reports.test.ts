import { describe, it, expect } from "vitest";
import { getDateArray } from "../service";

describe("Reporting Metrics & Utilities", () => {
  it("generates correct inclusive date array", () => {
    const dates = getDateArray("2026-10-01", "2026-10-04");
    expect(dates).toEqual([
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
    ]);
  });

  it("handles single-day date range", () => {
    const dates = getDateArray("2026-10-10", "2026-10-10");
    expect(dates).toEqual(["2026-10-10"]);
  });

  it("calculates Occupancy Rate correctly", () => {
    const totalRooms = 50;
    const occupiedRooms = 35;
    const occupancyRate = Number(((occupiedRooms / totalRooms) * 100).toFixed(2));
    expect(occupancyRate).toBe(70.0);
  });

  it("calculates ADR (Average Daily Rate) correctly", () => {
    const totalRoomRevenue = 35000000;
    const roomsSold = 35;
    const adr = Math.round(totalRoomRevenue / roomsSold);
    expect(adr).toBe(1000000);
  });

  it("calculates RevPAR (Revenue Per Available Room) correctly", () => {
    const totalRoomRevenue = 35000000;
    const totalRooms = 50;
    const days = 1;
    const revPar = Math.round(totalRoomRevenue / (totalRooms * days));
    expect(revPar).toBe(700000);
  });

  it("calculates Net Revenue after refunds correctly", () => {
    const paymentsCollected = 50000000;
    const refundsIssued = 5000000;
    const netRevenue = paymentsCollected - refundsIssued;
    expect(netRevenue).toBe(45000000);
  });

  it("calculates Cancellation and No-Show rates correctly", () => {
    const totalReservations = 100;
    const cancelled = 8;
    const noShow = 2;

    const cancellationRate = Number(((cancelled / totalReservations) * 100).toFixed(2));
    const noShowRate = Number(((noShow / totalReservations) * 100).toFixed(2));

    expect(cancellationRate).toBe(8.0);
    expect(noShowRate).toBe(2.0);
  });
});
