import { TemplatesPanel } from "@/components/TemplatesPanel";
import { requireRole, redirectIfAuthError } from "@/lib/session";
import { UserRole } from "@/server/domain/types";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  let session;
  try {
    session = await requireRole([UserRole.Master]);
  } catch (error) {
    redirectIfAuthError(error, "/barber/templates");
  }
  return <TemplatesPanel name={session.name} />;
}
