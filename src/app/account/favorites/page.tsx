import { FavoritesPanel } from "@/components/FavoritesPanel";
import { requireRole, redirectIfAuthError } from "@/lib/session";
import { UserRole } from "@/server/domain/types";

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  let session;
  try {
    session = await requireRole([UserRole.Client]);
  } catch (error) {
    redirectIfAuthError(error, "/account/favorites");
  }
  return <FavoritesPanel name={session.name} />;
}
