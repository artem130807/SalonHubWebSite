"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, type AuthFormState } from "@/app/actions/auth";

const initial: AuthFormState = {};

export function LoginForm({ verified, from }: { verified?: boolean; from?: string }) {
  const [state, action, pending] = useActionState(loginAction, initial);

  return (
    <form action={action} className="space-y-4">
      {from && <input type="hidden" name="from" value={from} />}
      {verified && (
        <p className="text-sm text-success">Email подтверждён, можно войти.</p>
      )}
      {state.error && <p className="text-sm text-error">{state.error}</p>}
      <label className="block space-y-2">
        <span className="text-sm font-medium">Email</span>
        <input
          name="email"
          type="email"
          required
          className="w-full bg-surfaceVariant border border-outline rounded-xl px-4 py-3 outline-none focus:border-primary"
        />
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-medium">Пароль</span>
        <input
          name="password"
          type="password"
          required
          className="w-full bg-surfaceVariant border border-outline rounded-xl px-4 py-3 outline-none focus:border-primary"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="w-full bg-primary text-onPrimary font-bold py-3.5 rounded-xl hover:bg-primaryVariant disabled:opacity-60"
      >
        {pending ? "Вход..." : "Войти"}
      </button>
      <p className="text-sm text-onSurfaceVariant text-center">
        Нет аккаунта?{" "}
        <Link href="/register" className="text-primary hover:underline">
          Регистрация
        </Link>
      </p>
    </form>
  );
}
