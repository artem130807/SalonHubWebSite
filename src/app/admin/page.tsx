import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/AdminDashboard";
import { requireRole, redirectIfAuthError } from "@/lib/session";
import { getApp } from "@/server/infrastructure/get-app";
import { UserRole } from "@/server/domain/types";
import { dateOnly } from "@/server/domain/scheduling";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  let session;
  try {
    session = await requireRole([UserRole.SalonAdmin]);
  } catch (error) {
    redirectIfAuthError(error, "/admin");
  }
  const today = dateOnly(new Date());
  const appointments = session.salonId
    ? await getApp().appointments.getSalonDay(session.salonId, today)
    : { ok: true as const, value: [] };
  const masters = session.salonId
    ? await getApp().masters.getBySalon(session.salonId)
    : { ok: true as const, value: [] };

  return (
    <AdminDashboard
      name={session.name}
      appointments={appointments.ok ? appointments.value : []}
      mastersCount={masters.ok ? masters.value.length : 0}
      needsSalon={!session.salonId}
    />
  );
}
