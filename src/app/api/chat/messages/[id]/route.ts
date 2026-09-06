import { getApp } from "@/server/infrastructure/get-app";
import { requireSession } from "@/lib/session";
import { fromResult, handleRouteError, readJson } from "@/lib/http";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = await readJson<{ body: string }>(request);
    return fromResult(await getApp().chat.updateMessage(session.userId, id, body.body));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    return fromResult(await getApp().chat.deleteMessage(session.userId, id));
  } catch (error) {
    return handleRouteError(error);
  }
}
