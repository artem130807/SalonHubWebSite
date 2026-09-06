import { WalkInForm } from "@/components/WalkInForm";
import { requireRole, redirectIfAuthError } from "@/lib/session";
import { UserRole } from "@/server/domain/types";

export const dynamic = "force-dynamic";

export default async function WalkInPage() {
  let session;
  try {
    session = await requireRole([UserRole.Master]);
  } catch (error) {
    redirectIfAuthError(error, "/barber/walk-in");
  }
  if (!session.masterProfileId || !session.salonId) {
    return <p className="p-8">Профиль мастера не найден</p>;
  }
  return <WalkInForm name={session.name} salonId={session.salonId} masterId={session.masterProfileId} />;
}
