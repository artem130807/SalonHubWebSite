import { getApp } from "@/server/infrastructure/get-app";
import { requireSession } from "@/lib/session";
import { fromResult, handleRouteError } from "@/lib/http";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(_request: Request, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    return fromResult(await getApp().inbox.markRead(session.userId, id));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    return fromResult(await getApp().inbox.delete(session.userId, id));
  } catch (error) {
    return handleRouteError(error);
  }
}
