import { notFound } from "next/navigation";
import { SalonHome } from "@/components/site/SalonHome";
import { getApp } from "@/server/infrastructure/get-app";

export const dynamic = "force-dynamic";

export default async function SalonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const salonResult = await getApp().salons.getById(id);
  if (!salonResult.ok) notFound();
  const [photos, promotions, masters, services, reviews] = await Promise.all([
    getApp().photos.list(id),
    getApp().promotions.listPublic(id),
    getApp().masters.getBySalon(id),
    getApp().catalog.getBySalon(id, true),
    getApp().reviews.bySalon(id),
  ]);

  return (
    <SalonHome
      salon={salonResult.value}
      photos={photos.ok ? photos.value : []}
      promotions={promotions.ok ? promotions.value : []}
      masters={masters.ok ? masters.value : []}
      services={services.ok ? services.value : []}
      reviews={reviews.ok ? reviews.value : []}
    />
  );
}
