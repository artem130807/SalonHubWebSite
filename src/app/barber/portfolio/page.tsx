import { PortfolioPanel } from "@/components/PortfolioPanel";
import { requireRole, redirectIfAuthError } from "@/lib/session";
import { UserRole } from "@/server/domain/types";

export const dynamic = "force-dynamic";

export default async function BarberPortfolioPage() {
  let session;
  try {
    session = await requireRole([UserRole.Master]);
  } catch (error) {
    redirectIfAuthError(error, "/barber/portfolio");
  }
  if (!session.masterProfileId) return <p className="p-8">Профиль мастера не найден</p>;
  return <PortfolioPanel name={session.name} />;
}
