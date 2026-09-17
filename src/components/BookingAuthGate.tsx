"use client";

import { usePathname } from "next/navigation";
import { LogIn, UserPlus, X } from "lucide-react";
import type { RefObject } from "react";
import type { BookingAccess } from "@/lib/booking-access";
import { withReturnTo } from "@/lib/safe-path";

export function BookingAuthGate({
  dialogRef,
  access,
}: {
  dialogRef: RefObject<HTMLDialogElement | null>;
  access: BookingAccess;
}) {
  const pathname = usePathname();
  const from = pathname || "/";
  const guest = access.status === "guest";

  return (
    <dialog
      ref={dialogRef}
      className="bg-transparent p-0 m-auto max-md:m-0 max-w-none w-full md:w-auto h-dvh md:h-auto border-0 backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      <div className="bg-surface md:bg-surface h-full md:h-auto w-full md:w-[95vw] max-w-md md:border md:border-outline md:rounded-[2rem] shadow-2xl overflow-hidden text-onBackground flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-between items-start px-4 sm:px-6 py-4 sm:py-5 border-b border-outline/50">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold">Онлайн-запись</p>
            <h2 className="text-xl sm:text-2xl font-bold font-serif mt-1">
              {guest ? "Сначала войдите в аккаунт" : "Нужен аккаунт клиента"}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="p-2 rounded-full border border-outline hover:bg-surfaceVariant hover:text-primary transition-colors"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-4 sm:px-6 py-5 space-y-5 flex-1">
          <p className="text-onSurfaceVariant leading-relaxed">
            {guest
              ? "Записаться можно только после входа. Если аккаунта ещё нет — зарегистрируйтесь, это займёт минуту."
              : "Онлайн-запись доступна только клиентскому аккаунту. Войдите как клиент или создайте отдельный аккаунт."}
          </p>
          <div className="grid gap-3">
            <a
              href={withReturnTo("/login", from)}
              className="inline-flex items-center justify-center gap-2 bg-primary text-onPrimary font-bold py-3.5 rounded-2xl hover:bg-primaryVariant"
            >
              <LogIn className="w-4 h-4" />
              Войти
            </a>
            {guest && (
              <a
                href={withReturnTo("/register", from)}
                className="inline-flex items-center justify-center gap-2 border border-outline font-bold py-3.5 rounded-2xl hover:border-primary hover:text-primary"
              >
                <UserPlus className="w-4 h-4" />
                Зарегистрироваться
              </a>
            )}
          </div>
        </div>
      </div>
    </dialog>
  );
}
