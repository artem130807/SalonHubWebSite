"use client";

import { useEffect, useState, type FormEvent, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { apiFetch } from "@/lib/client-api";

type Salon = { id: string; name: string; address: string; availableStartsToday: number };
type Master = { id: string; userName: string; specialization: string | null };
type Service = { id: string; name: string; durationMinutes: number; price: number };
type Slot = { timeSlotId: string; startTime: string; endTime: string; date: string };

export function BookingModal({
  dialogRef,
  initialSalons,
  selectedSalonId,
}: {
  dialogRef: RefObject<HTMLDialogElement | null>;
  initialSalons: Salon[];
  selectedSalonId?: string;
}) {
  const router = useRouter();
  const salons = initialSalons;
  const [salonId, setSalonId] = useState(selectedSalonId ?? "");
  const [masters, setMasters] = useState<Master[]>([]);
  const [masterId, setMasterId] = useState("");
  const [services, setServices] = useState<Service[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [startTime, setStartTime] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setSalonId(selectedSalonId ?? "");
  }, [selectedSalonId]);

  useEffect(() => {
    if (!salonId) return;
    apiFetch(`/api/salons/${salonId}/masters`)
      .then((r) => r.json())
      .then((m) => {
        setMasters(Array.isArray(m) ? m : []);
        setMasterId("");
        setServiceId("");
        setServices([]);
        setSlots([]);
      });
  }, [salonId]);

  useEffect(() => {
    if (!masterId) {
      setServices([]);
      setServiceId("");
      return;
    }
    apiFetch(`/api/masters/${masterId}/services`)
      .then((r) => r.json())
      .then((s) => {
        setServices(Array.isArray(s) ? s : []);
        setServiceId("");
        setSlots([]);
      });
  }, [masterId]);

  useEffect(() => {
    const service = services.find((s) => s.id === serviceId);
    if (!masterId || !service || !date) {
      setSlots([]);
      return;
    }
    apiFetch(
      `/api/masters/${masterId}/available-slots?date=${date}&durationMinutes=${service.durationMinutes}`,
    )
      .then((r) => r.json())
      .then((data) => {
        setSlots(Array.isArray(data) ? data : []);
        setStartTime("");
      });
  }, [masterId, serviceId, date, services]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const service = services.find((s) => s.id === serviceId);
    const slot = slots.find((s) => s.startTime === startTime);
    if (!salonId || !masterId || !service || !slot) {
      setError("Выберите салон, мастера, услугу и время");
      return;
    }
    setPending(true);
    const response = await apiFetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        salonId,
        masterId,
        serviceId,
        timeSlotId: slot.timeSlotId,
        startTime: slot.startTime,
        appointmentDate: date,
      }),
    });
    const payload = await response.json();
    setPending(false);
    if (!response.ok) {
      if (response.status === 401) {
        router.push("/login?from=/");
        return;
      }
      setError(payload.error ?? "Не удалось создать запись");
      return;
    }
    dialogRef.current?.close();
    router.push("/account");
    router.refresh();
  }

  return (
    <dialog
      ref={dialogRef}
      className="bg-transparent p-0 m-auto max-w-none border-0 backdrop:bg-black/60 backdrop:backdrop-blur-sm transition-all duration-300 open:animate-in open:fade-in open:zoom-in-95"
    >
      <div className="bg-surface border border-outline rounded-3xl w-[95vw] max-w-lg shadow-2xl overflow-hidden text-onBackground">
        <div className="flex justify-between items-center p-6 sm:px-8 sm:py-6 border-b border-outline/50 bg-surface/50">
          <h2 className="text-2xl font-bold font-serif">Онлайн-запись</h2>
          <button type="button" onClick={() => dialogRef.current?.close()} className="p-2 rounded-full border border-outline hover:bg-surfaceVariant hover:text-primary transition-colors" aria-label="Закрыть">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form className="p-6 sm:p-8 space-y-5" onSubmit={onSubmit}>
          {error && <p className="text-sm font-medium text-error bg-error/10 px-4 py-3 rounded-xl">{error}</p>}
          
          <label className="block space-y-2 text-sm font-medium">
            <span className="text-onSurfaceVariant">Салон</span>
            <select value={salonId} onChange={(e) => setSalonId(e.target.value)} required className="w-full bg-background border border-outline rounded-xl px-4 py-3.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all">
              <option value="">Выберите салон</option>
              {salons.map((salon) => (
                <option key={salon.id} value={salon.id}>
                  {salon.name} · {salon.availableStartsToday} окон сегодня
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-2 text-sm font-medium">
            <span className="text-onSurfaceVariant">Мастер</span>
            <select value={masterId} onChange={(e) => setMasterId(e.target.value)} required className="w-full bg-background border border-outline rounded-xl px-4 py-3.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all">
              <option value="">Выберите мастера</option>
              {masters.map((master) => (
                <option key={master.id} value={master.id}>
                  {master.userName}
                </option>
              ))}
            </select>
          </label>

          {masterId && (
            <button
              type="button"
              className="text-sm font-medium text-primary hover:text-primaryVariant transition-colors flex items-center gap-1.5"
              onClick={async () => {
                await apiFetch("/api/subscriptions", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ masterId }),
                });
              }}
            >
              + Добавить мастера в избранное
            </button>
          )}

          <label className="block space-y-2 text-sm font-medium">
            <span className="text-onSurfaceVariant">Услуга</span>
            <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} required className="w-full bg-background border border-outline rounded-xl px-4 py-3.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all">
              <option value="">Выберите услугу</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} · {service.durationMinutes} мин · {service.price} ₽
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block space-y-2 text-sm font-medium">
              <span className="text-onSurfaceVariant">Дата</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="w-full bg-background border border-outline rounded-xl px-4 py-3.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all" />
            </label>
            <label className="block space-y-2 text-sm font-medium">
              <span className="text-onSurfaceVariant">Время</span>
              <select value={startTime} onChange={(e) => setStartTime(e.target.value)} required className="w-full bg-background border border-outline rounded-xl px-4 py-3.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all">
                <option value="">Нет слотов</option>
                {slots.map((slot) => (
                  <option key={`${slot.timeSlotId}-${slot.startTime}`} value={slot.startTime}>
                    {slot.startTime}–{slot.endTime}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="pt-4">
            <button type="submit" disabled={pending} className="w-full bg-primary text-onPrimary font-bold py-4 rounded-2xl hover:bg-primaryVariant transition-colors shadow-[0_0_15px_rgba(212,175,55,0.2)] hover:shadow-[0_0_25px_rgba(212,175,55,0.4)] disabled:opacity-70 disabled:shadow-none">
              {pending ? "Оформление записи..." : "Подтвердить запись"}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
