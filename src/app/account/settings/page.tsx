import { SettingsPanel } from "@/components/SettingsPanel";
import { requireSession, redirectIfAuthError } from "@/lib/session";
import { getApp } from "@/server/infrastructure/get-app";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  let session;
  try {
    session = await requireSession();
  } catch (error) {
    redirectIfAuthError(error, "/account/settings");
  }
  const current = await getApp().auth.current(session.userId);
  return (
    <SettingsPanel
      name={session.name}
      city={current.ok ? (current.value.city as string | null) : null}
    />
  );
}
