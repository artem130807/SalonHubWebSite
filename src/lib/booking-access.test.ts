import { describe, expect, it } from "vitest";
import { bookingAccessFor, bookingCallToAction } from "@/lib/booking-access";

describe("bookingAccessFor", () => {
  it("lets only clients start a booking", () => {
    expect(bookingAccessFor(null)).toEqual({ status: "guest" });
    expect(bookingAccessFor(undefined)).toEqual({ status: "guest" });
    expect(bookingAccessFor("Client")).toEqual({ status: "ready" });
    expect(bookingAccessFor("Master")).toEqual({ status: "wrong-role" });
    expect(bookingAccessFor("SalonAdmin")).toEqual({ status: "wrong-role" });
  });
});

describe("bookingCallToAction", () => {
  it("warns guests before they enter the booking wizard", () => {
    expect(bookingCallToAction({ status: "guest" }, "Записаться")).toBe("Войти, чтобы записаться");
    expect(bookingCallToAction({ status: "wrong-role" }, "Записаться")).toBe("Нужен аккаунт клиента");
    expect(bookingCallToAction({ status: "ready" }, "Записаться на 15 сентября")).toBe("Записаться на 15 сентября");
  });
});
