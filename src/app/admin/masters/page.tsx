import { AdminMasters } from "@/components/AdminMasters";
import { requireRole, redirectIfAuthError } from "@/lib/session";
import { UserRole } from "@/server/domain/types";

export const dynamic = "force-dynamic";

export default async function AdminMastersPage() {
  let session;
  try {
    session = await requireRole([UserRole.SalonAdmin]);
  } catch (error) {
    redirectIfAuthError(error, "/admin/masters");
  }
  if (!session.salonId) return <p className="p-8">Сначала создайте салон</p>;
  return <AdminMasters name={session.name} salonId={session.salonId} />;
}
