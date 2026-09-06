import { ClientReviews } from "@/components/ClientReviews";
import { requireRole, redirectIfAuthError } from "@/lib/session";
import { UserRole } from "@/server/domain/types";

export const dynamic = "force-dynamic";

export default async function AccountReviewsPage() {
  let session;
  try {
    session = await requireRole([UserRole.Client]);
  } catch (error) {
    redirectIfAuthError(error, "/account/reviews");
  }
  return <ClientReviews name={session.name} />;
}
