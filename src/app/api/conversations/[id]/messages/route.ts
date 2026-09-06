import { getApp } from "@/server/infrastructure/get-app";
import { requireSession } from "@/lib/session";
import { fromResult, handleRouteError, readJson } from "@/lib/http";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    return fromResult(await getApp().chat.listMessages(session.userId, id));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = await readJson<{ body: string }>(request);
    return fromResult(await getApp().chat.send(session.userId, id, body.body), true);
  } catch (error) {
    return handleRouteError(error);
  }
}
