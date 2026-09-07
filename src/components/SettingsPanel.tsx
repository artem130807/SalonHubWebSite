"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/client-api";
import { CitySuggest } from "@/components/site/CitySuggest";

export function SettingsPanel({ name, city }: { name: string; city: string | null }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function saveCity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await apiFetch("/api/users/city", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ city: form.get("city") }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) setError(payload.error ?? "Не удалось сохранить город");
    else setMessage("Город обновлён");
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await apiFetch("/api/users/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: form.get("currentPassword"),
        nextPassword: form.get("nextPassword"),
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) setError(payload.error ?? "Не удалось обновить пароль");
    else setMessage("Пароль обновлён");
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold mb-2">Настройки</h1>
        <p className="text-lg text-onSurfaceVariant">{name}</p>
      </div>

      <div className="flex flex-wrap gap-2.5 md:hidden">
        <Link href="/account/reviews" className="px-4 py-2 rounded-full text-sm font-medium bg-surface border border-outline text-onSurface hover:border-primary hover:text-primary transition-colors">Отзывы</Link>
        <Link href="/account/inbox" className="px-4 py-2 rounded-full text-sm font-medium bg-surface border border-outline text-onSurface hover:border-primary hover:text-primary transition-colors">Уведомления</Link>
        <Link href="/account/chat" className="px-4 py-2 rounded-full text-sm font-medium bg-surface border border-outline text-onSurface hover:border-primary hover:text-primary transition-colors">Сообщения</Link>
      </div>

      {error && <p className="text-sm font-medium text-error bg-error/10 px-4 py-3 rounded-xl">{error}</p>}
      {message && <p className="text-sm font-medium text-primary bg-primary/10 px-4 py-3 rounded-xl">{message}</p>}
      
      <div className="bg-surface border border-outline rounded-3xl p-6 sm:p-8 shadow-sm space-y-8">
        <form className="space-y-4" onSubmit={saveCity}>
          <h2 className="text-xl font-serif font-bold">Город</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <CitySuggest defaultValue={city ?? ""} placeholder="Начните вводить город России" className="flex-1" />
            <button className="bg-primary text-onPrimary font-bold rounded-xl px-6 py-3 hover:bg-primaryVariant transition-colors shadow-sm shrink-0">Сохранить</button>
          </div>
        </form>

        <hr className="border-outline/50" />

        <form className="space-y-4" onSubmit={savePassword}>
          <h2 className="text-xl font-serif font-bold">Пароль</h2>
          <div className="space-y-3">
            <input name="currentPassword" type="password" required placeholder="Текущий пароль" className="w-full bg-background border border-outline rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all" />
            <input name="nextPassword" type="password" required placeholder="Новый пароль" className="w-full bg-background border border-outline rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all" />
          </div>
          <button className="bg-primary text-onPrimary font-bold rounded-xl px-6 py-3 hover:bg-primaryVariant transition-colors shadow-sm">Обновить пароль</button>
        </form>
      </div>
    </div>
  );
}
