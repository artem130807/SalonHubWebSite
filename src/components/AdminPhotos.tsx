"use client";

import { useEffect, useState, type FormEvent } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PhotoCarousel } from "@/components/site/PhotoCarousel";
import { apiFetch } from "@/lib/client-api";

type Photo = { id: string; url: string };

export function AdminPhotos({ name, salonId }: { name: string; salonId: string }) {
  const [items, setItems] = useState<Photo[]>([]);
  const [error, setError] = useState("");

  async function load() {
    const response = await apiFetch(`/api/photos/${salonId}`);
    const payload = await response.json();
    if (response.ok) setItems(payload);
  }

  useEffect(() => {
    void load();
  }, [salonId]);

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const file = (event.currentTarget.elements.namedItem("file") as HTMLInputElement).files?.[0];
    if (!file) return;
    const form = new FormData();
    form.set("file", file);
    const uploaded = await apiFetch("/api/media/upload", { method: "POST", body: form });
    const media = await uploaded.json();
    if (!uploaded.ok) {
      setError(media.error ?? "Не удалось загрузить файл");
      return;
    }
    const created = await apiFetch(`/api/photos/${salonId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: media.url }),
    });
    const payload = await created.json().catch(() => ({}));
    if (!created.ok) setError(payload.error ?? "Не удалось сохранить фото");
    else await load();
  }

  async function remove(id: string) {
    await apiFetch(`/api/photos/item/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <DashboardLayout role="admin" name={name}>
      <div className="max-w-3xl space-y-6">
        <h1 className="text-3xl font-serif font-bold">Фото салона</h1>
        <p className="text-onSurfaceVariant">Эти снимки видят клиенты на странице салона. Можно листать каруселью.</p>
        {error && <p className="text-error text-sm">{error}</p>}
        <PhotoCarousel photos={items} alt="Фото салона" className="h-72" showThumbs emptyLabel="Пока нет фото салона" />
        <form onSubmit={upload} className="flex gap-3">
          <input name="file" type="file" accept="image/*" required />
          <button className="bg-primary text-onPrimary rounded-xl px-4 py-2">Загрузить</button>
        </form>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {items.map((item) => (
            <div key={item.id} className="bg-card border border-outline rounded-2xl overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.url} alt="" className="w-full h-32 object-cover" />
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
