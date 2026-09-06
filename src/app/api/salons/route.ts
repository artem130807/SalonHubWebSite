import { UserRole } from "@/server/domain/types";
import { getApp } from "@/server/infrastructure/get-app";
import { requireRole } from "@/lib/session";
import { fromResult, handleRouteError, jsonOk, readJson } from "@/lib/http";
import type { SalonCatalogSort } from "@/server/application/salon-service";

function parseSort(value: string | null): SalonCatalogSort | undefined {
  if (value === "rating" || value === "popular" || value === "price") return value;
  return undefined;
}
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const salons = await getApp().salons.search({
      name: searchParams.get("search") ?? searchParams.get("q") ?? undefined,
      category: searchParams.get("category") ?? undefined,
      city: searchParams.get("city") ?? undefined,
      sort: parseSort(searchParams.get("sort")),
    });
    return jsonOk(salons);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireRole([UserRole.SalonAdmin]);
    const body = await readJson<{
      name: string;
      description?: string;
      city: string;
      street: string;
      building: string;
      phone?: string;
      openingTime?: string;
      closingTime?: string;
    }>(request);
    return fromResult(await getApp().salons.create(session.userId, body), true);
  } catch (error) {
    return handleRouteError(error);
  }
}
