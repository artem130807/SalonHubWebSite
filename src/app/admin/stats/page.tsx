import { DashboardLayout } from "@/components/DashboardLayout";
import { StatsPanel } from "@/components/StatsPanel";
import { requireRole, redirectIfAuthError } from "@/lib/session";
import { UserRole } from "@/server/domain/types";

export const dynamic = "force-dynamic";

export default async function AdminStatsPage() {
  let session;
  try {
    session = await requireRole([UserRole.SalonAdmin]);
  } catch (error) {
    redirectIfAuthError(error, "/admin/stats");
  }
  return (
    <DashboardLayout role="admin" name={session.name}>
      <StatsPanel endpoint="/api/stats/salon" />
    </DashboardLayout>
  );
}
