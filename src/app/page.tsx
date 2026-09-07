import { SiteShell } from "@/components/site/SiteShell";
import { HomeDiscover } from "@/components/site/HomeDiscover";
import { getApp } from "@/server/infrastructure/get-app";
import { getOptionalSession } from "@/lib/session";
import { UserRole } from "@/server/domain/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getOptionalSession();
  const city = session?.city || undefined;
  let salons: Awaited<ReturnType<ReturnType<typeof getApp>["salons"]["search"]>> = [];
  let masters: Awaited<ReturnType<ReturnType<typeof getApp>["masters"]["featured"]>> = { ok: true, value: [] };
  try {
    salons = await getApp().salons.search({ city, sort: "rating" });
  } catch {
    salons = [];
  }
  try {
    masters = await getApp().masters.featured(4, city);
  } catch {
    masters = { ok: true, value: [] };
  }

  const firstName = session?.name?.trim().split(/\s+/)[0];
  const greeting = session && session.role === UserRole.Client && firstName ? `Привет, ${firstName}!` : "Привет!";

  return (
    <SiteShell>
      <HomeDiscover
        greeting={greeting}
        subtitle="Найди свой идеальный стиль"
        salons={salons.slice(0, 6)}
        masters={masters.ok ? masters.value : []}
        city={city}
      />
    </SiteShell>
  );
}
