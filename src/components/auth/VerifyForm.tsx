"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { verifyAction, type AuthFormState } from "@/app/actions/auth";

const initial: AuthFormState = {};

export function VerifyForm() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const hint = searchParams.get("hint");
  const [state, action, pending] = useActionState(verifyAction, initial);

  return (
    <form action={action} className="space-y-4">
      {hint && (
        <p className="text-sm text-onSurfaceVariant">
          Код для разработки: <span className="text-primary font-mono">{hint}</span>
        </p>
      )}
      {state.error && <p className="text-sm text-error">{state.error}</p>}
      <input type="hidden" name="email" value={email} />
      <label className="block space-y-2">
        <span className="text-sm font-medium">Код из письма</span>
        <input name="code" required className="w-full bg-surfaceVariant border border-outline rounded-xl px-4 py-3 outline-none focus:border-primary" />
      </label>
      <button type="submit" disabled={pending} className="w-full bg-primary text-onPrimary font-bold py-3.5 rounded-xl">
        {pending ? "Проверка..." : "Подтвердить"}
      </button>
    </form>
  );
}
