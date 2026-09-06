import { AdminAppointments } from "@/components/AdminAppointments";
import { requireRole, redirectIfAuthError } from "@/lib/session";
import { UserRole } from "@/server/domain/types";

export const dynamic = "force-dynamic";

export default async function AdminAppointmentsPage() {
  let session;
  try {
    session = await requireRole([UserRole.SalonAdmin]);
  } catch (error) {
    redirectIfAuthError(error, "/admin/appointments");
  }
  return <AdminAppointments name={session.name} />;
}
