import { DashboardLayout } from "@/components/DashboardLayout";
import { StatsPanel } from "@/components/StatsPanel";
import { requireRole, redirectIfAuthError } from "@/lib/session";
import { UserRole } from "@/server/domain/types";

export const dynamic = "force-dynamic";

export default async function BarberStatsPage() {
  let session;
  try {
    session = await requireRole([UserRole.Master]);
  } catch (error) {
    redirectIfAuthError(error, "/barber/stats");
  }
  return (
    <DashboardLayout role="barber" name={session.name}>
      <StatsPanel endpoint="/api/stats/me" />
    </DashboardLayout>
  );
}
