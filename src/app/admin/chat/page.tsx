import { DashboardLayout } from "@/components/DashboardLayout";
import { ChatPanel } from "@/components/ChatPanel";
import { requireRole, redirectIfAuthError } from "@/lib/session";
import { UserRole } from "@/server/domain/types";

export const dynamic = "force-dynamic";

export default async function AdminChatPage() {
  let session;
  try {
    session = await requireRole([UserRole.SalonAdmin]);
  } catch (error) {
    redirectIfAuthError(error, "/admin/chat");
  }
  return (
    <DashboardLayout role="admin" name={session.name}>
      <ChatPanel userId={session.userId} />
    </DashboardLayout>
  );
}
