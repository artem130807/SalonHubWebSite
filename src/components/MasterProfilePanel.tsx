"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/DashboardLayout";
import { apiFetch } from "@/lib/client-api";

type MasterMe = {
  id: string;
  userName: string;
  specialization: string | null;
  bio: string | null;
  avatarUrl?: string | null;
};

export function MasterProfilePanel({ name, masterId }: { name: string; masterId: string }) {
  const [master, setMaster] = useState<MasterMe | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const response = await apiFetch("/api/masters/me");
    const payload = await response.json();
    if (response.ok) setMaster(payload);
    else setError(payload.error ?? "Не удалось загрузить профиль");
  }

  useEffect(() => {
    void load();
  }, []);

  async function saveAvatar(url: string | null) {
    setError("");
    setBusy(true);
    const response = await apiFetch("/api/masters/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatarUrl: url }),
    });
    const payload = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      setError(payload.error ?? "Не удалось сохранить фото");
      return;
    }
    setMaster(payload);
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const formEl = event.currentTarget;
    const file = (formEl.elements.namedItem("file") as HTMLInputElement).files?.[0];
    if (!file) return;
    setBusy(true);
    const form = new FormData();
    form.set("file", file);
    const uploaded = await apiFetch("/api/media/upload", { method: "POST", body: form });
    const media = await uploaded.json();
    if (!uploaded.ok) {
      setBusy(false);
      setError(media.error ?? "Не удалось загрузить файл");
      return;
    }
    formEl.reset();
    await saveAvatar(media.url);
  }

  const avatarUrl = master?.avatarUrl ?? null;

  return (
    <DashboardLayout role="barber" name={name}>
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="text-3xl font-serif font-bold">Профиль</h1>
          <p className="text-onSurfaceVariant mt-2">
            Фото лица увидят клиенты на вашей странице, в салоне и в списке мастеров.
          </p>
        </div>
        {error && <p className="text-error text-sm">{error}</p>}
        <div className="bg-card border border-outline rounded-2xl p-6 flex flex-col sm:flex-row items-start gap-6">
          <div className="w-32 h-32 rounded-full bg-primary/10 overflow-hidden border border-outline shrink-0 flex items-center justify-center text-primary font-serif text-5xl font-bold">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              (master?.userName ?? name).slice(0, 1)
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-4">
            <div>
              <p className="font-bold text-xl">{master?.userName ?? name}</p>
              <p className="text-sm text-onSurfaceVariant">{master?.specialization || "Мастер"}</p>
            </div>
            <form onSubmit={upload} className="flex flex-col sm:flex-row gap-3">
              <input name="file" type="file" accept="image/*" required className="flex-1" />
              <button disabled={busy} className="bg-primary text-onPrimary rounded-xl px-4 py-2 disabled:opacity-60">
                {avatarUrl ? "Заменить фото" : "Добавить фото"}
              </button>
            </form>
            {avatarUrl && (
              <button
                type="button"
                disabled={busy}
                className="text-error text-sm"
                onClick={() => void saveAvatar(null)}
              >
                Убрать фото
              </button>
            )}
            <Link href={`/masters/${masterId}`} className="inline-block text-sm font-semibold text-primary hover:underline">
              Как видят клиенты
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
