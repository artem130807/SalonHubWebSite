"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { UserRole } from "@/server/domain/types";
import { getApp } from "@/server/infrastructure/get-app";
import { createAuthCookies, revokeAndClearSession } from "@/lib/session";

export type AuthFormState = {
  error?: string;
  code?: string;
};

const registerSchema = z.object({
  name: z.string().min(2, "Имя слишком короткое"),
  email: z.string().email("Некорректный email"),
  phone: z.string().min(10, "Укажите телефон"),
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
  redirect(`/verify?email=${encodeURIComponent(parsed.data.email)}${result.value.verificationCode ? `&hint=${result.value.verificationCode}` : ""}`);
}

export async function verifyAction(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  const code = String(formData.get("code") ?? "");
  const result = await getApp().auth.verifyEmail(email, code);
  if (!result.ok) return { error: result.error };
  redirect("/login?verified=1");
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
  const from = String(formData.get("from") ?? "");
  redirect(from.startsWith("/") && !from.startsWith("//") ? from : "/");
}

export async function logoutAction() {
  await revokeAndClearSession();
  redirect("/");
}
