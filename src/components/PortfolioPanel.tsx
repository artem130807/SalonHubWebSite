"use client";

import { useEffect, useState, type FormEvent } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PhotoCarousel } from "@/components/site/PhotoCarousel";
import { apiFetch } from "@/lib/client-api";

type Photo = { id: string; url: string; caption: string | null };

export function PortfolioPanel({ name }: { name: string }) {
  const [items, setItems] = useState<Photo[]>([]);
  const [error, setError] = useState("");

  async function load() {
    const response = await apiFetch("/api/portfolio");
    const payload = await response.json();
    if (response.ok) setItems(payload);
  }

  useEffect(() => {
    void load();
  }, []);

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const formEl = event.currentTarget;
    const file = (formEl.elements.namedItem("file") as HTMLInputElement).files?.[0];
    if (!file) return;
    const form = new FormData();
    form.set("file", file);
    const uploaded = await apiFetch("/api/media/upload", { method: "POST", body: form });
    const media = await uploaded.json();
    if (!uploaded.ok) {
      setError(media.error ?? "Не удалось загрузить файл");
      return;
    }
    const caption = String((formEl.elements.namedItem("caption") as HTMLInputElement | null)?.value ?? "");
    const created = await apiFetch("/api/portfolio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: media.url, caption }),
    });
    const payload = await created.json().catch(() => ({}));
    if (!created.ok) setError(payload.error ?? "Не удалось сохранить фото");
    else {
      formEl.reset();
      await load();
    }
  }

  async function remove(id: string) {
    await apiFetch(`/api/portfolio/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <DashboardLayout role="barber" name={name}>
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="text-3xl font-serif font-bold">Портфолио</h1>
          <p className="text-onSurfaceVariant mt-2">Фото работ увидят клиенты на странице салона. Листайте карусель свайпом.</p>
        </div>
        {error && <p className="text-error text-sm">{error}</p>}
        <PhotoCarousel photos={items} alt="Работы мастера" className="h-80" emptyLabel="Пока нет фото работ" />
        <form onSubmit={upload} className="bg-card border border-outline rounded-2xl p-5 space-y-3">
          <input name="file" type="file" accept="image/*" required />
          <input name="caption" placeholder="Подпись, например «Fade, 2026»" className="w-full bg-surfaceVariant border border-outline rounded-xl px-3 py-2" />
          <button className="bg-primary text-onPrimary rounded-xl px-4 py-2">Добавить работу</button>
        </form>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {items.map((item) => (
            <div key={item.id} className="bg-card border border-outline rounded-2xl overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.url} alt={item.caption ?? ""} className="w-full h-32 object-cover" />
              <button type="button" className="text-error text-sm p-2" onClick={() => remove(item.id)}>
                Удалить
              </button>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
