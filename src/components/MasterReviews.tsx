"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { apiFetch } from "@/lib/client-api";

type Review = {
  id: string;
  salonRating: number;
  masterRating: number;
  comment: string | null;
  salonName?: string;
};

export function MasterReviews({ name, masterId }: { name: string; masterId: string }) {
  const [items, setItems] = useState<Review[]>([]);

  useEffect(() => {
    void apiFetch(`/api/reviews/master/${masterId}`)
      .then((r) => r.json())
      .then((payload) => {
        if (Array.isArray(payload)) setItems(payload);
      });
  }, [masterId]);

  return (
    <DashboardLayout role="barber" name={name}>
      <div className="max-w-3xl space-y-4">
        <h1 className="text-3xl font-serif font-bold">Отзывы обо мне</h1>
        {items.length === 0 && <p className="text-onSurfaceVariant">Отзывов пока нет.</p>}
        {items.map((item) => (
          <div key={item.id} className="bg-card border border-outline rounded-2xl p-5">
            <p>Мастер {item.masterRating}/5 · Салон {item.salonRating}/5</p>
            {item.comment && <p className="mt-2">{item.comment}</p>}
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
