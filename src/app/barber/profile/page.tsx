import { MasterProfilePanel } from "@/components/MasterProfilePanel";
import { requireRole, redirectIfAuthError } from "@/lib/session";
import { UserRole } from "@/server/domain/types";

export const dynamic = "force-dynamic";

export default async function BarberProfilePage() {
  let session;
  try {
    session = await requireRole([UserRole.Master]);
  } catch (error) {
    redirectIfAuthError(error, "/barber/profile");
  }
  if (!session.masterProfileId) return <p className="p-8">Профиль мастера не найден</p>;
  return <MasterProfilePanel name={session.name} masterId={session.masterProfileId} />;
}
