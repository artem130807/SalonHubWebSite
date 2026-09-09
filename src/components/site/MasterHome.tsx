import Link from "next/link";
import { Clock, MapPin, Phone, Star } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { PhotoCarousel } from "@/components/site/PhotoCarousel";
import { SalonBookingButton } from "@/components/site/SalonBookingButton";
import { bestDiscountForService, discountedPrice } from "@/server/domain/promotion-rules";
import { ratingCountLabel } from "@/lib/locale";
import type { PublicMasterProfile } from "@/server/application/master-profile-query";

function dateLabel(value: Date | string | null) {
  if (!value) return null;
  const iso = value instanceof Date ? value.toISOString() : String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso.slice(0, 10);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

export function MasterHome({ profile }: { profile: PublicMasterProfile }) {
  const { master, salon, services, portfolio, reviews, promotions } = profile;
  const offers = promotions.map((item) => ({ discountPercent: item.discountPercent, serviceId: item.serviceId }));
  const address = `${salon.city}, ${salon.street}, ${salon.building}`;

  return (
    <SiteShell>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        <section className="space-y-5">
          <Link href={`/salons/${salon.id}`} className="inline-flex items-center gap-2 text-sm font-medium text-onSurfaceVariant hover:text-primary transition-colors">
            ← {salon.name}
          </Link>
          <div className="bg-surface/50 p-6 sm:p-10 rounded-3xl border border-outline/50 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
              <div className="flex items-start gap-5 min-w-0">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-primary/10 overflow-hidden border border-outline shrink-0">
                  {master.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={master.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-primary font-serif text-4xl font-bold">
                      {master.userName.slice(0, 1)}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-primary">{master.specialization || "Мастер"}</p>
                  <h1 className="text-4xl sm:text-5xl font-serif font-bold leading-tight">{master.userName}</h1>
                  <p className="text-onSurfaceVariant mt-2">
                    Работает в{" "}
                    <Link href={`/salons/${salon.id}`} className="text-primary hover:underline">
                      {salon.name}
                    </Link>
                  </p>
                  <div className="flex flex-col gap-2 mt-4">
                    <p className="flex items-center gap-2.5 text-onSurface">
                      <MapPin className="w-5 h-5 text-primary shrink-0" />
                      {address}
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
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 shrink-0">
                <div className="flex items-center gap-2 bg-background px-4 py-2.5 rounded-2xl border border-outline shadow-sm">
                  <Star className="w-5 h-5 text-primary fill-primary" />
                  <span className="font-bold text-lg">{master.rating.toFixed(1)}</span>
                  <span className="text-sm text-onSurfaceVariant">({ratingCountLabel(master.ratingCount)})</span>
                </div>
                <SalonBookingButton salonId={salon.id} masterId={master.id} />
              </div>
            </div>
          </div>
        </section>

        {master.bio && (
          <section className="bg-surface/30 p-6 rounded-3xl border border-outline/30">
            <h2 className="text-2xl font-serif font-bold mb-3">О мастере</h2>
            <p className="text-onSurface leading-relaxed text-lg">{master.bio}</p>
          </section>
        )}

        <section>
          <h2 className="text-3xl font-serif font-bold mb-6">Портфолио</h2>
          <PhotoCarousel
            photos={portfolio}
            alt={`Работы мастера ${master.userName}`}
            className="h-72 sm:h-[28rem]"
            emptyLabel="Пока нет фото работ"
            showThumbs
          />
        </section>

        <section>
          <h2 className="text-3xl font-serif font-bold mb-6">Услуги мастера</h2>
          {services.length === 0 ? (
            <p className="text-onSurfaceVariant bg-surface/30 p-6 rounded-2xl text-center">Услуги пока не назначены</p>
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
                <article key={review.id} className="bg-surface border border-outline rounded-3xl p-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <p className="font-bold">{review.clientName ?? "Клиент"}</p>
                    <div className="flex items-center gap-1.5 bg-primary/10 px-3 py-1.5 rounded-xl">
                      <Star className="w-3.5 h-3.5 text-primary fill-primary" />
                      <span className="text-sm font-bold text-primary">{review.masterRating}</span>
                    </div>
                  </div>
                  {review.comment && <p className="text-onSurface leading-relaxed">{review.comment}</p>}
                  {dateLabel(review.createdAt) && (
                    <p className="text-xs text-onSurfaceVariant mt-3">{dateLabel(review.createdAt)}</p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </SiteShell>
  );
}
