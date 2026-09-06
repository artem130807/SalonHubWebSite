import { getApp } from "@/server/infrastructure/get-app";
import { fromResult, handleRouteError } from "@/lib/http";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    return fromResult(await getApp().profile.publicProfile(id));
  } catch (error) {
    return handleRouteError(error);
  }
}
