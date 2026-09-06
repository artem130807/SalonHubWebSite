import { DashboardLayout } from "@/components/DashboardLayout";
import { InboxPanel } from "@/components/InboxPanel";
import { requireRole, redirectIfAuthError } from "@/lib/session";
import { UserRole } from "@/server/domain/types";

export const dynamic = "force-dynamic";

export default async function AdminInboxPage() {
  let session;
  try {
    session = await requireRole([UserRole.SalonAdmin]);
  } catch (error) {
    redirectIfAuthError(error, "/admin/inbox");
  }
  return (
    <DashboardLayout role="admin" name={session.name}>
      <InboxPanel />
    </DashboardLayout>
  );
}
