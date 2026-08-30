"use client";

import { CalendarCheck, Clock, MapPin } from "lucide-react";
import { useBooking } from "@/components/BookingProvider";

export function Hero() {
  const { openBooking } = useBooking();

  return (
    <div className="relative overflow-hidden bg-surface py-20 lg:py-32">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-serif font-bold text-onBackground mb-6 leading-tight">
            Лучшие салоны. <br />
            <span className="text-primary italic">В одном приложении.</span>
          </h1>

          <p className="text-xl text-onSurfaceVariant mb-10 leading-relaxed">
            Единая платформа для поиска и онлайн-записи в салоны красоты, парикмахерские и барбершопы вашего города.
            Выбирайте салон по рейтингу, отзывам и локации.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <button
              type="button"
              className="w-full sm:w-auto bg-primary text-onPrimary px-8 py-4 rounded-xl font-bold text-lg hover:bg-primaryVariant transition-colors shadow-[0_0_20px_rgba(212,175,55,0.4)]"
              onClick={openBooking}
            >
              Найти салон
            </button>
            <a
              href="#services"
              className="w-full sm:w-auto border border-outline text-onSurface bg-surfaceVariant/30 px-8 py-4 rounded-xl font-semibold text-lg hover:border-primary hover:text-primary transition-colors text-center"
            >
              Популярные услуги
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="bg-card border border-outline p-6 rounded-2xl flex items-start gap-4">
              <div className="bg-surfaceVariant p-3 rounded-lg">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-onBackground mb-1">
                  Рядом с вами
                </h3>
                <p className="text-sm text-onSurfaceVariant">
                  Сотни салонов в разных районах города
                </p>
              </div>
            </div>

            <div className="bg-card border border-outline p-6 rounded-2xl flex items-start gap-4">
              <div className="bg-surfaceVariant p-3 rounded-lg">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-onBackground mb-1">
                  Запись 24/7
                </h3>
                <p className="text-sm text-onSurfaceVariant">
                  Бронируйте время онлайн в любую минуту
                </p>
              </div>
            </div>

            <div className="bg-card border border-outline p-6 rounded-2xl flex items-start gap-4">
              <div className="bg-surfaceVariant p-3 rounded-lg">
                <CalendarCheck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-onBackground mb-1">
                  Мгновенно
                </h3>
                <p className="text-sm text-onSurfaceVariant">
                  Автоматическое подтверждение вашей записи
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
