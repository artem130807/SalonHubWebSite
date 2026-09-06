import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Phone, Star } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { SalonBookingButton } from "@/components/site/SalonBookingButton";
import { getApp } from "@/server/infrastructure/get-app";

export const dynamic = "force-dynamic";

export default async function SalonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const salonResult = await getApp().salons.getById(id);
  if (!salonResult.ok) notFound();
  const salon = salonResult.value;
  const [photos, masters, services, reviews] = await Promise.all([
    getApp().photos.list(id),
    getApp().masters.getBySalon(id),
    getApp().catalog.getBySalon(id, true),
    getApp().reviews.bySalon(id),
  ]);
  const photoList = photos.ok ? photos.value : [];
  const masterList = masters.ok ? masters.value : [];
  const serviceList = services.ok ? services.value : [];
  const reviewList = reviews.ok ? reviews.value.slice(0, 5) : [];

  return (
    <SiteShell>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        <div className="bg-surface/50 p-6 sm:p-10 rounded-3xl border border-outline/50 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <Link href="/salons" className="inline-flex items-center gap-2 text-sm font-medium text-onSurfaceVariant hover:text-primary transition-colors mb-6 relative z-10">
            ← Все салоны
          </Link>
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

        {photoList.length > 0 && (
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x hide-scrollbar">
            {photoList.map((photo) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={photo.id} src={photo.url} alt="" className="h-56 w-80 object-cover rounded-3xl border border-outline shrink-0 snap-start shadow-sm" />
            ))}
          </div>
        )}

        {salon.description && (
          <div className="bg-surface/30 p-6 rounded-3xl border border-outline/30">
            <p className="text-onSurface leading-relaxed text-lg">{salon.description}</p>
          </div>
        )}

        <section>
          <h2 className="text-3xl font-serif font-bold mb-6">Мастера</h2>
          {masterList.length === 0 ? (
            <p className="text-onSurfaceVariant bg-surface/30 p-6 rounded-2xl text-center">Мастера пока не добавлены</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {masterList.map((master) => (
                <div key={master.id} className="bg-surface border border-outline rounded-3xl p-5 flex items-center gap-4 hover:border-primary/50 transition-colors shadow-sm">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-serif text-xl font-bold shrink-0">
                    {master.userName.slice(0, 1)}
                  </div>
                  <div>
                    <p className="font-bold text-lg">{master.userName}</p>
                    <p className="text-sm text-onSurfaceVariant">{master.specialization || "Мастер"}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-3.5 h-3.5 text-primary fill-primary" />
                      <span className="text-sm font-bold">{master.rating.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-3xl font-serif font-bold mb-6">Услуги</h2>
          {serviceList.length === 0 ? (
            <p className="text-onSurfaceVariant bg-surface/30 p-6 rounded-2xl text-center">Услуги пока не добавлены</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {serviceList.map((service) => (
                <div key={service.id} className="flex justify-between items-center gap-4 bg-surface border border-outline rounded-3xl p-5 hover:border-primary/50 transition-colors shadow-sm">
                  <div>
                    <p className="font-bold text-lg">{service.name}</p>
                    {service.description && <p className="text-sm text-onSurfaceVariant mt-1">{service.description}</p>}
                    <p className="text-sm font-medium text-onSurfaceVariant mt-2 bg-background inline-block px-2.5 py-1 rounded-lg border border-outline/50">{service.durationMinutes} мин</p>
                  </div>
                  <p className="font-bold text-xl text-primary whitespace-nowrap bg-primary/10 px-4 py-2 rounded-xl">{service.price} ₽</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-3xl font-serif font-bold mb-6">Отзывы</h2>
          {reviewList.length === 0 ? (
            <p className="text-onSurfaceVariant bg-surface/30 p-6 rounded-2xl text-center">Отзывов пока нет</p>
          ) : (
            <div className="space-y-4">
              {reviewList.map((review) => (
                <div key={review.id} className="bg-surface border border-outline rounded-3xl p-6 shadow-sm">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex items-center gap-1.5 bg-primary/10 px-3 py-1.5 rounded-xl">
                      <span className="text-sm font-medium text-primary">Салон</span>
                      <Star className="w-3.5 h-3.5 text-primary fill-primary" />
                      <span className="text-sm font-bold text-primary">{review.salonRating}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-surfaceVariant px-3 py-1.5 rounded-xl">
                      <span className="text-sm font-medium text-onSurface">Мастер</span>
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
