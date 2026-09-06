import { MasterReviews } from "@/components/MasterReviews";
import { requireRole, redirectIfAuthError } from "@/lib/session";
import { UserRole } from "@/server/domain/types";

export const dynamic = "force-dynamic";

export default async function BarberReviewsPage() {
  let session;
  try {
    session = await requireRole([UserRole.Master]);
  } catch (error) {
    redirectIfAuthError(error, "/barber/reviews");
  }
  if (!session.masterProfileId) return <p className="p-8">Профиль мастера не найден</p>;
  return <MasterReviews name={session.name} masterId={session.masterProfileId} />;
}
