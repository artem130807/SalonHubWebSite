import { BarberDashboard } from "@/components/BarberDashboard";
import { requireRole, redirectIfAuthError } from "@/lib/session";
import { getApp } from "@/server/infrastructure/get-app";
import { UserRole } from "@/server/domain/types";
import { dateOnly } from "@/server/domain/scheduling";

export const dynamic = "force-dynamic";

export default async function BarberPage() {
  let session;
  try {
    session = await requireRole([UserRole.Master]);
  } catch (error) {
    redirectIfAuthError(error, "/barber");
  }
  const today = dateOnly(new Date());
  const result = await getApp().appointments.getMasterDay(session.userId, today);
  return (
    <BarberDashboard
      name={session.name}
      appointments={result.ok ? result.value : []}
      today={today}
      publicProfileHref={session.masterProfileId ? `/masters/${session.masterProfileId}` : undefined}
    />
  );
}
