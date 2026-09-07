"use client";

import { Star } from "lucide-react";
import { useBooking } from "@/components/BookingProvider";

export function SalonMasterBookButton({
  salonId,
  masterId,
  masterName,
  specialization,
  rating,
}: {
  salonId: string;
  masterId: string;
  masterName: string;
  specialization: string | null;
  rating: number;
}) {
  const { openBooking } = useBooking();
  return (
    <div className="bg-surface border border-outline rounded-3xl p-5 flex items-center gap-4 hover:border-primary/50 transition-colors shadow-sm">
      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-serif text-xl font-bold shrink-0">
        {masterName.slice(0, 1)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-lg truncate">{masterName}</p>
        <p className="text-sm text-onSurfaceVariant">{specialization || "Мастер"}</p>
        <div className="flex items-center gap-1 mt-1">
          <Star className="w-3.5 h-3.5 text-primary fill-primary" />
          <span className="text-sm font-bold">{rating.toFixed(1)}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => openBooking(salonId, masterId)}
        className="shrink-0 bg-primary text-onPrimary px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primaryVariant"
      >
        Записаться
      </button>
    </div>
  );
}
