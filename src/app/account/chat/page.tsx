import { ChatPanel } from "@/components/ChatPanel";
import { requireSession, redirectIfAuthError } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AccountChatPage() {
  let session;
  try {
    session = await requireSession();
  } catch (error) {
    redirectIfAuthError(error, "/account/chat");
  }
  return <ChatPanel userId={session.userId} />;
}
