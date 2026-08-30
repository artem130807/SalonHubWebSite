"use client";

import Image from "next/image";
import { Star, MapPin } from "lucide-react";
import { useBooking } from "@/components/BookingProvider";

const salons = [
  {
    name: "Студия красоты L'Oreal",
    type: "Салон красоты",
    address: "ул. Ленина, 10",
    image:
      "https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&q=80&w=500&h=500",
    rating: 4.9,
    reviews: 128,
  },
  {
    name: "Парикмахерская Локон",
    type: "Парикмахерская",
    address: "пр. Мира, 100",
    image:
      "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=500&h=500",
    rating: 4.8,
    reviews: 95,
  },
  {
    name: "OldBoy Barbershop",
    type: "Барбершоп",
    address: "ул. Пушкина, 15",
    image:
      "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=500&h=500",
    rating: 5.0,
    reviews: 210,
  },
];

export function Barbershops() {
  const { openBooking } = useBooking();

  return (
    <section id="barbershops" className="py-24 bg-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
          <div className="max-w-2xl">
            <h2 className="text-4xl font-serif font-bold text-onBackground mb-4">
              Топовые Салоны
            </h2>
            <p className="text-onSurfaceVariant">
              Выбирайте из лучших салонов города. Мы тщательно проверяем
              каждое заведение, чтобы гарантировать вам высокое качество услуг.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {salons.map((shop) => (
            <div
              key={shop.name}
              className="group bg-card rounded-2xl overflow-hidden border border-outline hover:border-primary/50 transition-colors"
            >
              <div className="aspect-[4/3] overflow-hidden relative">
                <Image
                  src={shop.image}
                  alt={shop.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105 filter grayscale group-hover:grayscale-0"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                  <div>
                    <h3 className="text-2xl font-bold text-onBackground mb-1">
                      {shop.name}
                    </h3>
                    <p className="text-xs text-primary font-medium mb-1 uppercase tracking-wider">{shop.type}</p>
                    <div className="flex items-center gap-1 text-onSurfaceVariant">
                      <MapPin className="w-4 h-4 text-primary" />
                      <span className="text-sm">{shop.address}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1 bg-surfaceVariant/80 backdrop-blur-sm px-2 py-1 rounded-md">
                      <Star className="w-4 h-4 text-primary fill-primary" />
                      <span className="text-sm font-bold text-onBackground">
                        {shop.rating}
                      </span>
                    </div>
                    <span className="text-xs text-onSurfaceVariant">
                      {shop.reviews} отзывов
                    </span>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <button
                  type="button"
                  className="w-full bg-surfaceVariant text-onBackground border border-outline hover:border-primary hover:text-primary py-3 rounded-xl font-semibold transition-colors"
                  onClick={openBooking}
                >
                  Выбрать салон
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
