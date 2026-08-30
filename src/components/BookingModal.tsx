"use client";

import type { RefObject, FormEvent } from "react";
import { X, User, Scissors, Phone } from "lucide-react";

type BookingModalProps = {
  dialogRef: RefObject<HTMLDialogElement | null>;
};

export function BookingModal({ dialogRef }: BookingModalProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    alert("Заявка отправлена! (демо)");
    dialogRef.current?.close();
  }

  return (
    <dialog
      ref={dialogRef}
      className="bg-transparent p-0 m-auto fixed inset-0 max-w-full max-h-full backdrop:bg-black/80 open:flex open:items-center open:justify-center"
    >
      <div className="bg-surface border border-outline rounded-2xl w-[95vw] max-w-lg shadow-2xl overflow-hidden text-onBackground">
        <div className="flex justify-between items-center p-6 border-b border-outline bg-surfaceVariant/30">
          <h2 className="text-xl font-bold font-serif">Оформление записи</h2>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="text-onSurfaceVariant hover:text-primary transition-colors bg-surface p-2 rounded-full border border-outline"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm text-onSurfaceVariant mb-6">
            Оставьте заявку, и мы подберем для вас лучшее время в выбранном салоне или предложим ближайшее свободное заведение.
          </p>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-onSurface">
                Ваше имя
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-onSurfaceVariant">
                  <User className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="Иван Иванов"
                  className="w-full bg-surfaceVariant border border-outline text-onBackground rounded-xl pl-10 pr-4 py-3 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-onSurfaceVariant"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-onSurface">
                Телефон
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-onSurfaceVariant">
                  <Phone className="w-5 h-5" />
                </div>
                <input
                  type="tel"
                  required
                  placeholder="+7 (___) ___-__-__"
                  className="w-full bg-surfaceVariant border border-outline text-onBackground rounded-xl pl-10 pr-4 py-3 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-onSurfaceVariant"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-onSurface">
                Предпочитаемый салон
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-onSurfaceVariant">
                  <Scissors className="w-5 h-5" />
                </div>
                <select className="w-full bg-surfaceVariant border border-outline text-onBackground rounded-xl pl-10 pr-4 py-3 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all appearance-none">
                  <option value="">Без предпочтений</option>
                  <option value="loreal">Студия красоты L'Oreal</option>
                  <option value="lokon">Парикмахерская Локон</option>
                  <option value="oldboy">OldBoy Barbershop</option>
                </select>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                className="w-full bg-primary text-onPrimary font-bold py-3.5 rounded-xl hover:bg-primaryVariant transition-colors shadow-[0_4px_14px_rgba(212,175,55,0.2)]"
              >
                Оставить заявку
              </button>
            </div>

            <p className="text-xs text-onSurfaceVariant text-center mt-4">
              Нажимая кнопку, вы соглашаетесь с политикой конфиденциальности.
            </p>
          </form>
        </div>
      </div>
    </dialog>
  );
}
