import { getApp } from "@/server/infrastructure/get-app";
import { getOptionalSession } from "@/lib/session";
import { BookingProvider } from "@/components/BookingProvider";
import { Footer } from "@/components/Footer";
import { NotificationListener } from "@/components/NotificationListener";
import { ClientBottomNav, SiteHeader } from "@/components/site/SiteHeader";

export async function SiteShell({
  children,
  showFooter = true,
}: {
  children: React.ReactNode;
  showFooter?: boolean;
}) {
  const session = await getOptionalSession();
  let salons: Awaited<ReturnType<ReturnType<typeof getApp>["salons"]["search"]>> = [];
  try {
    salons = await getApp().salons.search();
  } catch {
    salons = [];
  }
  const viewer = session ? { name: session.name, role: session.role } : null;

  return (
    <BookingProvider salons={salons}>
      <div className="min-h-screen flex flex-col pb-16 md:pb-0">
        <NotificationListener />
        <SiteHeader viewer={viewer} />
        <div className="flex-1">{children}</div>
        {showFooter ? <Footer /> : null}
        <ClientBottomNav viewer={viewer} />
      </div>
    </BookingProvider>
  );
}
