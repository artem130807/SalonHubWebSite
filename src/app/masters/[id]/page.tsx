import { notFound } from "next/navigation";
import { MasterHome } from "@/components/site/MasterHome";
import { getApp } from "@/server/infrastructure/get-app";

export const dynamic = "force-dynamic";

export default async function MasterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getApp().publicMasters.getById(id);
  if (!profile.ok) notFound();
  return <MasterHome profile={profile.value} />;
}
