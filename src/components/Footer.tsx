"use client";

import {
  Scissors,
  Camera,
  MessageCircle,
  MapPin,
  Phone,
  Clock,
} from "lucide-react";
import { useBooking } from "@/components/BookingProvider";

export function Footer() {
  const { openBooking } = useBooking();
  const year = new Date().getFullYear();

  return (
    <footer id="contacts" className="bg-background pt-20 pb-10 border-t border-outline">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-6">
              <Scissors className="h-8 w-8 text-primary" />
              <span className="text-2xl font-serif font-bold text-onBackground tracking-wide">
                BARBER<span className="text-primary">HUB</span>
              </span>
            </div>
            <p className="text-onSurfaceVariant mb-6">
              Платформа для поиска и онлайн-записи в лучшие мужские салоны вашего города.
            </p>
            <div className="flex gap-4">
              <a
                href="#"
                className="w-10 h-10 bg-surfaceVariant rounded-full flex items-center justify-center text-onSurface hover:bg-primary hover:text-onPrimary transition-colors"
                aria-label="Instagram"
              >
                <Camera className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 bg-surfaceVariant rounded-full flex items-center justify-center text-onSurface hover:bg-primary hover:text-onPrimary transition-colors"
                aria-label="Messenger"
              >
                <MessageCircle className="w-5 h-5" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-onBackground mb-6">
              Контакты
            </h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-onSurfaceVariant">
                <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span>г. Москва, ул. Пушкина, дом Колотушкина, 10</span>
              </li>
              <li className="flex items-center gap-3 text-onSurfaceVariant">
                <Phone className="w-5 h-5 text-primary shrink-0" />
                <span>+7 (999) 123-45-67</span>
              </li>
              <li className="flex items-start gap-3 text-onSurfaceVariant">
                <Clock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span>
                  Ежедневно
                  <br />
                  10:00 - 22:00
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-bold text-onBackground mb-6">
              Навигация
            </h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="#services"
                  className="text-onSurfaceVariant hover:text-primary transition-colors"
                >
                  О сервисе
                </a>
              </li>
              <li>
                <a
                  href="#barbershops"
                  className="text-onSurfaceVariant hover:text-primary transition-colors"
                >
                  Салоны
                </a>
              </li>
              <li>
                <a
                  href="#contacts"
                  className="text-onSurfaceVariant hover:text-primary transition-colors"
                >
                  Контакты
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-bold text-onBackground mb-6">Запись</h3>
            <p className="text-onSurfaceVariant mb-4">
              Запишитесь онлайн в любое удобное время.
            </p>
            <button
              type="button"
              className="w-full bg-primary text-onPrimary px-6 py-3 rounded-xl font-bold hover:bg-primaryVariant transition-colors"
              onClick={openBooking}
            >
              Онлайн запись
            </button>
          </div>
        </div>

        <div className="pt-8 border-t border-outline flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-onSurfaceVariant text-sm">
            © {year} SalonHub Network. Все права защищены.
          </p>
          <div className="flex gap-6 text-sm">
            <a
              href="#"
              className="text-onSurfaceVariant hover:text-primary transition-colors"
            >
              Политика конфиденциальности
            </a>
            <a
              href="#"
              className="text-onSurfaceVariant hover:text-primary transition-colors"
            >
              Договор оферты
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
