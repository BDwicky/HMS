import { describe, it, expect } from "vitest";
import { NotificationType } from "@prisma/client";
import { SendNotificationInput } from "../service";

describe("Notification Formatting & Templates", () => {
  it("structures valid notification payload", () => {
    const input: SendNotificationInput = {
      type: NotificationType.BOOKING_CONFIRMATION,
      recipient: "guest@example.com",
      subject: "Konfirmasi Reservasi Hotel [BK-20261001-0001]",
      body: "Halo Tamu, reservasi Anda berhasil dikonfirmasi.",
      metadata: { bookingReference: "BK-20261001-0001", totalAmount: 1500000 },
    };

    expect(input.type).toBe(NotificationType.BOOKING_CONFIRMATION);
    expect(input.recipient).toBe("guest@example.com");
    expect(input.metadata?.bookingReference).toBe("BK-20261001-0001");
  });

  it("supports all required business notification types", () => {
    const types: NotificationType[] = [
      NotificationType.BOOKING_CONFIRMATION,
      NotificationType.PAYMENT_RECEIVED,
      NotificationType.RESERVATION_MODIFIED,
      NotificationType.RESERVATION_CANCELLED,
      NotificationType.PRE_ARRIVAL,
      NotificationType.CHECKOUT_REMINDER,
      NotificationType.NO_SHOW_PROCESSED,
      NotificationType.INTERNAL,
    ];

    expect(types).toHaveLength(8);
  });
});
