import { getApp } from "@/server/infrastructure/get-app";
import { requireSession } from "@/lib/session";
import { fromResult, handleRouteError, readJson } from "@/lib/http";

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const search = new URL(request.url).searchParams.get("search") ?? undefined;
    return fromResult(await getApp().chat.list(session.userId, search));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = await readJson<{ participant2Id: string }>(request);
    return fromResult(await getApp().chat.create(session.userId, body.participant2Id), true);
  } catch (error) {
    return handleRouteError(error);
  }
}
