import Link from "next/link";
import { getApp } from "@/server/infrastructure/get-app";
import { requireSession, redirectIfAuthError } from "@/lib/session";
import { cancelAppointmentAction } from "@/app/actions/appointments";
import { UserRole } from "@/server/domain/types";
import { dateOnly } from "@/server/domain/scheduling";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  let session;
  try {
    session = await requireSession();
  } catch (error) {
    redirectIfAuthError(error, "/account");
  }
  const mine =
    session.role === UserRole.Client
      ? await getApp().appointments.getMine(session.userId)
      : { ok: true as const, value: [] };

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold mb-2">Мои записи</h1>
        <p className="text-lg text-onSurfaceVariant">{session.name}</p>
      </div>
      <div className="space-y-4">
        {mine.ok && mine.value.length === 0 && (
          <div className="bg-surface/50 border border-outline/50 rounded-3xl p-8 text-center">
            <p className="text-lg text-onSurfaceVariant mb-4">У вас пока нет активных записей.</p>
            <Link href="/" className="inline-block bg-primary text-onPrimary px-6 py-3 rounded-xl font-bold hover:bg-primaryVariant transition-colors">
              Найти салон
            </Link>
          </div>
        )}
        {mine.ok &&
          mine.value.map((item) => (
            <div key={item.id} className="bg-surface border border-outline rounded-3xl p-6 shadow-sm hover:border-primary/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="font-bold text-lg mb-1">
                  {dateOnly(item.appointmentDate)} <span className="text-primary mx-2">•</span> {item.startTime}–{item.endTime}
                </p>
                <p className="text-onSurfaceVariant">
                  {item.salonName} <span className="mx-1.5 opacity-50">•</span> {item.masterName} <span className="mx-1.5 opacity-50">•</span> {item.serviceName}
                </p>
                <p className="inline-block mt-3 px-3 py-1 rounded-lg text-sm font-medium bg-primary/10 text-primary">{item.status}</p>
              </div>
              {item.status === "Confirmed" && (
                <form action={cancelAppointmentAction} className="shrink-0">
                  <input type="hidden" name="id" value={item.id} />
                  <button type="submit" className="px-5 py-2.5 rounded-xl text-sm font-bold bg-error/10 text-error hover:bg-error hover:text-white transition-colors">
                    Отменить запись
                  </button>
                </form>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
