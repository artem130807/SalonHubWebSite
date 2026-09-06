import { SiteShell } from "@/components/site/SiteShell";
import { ClientArea } from "@/components/site/ClientArea";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <SiteShell showFooter={false}>
      <ClientArea>{children}</ClientArea>
    </SiteShell>
  );
}
