"use client";

import { useBooking } from "@/components/BookingProvider";

export function SalonBookingButton({ salonId }: { salonId: string }) {
  const { openBooking } = useBooking();
  return (
    <button
      type="button"
      onClick={() => openBooking(salonId)}
      className="bg-primary text-onPrimary px-6 py-3 rounded-xl font-semibold hover:bg-primaryVariant"
    >
      Записаться
    </button>
  );
}
