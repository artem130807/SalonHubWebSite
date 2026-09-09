import { AdminPromotions } from "@/components/AdminPromotions";
import { requireRole, redirectIfAuthError } from "@/lib/session";
import { UserRole } from "@/server/domain/types";

export const dynamic = "force-dynamic";

export default async function AdminPromotionsPage() {
  let session;
  try {
    session = await requireRole([UserRole.SalonAdmin]);
  } catch (error) {
    redirectIfAuthError(error, "/admin/promotions");
  }
  if (!session.salonId) return <p className="p-8">Сначала создайте салон</p>;
  return <AdminPromotions name={session.name} salonId={session.salonId} />;
}
