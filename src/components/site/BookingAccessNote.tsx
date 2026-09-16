"use client";

import { useBooking } from "@/components/BookingProvider";
import { withReturnTo } from "@/lib/safe-path";
import { usePathname } from "next/navigation";

export function BookingAccessNote() {
  const { access } = useBooking();
  const pathname = usePathname();
  if (access.status === "ready") return null;
  if (access.status === "wrong-role") {
    return (
      <p className="text-sm text-onSurfaceVariant bg-surfaceVariant/60 border border-outline rounded-2xl px-4 py-3">
        Онлайн-запись доступна только клиентскому аккаунту.
      </p>
    );
  }
  return (
    <p className="text-sm text-onSurfaceVariant bg-surfaceVariant/60 border border-outline rounded-2xl px-4 py-3">
      Чтобы записаться,{" "}
      <a href={withReturnTo("/login", pathname)} className="text-primary font-semibold hover:underline">
        войдите
      </a>{" "}
      или{" "}
      <a href={withReturnTo("/register", pathname)} className="text-primary font-semibold hover:underline">
        зарегистрируйтесь
      </a>
      . Без аккаунта запись недоступна.
    </p>
  );
}
