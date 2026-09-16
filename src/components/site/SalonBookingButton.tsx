"use client";

import { useBooking } from "@/components/BookingProvider";
import { bookingCallToAction } from "@/lib/booking-access";

export function SalonBookingButton({ salonId, masterId }: { salonId: string; masterId?: string }) {
  const { openBooking, access } = useBooking();
  return (
    <button
      type="button"
      onClick={() => openBooking(salonId, masterId)}
      className="bg-primary text-onPrimary px-6 py-3 rounded-2xl font-bold hover:bg-primaryVariant shadow-[0_4px_15px_rgba(212,175,55,0.25)]"
    >
      {bookingCallToAction(access, "Записаться")}
    </button>
  );
}
