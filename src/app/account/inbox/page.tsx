import { InboxPanel } from "@/components/InboxPanel";
import { requireSession, redirectIfAuthError } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AccountInboxPage() {
  let session;
  try {
    session = await requireSession();
  } catch (error) {
    redirectIfAuthError(error, "/account/inbox");
  }
  return <InboxPanel />;
}
