import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { UserRole } from "@/server/domain/types";
import { requireRole } from "@/lib/session";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(request: Request) {
  try {
    await requireRole([UserRole.SalonAdmin, UserRole.Master]);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return jsonError("Файл не выбран");
    if (file.size > MAX_BYTES) return jsonError("Файл больше 5 МБ");
    if (!ALLOWED.has(file.type)) return jsonError("Допустимы JPEG, PNG, WEBP или GIF");
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : file.type === "image/gif" ? "gif" : "jpg";
    const name = `${randomUUID()}.${ext}`;
    const dir = path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
    return jsonOk({ url: `/uploads/${name}` }, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
