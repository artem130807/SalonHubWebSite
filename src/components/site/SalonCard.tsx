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
    <article className="group bg-card rounded-3xl overflow-hidden border border-outline hover:border-primary/50 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.5)] flex flex-col">
      <Link href={`/salons/${salon.id}`} className="block relative aspect-[16/10] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt={salon.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end gap-3">
          <h3 className="text-xl font-bold text-onBackground leading-tight">{salon.name}</h3>
          <div className="flex items-center gap-1 bg-surface/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10">
            <Star className="w-4 h-4 text-primary fill-primary" />
            <span className="text-sm font-bold">{salon.rating.toFixed(1)}</span>
            <span className="text-xs text-onSurfaceVariant">({salon.ratingCount})</span>
          </div>
        </div>
      </Link>
      <div className="p-5 flex flex-col gap-4 flex-1">
        <div className="flex flex-col gap-1.5">
          <p className="flex items-center gap-2 text-sm text-onSurfaceVariant">
            <MapPin className="w-4 h-4 text-primary shrink-0" />
            <span className="truncate">{salon.address}</span>
          </p>
          {salon.minPrice != null && (
            <p className="text-sm font-medium text-onBackground">от {salon.minPrice} ₽</p>
          )}
        </div>
        <p className={`text-xs font-medium px-3 py-1.5 rounded-lg inline-flex w-fit ${salon.availableStartsToday > 0 ? "bg-green-500/10 text-green-500" : "bg-surfaceVariant text-onSurfaceVariant"}`}>
          {salon.availableStartsToday > 0
            ? `Свободных стартов сегодня: ${salon.availableStartsToday}`
            : "Нет свободных слотов на сегодня"}
        </p>
        <div className="mt-auto grid grid-cols-2 gap-3 pt-2">
          <Link
            href={`/salons/${salon.id}`}
            className="flex items-center justify-center border border-outline rounded-xl py-2.5 text-sm font-semibold hover:border-primary hover:text-primary transition-colors"
          >
            Подробнее
          </Link>
          <button
            type="button"
            className="bg-primary text-onPrimary rounded-xl py-2.5 text-sm font-bold hover:bg-primaryVariant transition-colors shadow-[0_0_15px_rgba(212,175,55,0.3)] hover:shadow-[0_0_20px_rgba(212,175,55,0.5)]"
            onClick={() => openBooking(salon.id)}
          >
            Записаться
          </button>
        </div>
      </div>
    </article>
  );
}
