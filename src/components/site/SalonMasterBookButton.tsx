"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import { useBooking } from "@/components/BookingProvider";
import { ratingCountLabel } from "@/lib/locale";

export function SalonMasterBookButton({
  salonId,
  masterId,
  masterName,
  specialization,
  rating,
  ratingCount,
  avatarUrl,
}: {
  salonId: string;
  masterId: string;
  masterName: string;
  specialization: string | null;
  rating: number;
  ratingCount: number;
  avatarUrl?: string | null;
}) {
  const { openBooking } = useBooking();
  return (
    <article className="bg-surface border border-outline rounded-3xl p-5 shadow-sm hover:border-primary/40 transition-colors">
      <div className="flex items-center gap-4">
        <Link
          href={`/masters/${masterId}`}
          className="w-16 h-16 rounded-full bg-primary/10 overflow-hidden flex items-center justify-center text-primary font-serif text-2xl font-bold shrink-0"
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            masterName.slice(0, 1)
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={`/masters/${masterId}`} className="font-bold text-lg truncate hover:text-primary block">
            {masterName}
          </Link>
          <p className="text-sm text-onSurfaceVariant">{specialization || "Мастер"}</p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <Star className="w-4 h-4 text-primary fill-primary" />
            <span className="text-sm font-bold">{rating.toFixed(1)}</span>
            <span className="text-sm text-onSurfaceVariant">· {ratingCountLabel(ratingCount)}</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-5">
        <Link
          href={`/masters/${masterId}`}
          className="flex items-center justify-center bg-surface border border-outline rounded-2xl py-2.5 text-sm font-bold hover:border-primary hover:text-primary transition-colors"
        >
          Профиль
        </Link>
        <button
          type="button"
          onClick={() => openBooking(salonId, masterId)}
          className="bg-primary text-onPrimary rounded-2xl py-2.5 text-sm font-bold hover:bg-primaryVariant"
        >
          Записаться
        </button>
      </div>
    </article>
  );
}
