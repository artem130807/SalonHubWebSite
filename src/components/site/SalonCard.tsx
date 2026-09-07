"use client";

import Link from "next/link";
import { MapPin, Star } from "lucide-react";
import { useBooking } from "@/components/BookingProvider";

const fallbackImage =
  "https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&q=80&w=800&h=500";

export type SalonCardModel = {
  id: string;
  name: string;
  address: string;
  description?: string | null;
  rating: number;
  ratingCount: number;
  photoUrl?: string | null;
  minPrice?: number | null;
  availableStartsToday: number;
};

export function SalonCard({ salon }: { salon: SalonCardModel }) {
  const { openBooking } = useBooking();
  const image = salon.photoUrl || fallbackImage;

  return (
    <article className="group bg-surface/40 hover:bg-surface/80 rounded-[2rem] overflow-hidden border border-outline/50 hover:border-primary/40 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.4)] flex flex-col">
      <Link href={`/salons/${salon.id}`} className="block relative aspect-[16/10] overflow-hidden m-2 rounded-[1.5rem]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt={salon.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end gap-3">
          <h3 className="text-xl font-bold text-onBackground leading-tight drop-shadow-md">{salon.name}</h3>
          <div className="flex items-center gap-1.5 bg-surface/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 shadow-sm">
            <Star className="w-4 h-4 text-primary fill-primary" />
            <span className="text-sm font-bold">{salon.rating.toFixed(1)}</span>
            <span className="text-xs text-onSurfaceVariant font-medium">({salon.ratingCount})</span>
          </div>
        </div>
      </Link>
      <div className="p-5 pt-3 flex flex-col gap-4 flex-1">
        <div className="flex flex-col gap-2">
          <p className="flex items-start gap-2.5 text-sm text-onSurfaceVariant">
            <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <span className="line-clamp-2 leading-relaxed">{salon.address}</span>
          </p>
          {salon.minPrice != null && (
            <p className="text-sm font-medium text-onBackground mt-1">от <span className="text-lg font-bold">{salon.minPrice} ₽</span></p>
          )}
        </div>
        <p className={`text-xs font-medium px-3.5 py-2 rounded-xl inline-flex w-fit ${salon.availableStartsToday > 0 ? "bg-green-500/10 text-green-500 border border-green-500/20" : "bg-surfaceVariant text-onSurfaceVariant border border-outline/50"}`}>
          {salon.availableStartsToday > 0
            ? `Свободных стартов сегодня: ${salon.availableStartsToday}`
            : "Нет свободных слотов на сегодня"}
        </p>
        <div className="mt-auto grid grid-cols-2 gap-3 pt-3">
          <Link
            href={`/salons/${salon.id}`}
            className="flex items-center justify-center bg-surface border border-outline rounded-2xl py-3 text-sm font-bold hover:border-primary hover:text-primary transition-colors shadow-sm"
          >
            Подробнее
          </Link>
          <button
            type="button"
            className="bg-primary text-onPrimary rounded-2xl py-3 text-sm font-bold hover:bg-primaryVariant transition-colors shadow-[0_4px_15px_rgba(212,175,55,0.2)] hover:shadow-[0_6px_20px_rgba(212,175,55,0.4)]"
            onClick={() => openBooking(salon.id)}
          >
            Записаться
          </button>
        </div>
      </div>
    </article>
  );
}
