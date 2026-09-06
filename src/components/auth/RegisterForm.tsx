"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAction, type AuthFormState } from "@/app/actions/auth";

const initial: AuthFormState = {};

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, initial);

  return (
    <form action={action} className="space-y-4">
      {state.error && <p className="text-sm text-error">{state.error}</p>}
      <label className="block space-y-2">
        <span className="text-sm font-medium">Имя</span>
        <input name="name" required className="w-full bg-surfaceVariant border border-outline rounded-xl px-4 py-3 outline-none focus:border-primary" />
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-medium">Email</span>
        <input name="email" type="email" required className="w-full bg-surfaceVariant border border-outline rounded-xl px-4 py-3 outline-none focus:border-primary" />
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-medium">Телефон</span>
        <input name="phone" required placeholder="+79991112233" className="w-full bg-surfaceVariant border border-outline rounded-xl px-4 py-3 outline-none focus:border-primary" />
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-medium">Пароль</span>
        <input name="password" type="password" required minLength={8} className="w-full bg-surfaceVariant border border-outline rounded-xl px-4 py-3 outline-none focus:border-primary" />
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-medium">Роль</span>
        <select name="role" className="w-full bg-surfaceVariant border border-outline rounded-xl px-4 py-3 outline-none focus:border-primary">
          <option value="Client">Клиент</option>
          <option value="SalonAdmin">Администратор салона</option>
        </select>
      </label>
      <button type="submit" disabled={pending} className="w-full bg-primary text-onPrimary font-bold py-3.5 rounded-xl hover:bg-primaryVariant disabled:opacity-60">
        {pending ? "Создание..." : "Зарегистрироваться"}
      </button>
      <p className="text-sm text-onSurfaceVariant text-center">
        Уже есть аккаунт?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Войти
        </Link>
      </p>
    </form>
  );
}
