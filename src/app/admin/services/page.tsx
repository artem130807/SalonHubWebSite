import { AdminServices } from "@/components/AdminServices";
import { requireRole, redirectIfAuthError } from "@/lib/session";
import { UserRole } from "@/server/domain/types";

export const dynamic = "force-dynamic";

export default async function AdminServicesPage() {
  let session;
  try {
    session = await requireRole([UserRole.SalonAdmin]);
  } catch (error) {
    redirectIfAuthError(error, "/admin/services");
  }
  if (!session.salonId) return <p className="p-8">Сначала создайте салон</p>;
  return <AdminServices name={session.name} salonId={session.salonId} />;
}
