import { DashboardLayout } from "@/components/DashboardLayout";
import { ChatPanel } from "@/components/ChatPanel";
import { requireRole, redirectIfAuthError } from "@/lib/session";
import { UserRole } from "@/server/domain/types";

export const dynamic = "force-dynamic";

export default async function BarberChatPage() {
  let session;
  try {
    session = await requireRole([UserRole.Master]);
  } catch (error) {
    redirectIfAuthError(error, "/barber/chat");
  }
  return (
    <DashboardLayout role="barber" name={session.name}>
      <ChatPanel userId={session.userId} />
    </DashboardLayout>
  );
}
