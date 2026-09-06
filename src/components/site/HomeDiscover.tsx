"use client";

import Link from "next/link";
import { Baby, Scissors, Sparkles, Star, UserRound, Search } from "lucide-react";
import { SERVICE_CATEGORIES, salonsHref } from "@/lib/catalog";
import { SalonCard, type SalonCardModel } from "@/components/site/SalonCard";

const categoryIcons = {
  scissors: Scissors,
  shave: UserRound,
  beard: UserRound,
  massage: Sparkles,
  kids: Baby,
  premium: Star,
} as const;

type MasterCard = {
  id: string;
  salonId: string;
  userName: string;
  specialization: string | null;
  rating: number;
  ratingCount: number;
  avatarUrl: string | null;
};

export function HomeDiscover({
  greeting,
  subtitle,
  salons,
  masters,
  city,
}: {
  greeting: string;
  subtitle: string;
  salons: SalonCardModel[];
  masters: MasterCard[];
  city?: string | null;
}) {
  return (
    <main>
      <section className="relative pt-16 pb-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-background to-background pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-2xl sm:text-3xl font-serif font-bold">{greeting}</p>
          <p className="text-onSurfaceVariant mt-1 mb-8">{subtitle}</p>
          <h1 className="text-5xl sm:text-7xl font-serif font-bold leading-tight mb-8">
            Лучшие салоны. <br className="hidden sm:block" /><span className="text-primary italic">В одном месте.</span>
          </h1>
          <form action="/salons" className="max-w-2xl mt-8">
            <label className="flex items-center gap-3 bg-surface/80 backdrop-blur-md border border-outline hover:border-primary/50 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/50 rounded-2xl p-2 transition-all shadow-lg">
              <Search className="w-6 h-6 text-onSurfaceVariant ml-3" />
              <input
                name="q"
                placeholder="Название, улица или город..."
                className="flex-1 bg-transparent outline-none text-lg py-2 placeholder:text-onSurfaceVariant"
              />
              <button type="submit" className="bg-primary text-onPrimary px-8 py-3.5 rounded-xl font-bold hover:bg-primaryVariant transition-colors">
                Найти
              </button>
            </label>
          </form>
        </div>
      </section>

      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-serif font-bold mb-6">Категории услуг</h2>
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x hide-scrollbar">
            {SERVICE_CATEGORIES.map((category) => {
              const Icon = categoryIcons[category.icon];
              return (
                <Link
                  key={category.id}
                  href={salonsHref({ category: category.query })}
                  className="group shrink-0 w-24 flex flex-col items-center gap-3 text-center snap-start"
                >
                  <span className="w-16 h-16 rounded-2xl bg-surface border border-outline flex items-center justify-center text-onSurfaceVariant group-hover:text-primary group-hover:border-primary group-hover:bg-primary/5 transition-all duration-300 shadow-sm group-hover:shadow-md">
                    <Icon className="w-7 h-7" />
                  </span>
                  <span className="text-sm font-medium text-onSurface group-hover:text-primary transition-colors">{category.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section id="barbershops" className="pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-8 gap-4">
            <div>
              <h2 className="text-3xl sm:text-4xl font-serif font-bold">
                {city ? `Салоны в городе ${city}` : "Салоны в вашем городе"}
              </h2>
              <p className="text-onSurfaceVariant mt-2">Выберите салон, мастера и удобное время</p>
            </div>
            <Link href="/salons" className="text-primary font-semibold shrink-0 hover:underline">
              Ещё
            </Link>
          </div>
          {salons.length === 0 ? (
            <p className="text-onSurfaceVariant">Салоны появятся после наполнения каталога.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {salons.map((salon) => (
                <SalonCard key={salon.id} salon={salon} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-serif font-bold mb-8">Лучшие мастера</h2>
          {masters.length === 0 ? (
            <p className="text-onSurfaceVariant">Мастера появятся после добавления в салоны.</p>
          ) : (
            <div className="flex gap-6 overflow-x-auto pb-4 snap-x hide-scrollbar">
              {masters.map((master) => (
                <Link
                  key={master.id}
                  href={`/salons/${master.salonId}`}
                  className="group shrink-0 w-64 bg-surface border border-outline rounded-3xl p-6 hover:border-primary/50 transition-all duration-300 hover:shadow-lg flex flex-col items-center text-center snap-start"
                >
                  <div className="w-24 h-24 rounded-full bg-primary/10 mb-4 overflow-hidden border-2 border-transparent group-hover:border-primary/30 transition-colors">
                    {master.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={master.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-primary font-serif text-3xl font-bold">
                        {master.userName.slice(0, 1)}
                      </div>
                    )}
                  </div>
                  <p className="font-bold text-lg text-onBackground leading-tight">{master.userName}</p>
                  <p className="text-sm text-onSurfaceVariant mt-1.5">{master.specialization || "Мастер"}</p>
                  <div className="flex items-center gap-1.5 mt-4 bg-background px-3 py-1.5 rounded-full border border-outline">
                    <Star className="w-4 h-4 text-primary fill-primary" />
                    <span className="text-sm font-bold">{master.rating.toFixed(1)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
