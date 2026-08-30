"use client";

import { Scissors } from "lucide-react";
import { useBooking } from "@/components/BookingProvider";

export function Navbar() {
  const { openBooking } = useBooking();

  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-outline">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center gap-2">
            <Scissors className="h-8 w-8 text-primary" />
            <span className="text-2xl font-serif font-bold text-onBackground tracking-wide">
              SALON<span className="text-primary">HUB</span>
            </span>
          </div>

          <div className="hidden md:block">
            <div className="flex items-center space-x-8">
              <a
                href="#services"
                className="text-onSurfaceVariant hover:text-primary transition-colors"
              >
                Популярные услуги
              </a>
              <a
                href="#barbershops"
                className="text-onSurfaceVariant hover:text-primary transition-colors"
              >
                Салоны
              </a>
              <a
                href="#contacts"
                className="text-onSurfaceVariant hover:text-primary transition-colors"
              >
                Контакты
              </a>
              <button
                type="button"
                className="bg-primary text-onPrimary px-6 py-2.5 rounded-xl font-semibold hover:bg-primaryVariant transition-colors shadow-[0_0_15px_rgba(212,175,55,0.3)] hover:shadow-[0_0_20px_rgba(212,175,55,0.5)]"
                onClick={openBooking}
              >
                Найти салон
              </button>
            </div>
          </div>

          <button
            type="button"
            className="md:hidden bg-primary text-onPrimary px-4 py-2 rounded-xl font-semibold text-sm"
            onClick={openBooking}
          >
            Найти салон
          </button>
        </div>
      </div>
    </nav>
  );
}
