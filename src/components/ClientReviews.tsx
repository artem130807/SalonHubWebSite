"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client-api";

type Review = {
  id: string;
  salonName?: string;
  masterName?: string;
  salonRating: number;
  masterRating: number;
  comment: string | null;
};

type Awaiting = { id: string; salonName: string; masterName: string; serviceName: string };

export function ClientReviews({ name }: { name: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [awaiting, setAwaiting] = useState<Awaiting[]>([]);
  const [error, setError] = useState("");

  async function load() {
    const [mine, wait] = await Promise.all([
      apiFetch("/api/reviews"),
      apiFetch("/api/appointments/awaiting-review"),
    ]);
    const reviewsPayload = await mine.json();
    const waitPayload = await wait.json();
    if (mine.ok) setReviews(reviewsPayload);
    if (wait.ok) setAwaiting(waitPayload);
  }

  useEffect(() => {
    void load();
  }, []);

  async function create(appointmentId: string, form: FormData) {
    setError("");
    const response = await apiFetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appointmentId,
        salonRating: Number(form.get("salonRating")),
        masterRating: Number(form.get("masterRating")),
        comment: form.get("comment"),
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(payload.error ?? "Не удалось сохранить отзыв");
      return;
    }
    await load();
  }

  async function remove(id: string) {
    await apiFetch(`/api/reviews/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold mb-2">Отзывы</h1>
        <p className="text-lg text-onSurfaceVariant">{name}</p>
      </div>
      {error && <p className="text-sm font-medium text-error bg-error/10 px-4 py-3 rounded-xl">{error}</p>}
      
      {awaiting.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-serif font-bold">Ожидают оценки</h2>
          {awaiting.map((item) => (
            <form
              key={item.id}
              className="bg-surface border border-outline rounded-3xl p-6 shadow-sm space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void create(item.id, new FormData(event.currentTarget));
              }}
            >
              <p className="font-bold text-lg">
                {item.salonName} <span className="mx-1.5 opacity-50 text-onSurfaceVariant">•</span> {item.masterName} <span className="mx-1.5 opacity-50 text-onSurfaceVariant">•</span> {item.serviceName}
              </p>
              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm font-medium space-y-1.5">
                  <span className="text-onSurfaceVariant">Оценка салона</span>
                  <input name="salonRating" type="number" min={1} max={5} defaultValue={5} className="w-full bg-background border border-outline rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all" />
                </label>
                <label className="text-sm font-medium space-y-1.5">
                  <span className="text-onSurfaceVariant">Оценка мастера</span>
                  <input name="masterRating" type="number" min={1} max={5} defaultValue={5} className="w-full bg-background border border-outline rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all" />
                </label>
              </div>
              <textarea name="comment" placeholder="Ваш комментарий..." className="w-full bg-background border border-outline rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all min-h-[100px] resize-y" />
              <button className="bg-primary text-onPrimary font-bold rounded-xl px-6 py-3 hover:bg-primaryVariant transition-colors shadow-sm">Оставить отзыв</button>
            </form>
          ))}
        </div>
      )}

      {reviews.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-serif font-bold">Мои отзывы</h2>
          {reviews.map((review) => (
            <div key={review.id} className="bg-surface border border-outline rounded-3xl p-6 shadow-sm">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <p className="font-bold text-lg mb-2">
                    {review.salonName} <span className="mx-1.5 opacity-50 text-onSurfaceVariant">•</span> {review.masterName}
                  </p>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center gap-1.5 bg-primary/10 px-3 py-1 rounded-xl">
                      <span className="text-sm font-medium text-primary">Салон</span>
                      <span className="text-sm font-bold text-primary">{review.salonRating}/5</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-surfaceVariant px-3 py-1 rounded-xl">
                      <span className="text-sm font-medium text-onSurface">Мастер</span>
                      <span className="text-sm font-bold text-onSurface">{review.masterRating}/5</span>
                    </div>
                  </div>
                  {review.comment && <p className="text-onSurface leading-relaxed">{review.comment}</p>}
                </div>
                <button type="button" className="px-4 py-2 rounded-xl text-sm font-bold bg-error/10 text-error hover:bg-error hover:text-white transition-colors shrink-0" onClick={() => remove(review.id)}>
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {reviews.length === 0 && awaiting.length === 0 && (
        <div className="bg-surface/50 border border-outline/50 rounded-3xl p-8 text-center">
          <p className="text-lg text-onSurfaceVariant">У вас пока нет отзывов.</p>
        </div>
      )}
    </div>
  );
}
