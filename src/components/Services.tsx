"use client";

import { useBooking } from "@/components/BookingProvider";

const services = [
  {
    title: "Женская стрижка",
    description:
      "Стильная стрижка любой сложности. Включает мытье головы, уход и базовую укладку.",
    price: "от 2 000 ₽",
    duration: "1-1.5 ч",
  },
  {
    title: "Мужская стрижка",
    description:
      "Классическая или модельная стрижка. Мытье головы до и после, укладка премиальными средствами.",
    price: "от 1 500 ₽",
    duration: "1 ч",
  },
  {
    title: "Маникюр с покрытием",
    description:
      "Аппаратный или комбинированный маникюр с выравниванием ногтевой пластины и покрытием гель-лаком.",
    price: "от 1 800 ₽",
    duration: "1.5-2 ч",
  },
  {
    title: "Окрашивание волос",
    description:
      "Тон в тон, сложное окрашивание, балаяж или мелирование. Индивидуальный подбор красителя.",
    price: "от 4 000 ₽",
    duration: "2-4 ч",
  },
  {
    title: "Укладка / Прическа",
    description:
      "Повседневная или вечерняя укладка, локоны, плетение. Создание идеального образа.",
    price: "от 1 500 ₽",
    duration: "1 ч",
  },
  {
    title: "Оформление бороды",
    description:
      "Придание формы бороде, распаривание, бритье контуров опасной бритвой, уход маслами.",
    price: "от 1 000 ₽",
    duration: "45 мин",
  },
];

export function Services() {
  const { openBooking } = useBooking();

  return (
    <section id="services" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-serif font-bold text-onBackground mb-4">
            Популярные Услуги
          </h2>
          <p className="text-onSurfaceVariant max-w-2xl mx-auto">
            Ищите салон по нужной вам услуге. В нашей сети представлены
            все виды beauty-услуг — от стрижек и окрашивания до маникюра и ухода за лицом.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <div
              key={service.title}
              className="bg-card border border-outline rounded-2xl p-6 hover:border-primary/50 transition-colors group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-12 h-12 bg-primary/10 rounded-full blur-xl" />
              </div>

              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-onBackground">
                  {service.title}
                </h3>
                <span className="text-primary font-bold text-lg whitespace-nowrap ml-4">
                  {service.price}
                </span>
              </div>
              <p className="text-onSurfaceVariant text-sm mb-6 min-h-[60px]">
                {service.description}
              </p>
              <div className="flex items-center justify-between mt-auto">
                <span className="text-sm text-onSurfaceVariant bg-surfaceVariant px-3 py-1 rounded-full">
                  {service.duration}
                </span>
                <button
                  type="button"
                  className="text-primary hover:text-primaryVariant font-semibold text-sm transition-colors"
                  onClick={openBooking}
                >
                  Найти салон →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
