"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { UserRole } from "@/server/domain/types";
import { getApp } from "@/server/infrastructure/get-app";
import { parseInternalPath } from "@/lib/safe-path";
import { createAuthCookies, revokeAndClearSession } from "@/lib/session";

export type AuthFormState = {
  error?: string;
  code?: string;
};

const registerSchema = z.object({
  name: z.string().min(2, "Имя слишком короткое"),
  email: z.string().email("Некорректный email"),
  phone: z.string().min(10, "Укажите телефон"),
  city: z.string().min(2, "Вы не указали город"),
  password: z.string().min(8, "Пароль должен содержать минимум 8 символов"),
  role: z.enum(["Client", "SalonAdmin"]).default("Client"),
});

export async function registerAction(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Проверьте поля формы" };
  }
  const result = await getApp().auth.register(
    {
      ...parsed.data,
      role: parsed.data.role === "SalonAdmin" ? UserRole.SalonAdmin : UserRole.Client,
    },
    process.env.NODE_ENV !== "production",
  );
  if (!result.ok) return { error: result.error };
  const from = parseInternalPath(formData.get("from"));
  const next = new URLSearchParams({ email: parsed.data.email });
  if (result.value.verificationCode) next.set("hint", result.value.verificationCode);
  if (from) next.set("from", from);
  redirect(`/verify?${next.toString()}`);
}

export async function verifyAction(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  const code = String(formData.get("code") ?? "");
  const result = await getApp().auth.verifyEmail(email, code);
  if (!result.ok) return { error: result.error };
  const from = parseInternalPath(formData.get("from"));
  const next = new URLSearchParams({ verified: "1" });
  if (from) next.set("from", from);
  redirect(`/login?${next.toString()}`);
}

export async function loginAction(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const result = await getApp().auth.login(email, password);
  if (!result.ok) return { error: result.error };
  await createAuthCookies(result.value);
  if (result.value.role === UserRole.SalonAdmin) redirect("/admin");
  if (result.value.role === UserRole.Master) redirect("/barber");
  redirect(parseInternalPath(formData.get("from")) ?? "/");
}

export async function logoutAction() {
  await revokeAndClearSession();
  redirect("/");
}
