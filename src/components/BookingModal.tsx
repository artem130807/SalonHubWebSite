"use client";

import { useCallback, useEffect, useMemo, useState, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Clock, Heart, Star, X } from "lucide-react";
import { apiFetch } from "@/lib/client-api";

type Salon = { id: string; name: string; address: string; availableStartsToday: number };
type Master = {
  id: string;
  userName: string;
  specialization: string | null;
  rating?: number;
  ratingCount?: number;
  avatarUrl?: string | null;
};
type Service = { id: string; name: string; durationMinutes: number; price: number; description?: string | null };
type Slot = { timeSlotId: string; startTime: string; endTime: string; date: string };
type Step = "salon" | "master" | "service" | "time";

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MONTHS = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
const MONTHS_FULL = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toDateOnly(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfWeek(date: Date) {
  const copy = startOfDay(date);
  const offset = copy.getDay() === 0 ? 6 : copy.getDay() - 1;
  copy.setDate(copy.getDate() - offset);
  return copy;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function formatClock(value: string) {
  const parts = value.split(":");
  if (parts.length >= 2) return `${parts[0]?.padStart(2, "0")}:${parts[1]?.padStart(2, "0")}`;
  return value;
}

function formatHumanDate(value: string) {
  const date = parseDateOnly(value);
  return `${date.getDate()} ${MONTHS_FULL[date.getMonth()]}`;
}

function weekLabel(weekStart: Date) {
  const weekEnd = addDays(weekStart, 6);
  return `${weekStart.getDate()} ${MONTHS[weekStart.getMonth()]} — ${weekEnd.getDate()} ${MONTHS[weekEnd.getMonth()]} ${weekEnd.getFullYear()}`;
}

function isPastDay(date: Date) {
  return startOfDay(date).getTime() < startOfDay(new Date()).getTime();
}

function isPastWeek(weekStart: Date) {
  return startOfDay(addDays(weekStart, 6)).getTime() < startOfDay(new Date()).getTime();
}

function initialStep(salonId?: string, masterId?: string): Step {
  if (masterId) return "service";
  if (salonId) return "master";
  return "salon";
}

export function BookingModal({
  dialogRef,
  initialSalons,
  selectedSalonId,
  selectedMasterId,
}: {
  dialogRef: RefObject<HTMLDialogElement | null>;
  initialSalons: Salon[];
  selectedSalonId?: string;
  selectedMasterId?: string;
}) {
  const router = useRouter();
  const today = toDateOnly(new Date());
  const [step, setStep] = useState<Step>(() => initialStep(selectedSalonId, selectedMasterId));
  const [salonId, setSalonId] = useState(selectedSalonId ?? "");
  const [masters, setMasters] = useState<Master[]>([]);
  const [masterId, setMasterId] = useState(selectedMasterId ?? "");
  const [services, setServices] = useState<Service[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState(today);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [slotsByDate, setSlotsByDate] = useState<Record<string, Slot[]>>({});
  const [startTime, setStartTime] = useState("");
  const [loadingMasters, setLoadingMasters] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [savedFavorite, setSavedFavorite] = useState(false);

  const salon = initialSalons.find((item) => item.id === salonId);
  const master = masters.find((item) => item.id === masterId);
  const service = services.find((item) => item.id === serviceId);
  const slots = slotsByDate[date] ?? [];
  const selectedSlot = slots.find((item) => item.startTime === startTime);

  const steps = useMemo(() => {
    const items: { id: Step; label: string }[] = [
      { id: "salon", label: "Салон" },
      { id: "master", label: "Мастер" },
      { id: "service", label: "Услуга" },
      { id: "time", label: "Время" },
    ];
    return selectedSalonId ? items.filter((item) => item.id !== "salon") : items;
  }, [selectedSalonId]);

  useEffect(() => {
    setSalonId(selectedSalonId ?? "");
    setMasterId(selectedMasterId ?? "");
    setStep(initialStep(selectedSalonId, selectedMasterId));
  }, [selectedSalonId, selectedMasterId]);

  useEffect(() => {
    if (!salonId) {
      setMasters([]);
      return;
    }
    let cancelled = false;
    setLoadingMasters(true);
    apiFetch(`/api/salons/${salonId}/masters`)
      .then((response) => response.json())
      .then((payload) => {
        if (cancelled) return;
        const list = Array.isArray(payload) ? payload : [];
        setMasters(list);
        if (selectedMasterId && list.some((item: Master) => item.id === selectedMasterId)) {
          setMasterId(selectedMasterId);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingMasters(false);
      });
    return () => {
      cancelled = true;
    };
  }, [salonId, selectedMasterId]);

  useEffect(() => {
    if (!masterId) {
      setServices([]);
      setServiceId("");
      return;
    }
    let cancelled = false;
    setLoadingServices(true);
    apiFetch(`/api/masters/${masterId}/services`)
      .then((response) => response.json())
      .then((payload) => {
        if (cancelled) return;
        setServices(Array.isArray(payload) ? payload : []);
        setServiceId("");
      })
      .finally(() => {
        if (!cancelled) setLoadingServices(false);
      });
    return () => {
      cancelled = true;
    };
  }, [masterId]);

  const loadWeek = useCallback(async (masterKey: string, duration: number, week: Date) => {
    setLoadingSlots(true);
    setError("");
    const dates = Array.from({ length: 7 }, (_, index) => toDateOnly(addDays(week, index)));
    try {
      const results = await Promise.all(
        dates.map(async (day) => {
          const response = await apiFetch(
            `/api/masters/${masterKey}/available-slots?date=${day}&durationMinutes=${duration}`,
          );
          const payload = await response.json();
          return [day, Array.isArray(payload) ? (payload as Slot[]) : []] as const;
        }),
      );
      const next: Record<string, Slot[]> = {};
      for (const [day, list] of results) next[day] = list;
      setSlotsByDate(next);
      setStartTime("");
    } catch {
      setSlotsByDate({});
      setError("Не удалось загрузить свободное время");
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  useEffect(() => {
    if (step !== "time" || !masterId || !service) return;
    void loadWeek(masterId, service.durationMinutes, weekStart);
  }, [step, masterId, service, weekStart, loadWeek]);

  function goNext() {
    setError("");
    if (step === "salon") {
      if (!salonId) return setError("Выберите салон");
      setStep("master");
      return;
    }
    if (step === "master") {
      if (!masterId) return setError("Выберите мастера");
      setStep("service");
      return;
    }
    if (step === "service") {
      if (!serviceId) return setError("Выберите услугу");
      setDate(today);
      setWeekStart(startOfWeek(new Date()));
      setStartTime("");
      setStep("time");
    }
  }

  function goBack() {
    setError("");
    if (step === "time") {
      setStep("service");
      return;
    }
    if (step === "service") {
      setStep("master");
      return;
    }
    if (step === "master" && !selectedSalonId) setStep("salon");
  }

  function selectDay(next: Date) {
    if (isPastDay(next)) return;
    setDate(toDateOnly(next));
    setStartTime("");
  }

  function shiftWeek(days: number) {
    const next = addDays(weekStart, days);
    if (days < 0 && isPastWeek(next)) return;
    const todayDate = startOfDay(new Date());
    const weekEnd = addDays(next, 6);
    const staysInWeek = todayDate >= next && todayDate <= weekEnd;
    setWeekStart(next);
    setDate(toDateOnly(staysInWeek ? todayDate : next < todayDate ? todayDate : next));
    setStartTime("");
  }

  async function saveFavorite() {
    if (!masterId) return;
    const response = await apiFetch("/api/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ masterId }),
    });
    if (response.ok) setSavedFavorite(true);
  }

  async function confirmBooking() {
    setError("");
    if (!salonId || !masterId || !service || !selectedSlot) {
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
        timeSlotId: selectedSlot.timeSlotId,
        startTime: selectedSlot.startTime,
        appointmentDate: date,
      }),
    });
    const payload = await response.json().catch(() => ({}));
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

  const canContinue =
    (step === "salon" && Boolean(salonId)) ||
    (step === "master" && Boolean(masterId)) ||
    (step === "service" && Boolean(serviceId)) ||
    (step === "time" && Boolean(selectedSlot));

  return (
    <dialog
      ref={dialogRef}
      className="bg-transparent p-0 m-auto max-w-none border-0 backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      <div className="bg-surface border border-outline rounded-[2rem] w-[95vw] max-w-2xl max-h-[92vh] shadow-2xl overflow-hidden text-onBackground flex flex-col">
        <div className="flex justify-between items-center px-6 py-5 border-b border-outline/50">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold">Онлайн-запись</p>
            <h2 className="text-2xl font-bold font-serif mt-1">{titleForStep(step)}</h2>
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

        <ol
          className="grid gap-2 px-6 pt-5"
          style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
        >
          {steps.map((item, index) => {
            const active = step === item.id;
            const done = stepIndex(step) > stepIndex(item.id);
            return (
              <li key={item.id} className="flex flex-col gap-1 min-w-0">
                <span className={`h-1.5 rounded-full ${active || done ? "bg-primary" : "bg-outline"}`} />
                <span className={`text-[11px] truncate ${active ? "text-primary font-semibold" : "text-onSurfaceVariant"}`}>
                  {index + 1}. {item.label}
                </span>
              </li>
            );
          })}
        </ol>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && <p className="text-sm font-medium text-error bg-error/10 px-4 py-3 rounded-xl">{error}</p>}

          {step === "salon" && (
            <div className="space-y-3">
              {initialSalons.length === 0 ? (
                <p className="text-onSurfaceVariant text-center py-8">Салоны пока не добавлены</p>
              ) : (
                initialSalons.map((item) => (
                  <ChoiceCard
                    key={item.id}
                    selected={salonId === item.id}
                    onClick={() => {
                      setSalonId(item.id);
                      setMasterId("");
                      setServiceId("");
                    }}
                    title={item.name}
                    subtitle={item.address}
                    meta={
                      item.availableStartsToday > 0
                        ? `${item.availableStartsToday} окон сегодня`
                        : "На сегодня окон нет"
                    }
                  />
                ))
              )}
            </div>
          )}

          {step === "master" && (
            <div className="space-y-3">
              {loadingMasters ? (
                <p className="text-onSurfaceVariant text-center py-8">Загрузка мастеров...</p>
              ) : masters.length === 0 ? (
                <p className="text-onSurfaceVariant text-center py-8">В салоне пока нет мастеров</p>
              ) : (
                masters.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setMasterId(item.id);
                      setSavedFavorite(false);
                    }}
                    className={`w-full text-left rounded-3xl border p-4 flex items-center gap-4 transition-all ${
                      masterId === item.id
                        ? "border-primary bg-primary/10"
                        : "border-outline bg-background hover:border-primary/50"
                    }`}
                  >
                    <div className="w-14 h-14 rounded-full bg-primary/15 overflow-hidden shrink-0 flex items-center justify-center text-primary font-serif text-2xl font-bold">
                      {item.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        item.userName.slice(0, 1)
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold truncate">{item.userName}</p>
                      <p className="text-sm text-onSurfaceVariant">{item.specialization || "Мастер"}</p>
                      {item.rating != null && (
                        <p className="text-sm text-primary mt-1 inline-flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-primary" />
                          {item.rating.toFixed(1)}
                        </p>
                      )}
                    </div>
                    {masterId === item.id && <Check className="w-5 h-5 text-primary shrink-0" />}
                  </button>
                ))
              )}
              {masterId && (
                <button
                  type="button"
                  className="text-sm font-medium text-primary inline-flex items-center gap-1.5"
                  onClick={() => void saveFavorite()}
                >
                  <Heart className={`w-4 h-4 ${savedFavorite ? "fill-primary" : ""}`} />
                  {savedFavorite ? "Мастер в избранном" : "Добавить мастера в избранное"}
                </button>
              )}
            </div>
          )}

          {step === "service" && (
            <div className="space-y-3">
              {loadingServices ? (
                <p className="text-onSurfaceVariant text-center py-8">Загрузка услуг...</p>
              ) : services.length === 0 ? (
                <p className="text-onSurfaceVariant text-center py-8">У мастера нет услуг для записи</p>
              ) : (
                services.map((item) => (
                  <ChoiceCard
                    key={item.id}
                    selected={serviceId === item.id}
                    onClick={() => setServiceId(item.id)}
                    title={item.name}
                    subtitle={item.description || `${item.durationMinutes} мин`}
                    meta={`${item.durationMinutes} мин · ${item.price} ₽`}
                  />
                ))
              )}
            </div>
          )}

          {step === "time" && service && (
            <div className="space-y-5">
              <div className="rounded-3xl border border-outline bg-background p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    className="p-2 rounded-full hover:bg-surfaceVariant disabled:opacity-30"
                    onClick={() => shiftWeek(-7)}
                    disabled={isPastWeek(addDays(weekStart, -7))}
                    aria-label="Предыдущая неделя"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <p className="font-semibold text-sm sm:text-base">{weekLabel(weekStart)}</p>
                  <button
                    type="button"
                    className="p-2 rounded-full hover:bg-surfaceVariant"
                    onClick={() => shiftWeek(7)}
                    aria-label="Следующая неделя"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {Array.from({ length: 7 }, (_, index) => {
                    const day = addDays(weekStart, index);
                    const key = toDateOnly(day);
                    const selected = key === date;
                    const past = isPastDay(day);
                    const hasSlots = (slotsByDate[key] ?? []).length > 0;
                    return (
                      <button
                        key={key}
                        type="button"
                        disabled={past}
                        onClick={() => selectDay(day)}
                        className={`rounded-2xl py-2.5 flex flex-col items-center gap-0.5 transition-colors ${
                          selected
                            ? "bg-primary text-onPrimary"
                            : past
                              ? "text-onSurfaceVariant/40"
                              : "hover:bg-surfaceVariant"
                        }`}
                      >
                        <span className="text-[11px] font-medium">{WEEKDAYS[index]}</span>
                        <span className="text-base font-bold">{day.getDate()}</span>
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            hasSlots ? (selected ? "bg-onPrimary" : "bg-primary") : "bg-transparent"
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-onSurfaceVariant mb-3 inline-flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  Свободное время на {formatHumanDate(date)}
                </p>
                {loadingSlots ? (
                  <p className="text-onSurfaceVariant text-center py-8">Загрузка слотов...</p>
                ) : slots.length === 0 ? (
                  <p className="text-onSurfaceVariant text-center py-8 bg-background rounded-3xl border border-outline">
                    На этот день нет свободного времени
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {slots.map((slot) => {
                      const selected = startTime === slot.startTime;
                      return (
                        <button
                          key={`${slot.timeSlotId}-${slot.startTime}`}
                          type="button"
                          onClick={() => setStartTime(slot.startTime)}
                          className={`rounded-2xl py-3 text-sm font-semibold border transition-colors ${
                            selected
                              ? "bg-primary text-onPrimary border-primary"
                              : "bg-background border-outline hover:border-primary hover:text-primary"
                          }`}
                        >
                          {formatClock(slot.startTime)}–{formatClock(slot.endTime)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {selectedSlot && salon && master && (
                <div className="rounded-3xl border border-primary/30 bg-primary/5 p-4 text-sm space-y-1">
                  <p className="font-bold text-base">Проверьте запись</p>
                  <p>{salon.name}</p>
                  <p className="text-onSurfaceVariant">
                    {master.userName} · {service.name} · {service.durationMinutes} мин
                  </p>
                  <p className="text-primary font-semibold">
                    {formatHumanDate(date)}, {formatClock(selectedSlot.startTime)}–{formatClock(selectedSlot.endTime)} · {service.price} ₽
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-outline/50 flex gap-3">
          {step !== "salon" && !(step === "master" && selectedSalonId) && (
            <button
              type="button"
              onClick={goBack}
              className="px-5 py-3 rounded-2xl border border-outline font-semibold hover:border-primary hover:text-primary"
            >
              Назад
            </button>
          )}
          {step !== "time" ? (
            <button
              type="button"
              disabled={!canContinue}
              onClick={goNext}
              className="flex-1 bg-primary text-onPrimary font-bold py-3.5 rounded-2xl hover:bg-primaryVariant disabled:opacity-50"
            >
              Далее
            </button>
          ) : (
            <button
              type="button"
              disabled={!canContinue || pending}
              onClick={() => void confirmBooking()}
              className="flex-1 bg-primary text-onPrimary font-bold py-3.5 rounded-2xl hover:bg-primaryVariant disabled:opacity-50"
            >
              {pending ? "Оформление записи..." : "Записаться"}
            </button>
          )}
        </div>
      </div>
    </dialog>
  );
}

function titleForStep(step: Step) {
  if (step === "salon") return "Выберите салон";
  if (step === "master") return "Выберите мастера";
  if (step === "service") return "Выберите услугу";
  return "Выберите время";
}

function stepIndex(step: Step) {
  return { salon: 0, master: 1, service: 2, time: 3 }[step];
}

function ChoiceCard({
  selected,
  onClick,
  title,
  subtitle,
  meta,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  subtitle?: string;
  meta?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-3xl border p-4 transition-all ${
        selected ? "border-primary bg-primary/10" : "border-outline bg-background hover:border-primary/50"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold">{title}</p>
          {subtitle && <p className="text-sm text-onSurfaceVariant mt-1">{subtitle}</p>}
          {meta && <p className="text-sm text-primary font-medium mt-2">{meta}</p>}
        </div>
        {selected ? <Check className="w-5 h-5 text-primary shrink-0" /> : null}
      </div>
    </button>
  );
}
