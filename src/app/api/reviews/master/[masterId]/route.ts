import { getApp } from "@/server/infrastructure/get-app";
import { fromResult, handleRouteError } from "@/lib/http";

export async function GET(_request: Request, { params }: { params: Promise<{ masterId: string }> }) {
  try {
    const { masterId } = await params;
    return fromResult(await getApp().reviews.byMaster(masterId));
  } catch (error) {
    return handleRouteError(error);
  }
}
