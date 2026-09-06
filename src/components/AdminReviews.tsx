"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { apiFetch } from "@/lib/client-api";

type Review = {
  id: string;
  salonRating: number;
  masterRating: number;
  comment: string | null;
  masterName?: string;
};

export function AdminReviews({ name, salonId }: { name: string; salonId: string }) {
  const [items, setItems] = useState<Review[]>([]);
  const [low, setLow] = useState(false);

  async function load(onlyLow: boolean) {
    const url = onlyLow ? "/api/reviews/low" : `/api/reviews/salon/${salonId}`;
    const response = await apiFetch(url);
    const payload = await response.json();
    if (response.ok) setItems(payload);
  }

  useEffect(() => {
    void load(false);
  }, [salonId]);

  return (
    <DashboardLayout role="admin" name={name}>
      <div className="max-w-3xl space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-serif font-bold">Отзывы салона</h1>
          <label className="text-sm flex items-center gap-2">
            <input
              type="checkbox"
              checked={low}
              onChange={(e) => {
                setLow(e.target.checked);
                void load(e.target.checked);
              }}
            />
            Только низкие оценки
          </label>
        </div>
        {items.map((item) => (
          <div key={item.id} className="bg-card border border-outline rounded-2xl p-5">
            <p className="font-bold">{item.masterName}</p>
            <p className="text-sm text-onSurfaceVariant">
              Салон {item.salonRating}/5 · Мастер {item.masterRating}/5
            </p>
            {item.comment && <p className="mt-2">{item.comment}</p>}
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
