import { AdminPhotos } from "@/components/AdminPhotos";
import { requireRole, redirectIfAuthError } from "@/lib/session";
import { UserRole } from "@/server/domain/types";

export const dynamic = "force-dynamic";

export default async function AdminPhotosPage() {
  let session;
  try {
    session = await requireRole([UserRole.SalonAdmin]);
  } catch (error) {
    redirectIfAuthError(error, "/admin/photos");
  }
  if (!session.salonId) return <p className="p-8">Сначала создайте салон</p>;
  return <AdminPhotos name={session.name} salonId={session.salonId} />;
}
