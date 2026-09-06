import { DashboardLayout } from "@/components/DashboardLayout";
import { InboxPanel } from "@/components/InboxPanel";
import { requireRole, redirectIfAuthError } from "@/lib/session";
import { UserRole } from "@/server/domain/types";

export const dynamic = "force-dynamic";

export default async function BarberInboxPage() {
  let session;
  try {
    session = await requireRole([UserRole.Master]);
  } catch (error) {
    redirectIfAuthError(error, "/barber/inbox");
  }
  return (
    <DashboardLayout role="barber" name={session.name}>
      <InboxPanel />
    </DashboardLayout>
  );
}
