import { getApp } from "@/server/infrastructure/get-app";
import { fromResult, handleRouteError } from "@/lib/http";

export async function GET(_request: Request, { params }: { params: Promise<{ salonId: string }> }) {
  try {
    const { salonId } = await params;
    return fromResult(await getApp().reviews.bySalon(salonId));
  } catch (error) {
    return handleRouteError(error);
  }
}
