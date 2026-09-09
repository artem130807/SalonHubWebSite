import Link from "next/link";
import { Clock, MapPin, Percent, Phone, Star } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { SalonBookingButton } from "@/components/site/SalonBookingButton";
import { PhotoCarousel } from "@/components/site/PhotoCarousel";
import { SalonMasterBookButton } from "@/components/site/SalonMasterBookButton";
import { bestDiscountForService, discountedPrice } from "@/server/domain/promotion-rules";
import type { MasterProfile, Review, Salon, SalonPhoto, SalonPromotion, Service } from "@/server/domain/types";

function dateLabel(value: Date | string | null) {
  if (!value) return null;
  return String(value).slice(0, 10);
}

export function SalonHome({
  salon,
  photos,
  promotions,
  masters,
  services,
  reviews,
}: {
  salon: Salon;
  photos: SalonPhoto[];
  promotions: SalonPromotion[];
  masters: MasterProfile[];
  services: Service[];
  reviews: Review[];
}) {
  const offers = promotions.map((item) => ({ discountPercent: item.discountPercent, serviceId: item.serviceId }));

  return (
    <SiteShell>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        <section className="space-y-5">
          <Link href="/salons" className="inline-flex items-center gap-2 text-sm font-medium text-onSurfaceVariant hover:text-primary transition-colors">
            ← Все салоны
          </Link>
          <PhotoCarousel
            photos={photos}
            alt={salon.name}
            className="h-72 sm:h-[28rem]"
            emptyLabel="Фото салона скоро появятся"
            showThumbs
          />
          <div className="bg-surface/50 p-6 sm:p-10 rounded-3xl border border-outline/50 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
              <div>
                <h1 className="text-4xl sm:text-5xl font-serif font-bold leading-tight">{salon.name}</h1>
                <div className="flex flex-col gap-2 mt-4">
                  <p className="flex items-center gap-2.5 text-onSurface">
                    <MapPin className="w-5 h-5 text-primary shrink-0" />
                    {salon.city}, {salon.street}, {salon.building}
                  </p>
                  {salon.phone && (
                    <p className="flex items-center gap-2.5 text-onSurface">
                      <Phone className="w-5 h-5 text-primary shrink-0" />
                      {salon.phone}
                    </p>
                  )}
                  {(salon.openingTime || salon.closingTime) && (
                    <p className="flex items-center gap-2.5 text-onSurface">
                      <Clock className="w-5 h-5 text-primary shrink-0" />
                      {salon.openingTime ?? "—"}–{salon.closingTime ?? "—"}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 shrink-0">
                <div className="flex items-center gap-2 bg-background px-4 py-2.5 rounded-2xl border border-outline shadow-sm">
                  <Star className="w-5 h-5 text-primary fill-primary" />
                  <span className="font-bold text-lg">{salon.rating.toFixed(1)}</span>
                  <span className="text-sm text-onSurfaceVariant">({salon.ratingCount} оценок)</span>
                </div>
                <SalonBookingButton salonId={salon.id} />
              </div>
            </div>
          </div>
        </section>

        {salon.description && (
          <section className="bg-surface/30 p-6 rounded-3xl border border-outline/30">
            <h2 className="text-2xl font-serif font-bold mb-3">О салоне</h2>
            <p className="text-onSurface leading-relaxed text-lg">{salon.description}</p>
          </section>
        )}

        <section>
          <h2 className="text-3xl font-serif font-bold mb-6">Акции и скидки</h2>
          {promotions.length === 0 ? (
            <p className="text-onSurfaceVariant bg-surface/30 p-6 rounded-2xl text-center">Сейчас акций нет</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {promotions.map((promo) => (
                <article key={promo.id} className="bg-surface border border-primary/30 rounded-3xl p-5 shadow-sm overflow-hidden">
                  {promo.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={promo.imageUrl} alt="" className="w-full h-36 object-cover rounded-2xl mb-4" />
                  )}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-xl">{promo.title}</h3>
                      <p className="text-sm text-onSurfaceVariant mt-1">{promo.serviceName ?? "На все услуги салона"}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 bg-primary text-onPrimary font-bold px-3 py-1.5 rounded-xl shrink-0">
                      <Percent className="w-4 h-4" />
                      {promo.discountPercent}%
                    </span>
                  </div>
                  {promo.description && <p className="mt-3 text-onSurface leading-relaxed">{promo.description}</p>}
                  {(promo.startsAt || promo.endsAt) && (
                    <p className="text-xs text-onSurfaceVariant mt-3">
                      {dateLabel(promo.startsAt) ?? "уже действует"}
                      {promo.endsAt ? ` — до ${dateLabel(promo.endsAt)}` : ""}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-3xl font-serif font-bold mb-6">Мастера</h2>
          {masters.length === 0 ? (
            <p className="text-onSurfaceVariant bg-surface/30 p-6 rounded-2xl text-center">Мастера пока не добавлены</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {masters.map((master) => (
                <SalonMasterBookButton
                  key={master.id}
                  salonId={salon.id}
                  masterId={master.id}
                  masterName={master.userName}
                  specialization={master.specialization}
                  rating={master.rating}
                  ratingCount={master.ratingCount}
                  avatarUrl={master.avatarUrl}
                />
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-3xl font-serif font-bold mb-6">Услуги</h2>
          {services.length === 0 ? (
            <p className="text-onSurfaceVariant bg-surface/30 p-6 rounded-2xl text-center">Услуги пока не добавлены</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {services.map((service) => {
                const discount = bestDiscountForService(offers, service.id);
                const price = discountedPrice(service.price, discount);
                return (
                  <div key={service.id} className="flex justify-between items-center gap-4 bg-surface border border-outline rounded-3xl p-5 hover:border-primary/50 transition-colors shadow-sm">
                    <div>
                      <p className="font-bold text-lg">{service.name}</p>
                      {service.description && <p className="text-sm text-onSurfaceVariant mt-1">{service.description}</p>}
                      <p className="text-sm font-medium text-onSurfaceVariant mt-2 bg-background inline-block px-2.5 py-1 rounded-lg border border-outline/50">{service.durationMinutes} мин</p>
                    </div>
                    <div className="text-right shrink-0">
                      {discount > 0 && <p className="text-sm text-onSurfaceVariant line-through">{service.price} ₽</p>}
                      <p className="font-bold text-xl text-primary whitespace-nowrap bg-primary/10 px-4 py-2 rounded-xl">{price} ₽</p>
                      {discount > 0 && <p className="text-xs text-primary mt-1">−{discount}%</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-3xl font-serif font-bold mb-6">Отзывы</h2>
          {reviews.length === 0 ? (
            <p className="text-onSurfaceVariant bg-surface/30 p-6 rounded-2xl text-center">Отзывов пока нет</p>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="bg-surface border border-outline rounded-3xl p-6 shadow-sm">
                  <div className="flex flex-wrap items-center gap-4 mb-3">
                    <div className="flex items-center gap-1.5 bg-primary/10 px-3 py-1.5 rounded-xl">
                      <span className="text-sm font-medium text-primary">Салон</span>
                      <Star className="w-3.5 h-3.5 text-primary fill-primary" />
                      <span className="text-sm font-bold text-primary">{review.salonRating}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-surfaceVariant px-3 py-1.5 rounded-xl">
                      <span className="text-sm font-medium text-onSurface">{review.masterName ?? "Мастер"}</span>
                      <Star className="w-3.5 h-3.5 text-primary fill-primary" />
                      <span className="text-sm font-bold text-onSurface">{review.masterRating}</span>
                    </div>
                  </div>
                  {review.comment && <p className="text-onSurface leading-relaxed">{review.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </SiteShell>
  );
}
