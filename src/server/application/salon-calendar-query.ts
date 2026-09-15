import { err, ok } from "@/server/domain/result";
import { dateOnly } from "@/server/domain/scheduling";
import type { MasterProfile, Service } from "@/server/domain/types";
import {
  activeAppointments,
  activeWindows,
  appointmentDateOnly,
  buildPublicDaySchedule,
  previewDurationMinutes,
  resolvePublicCalendarMonth,
  utcRangeForCalendar,
  type PublicCalendarDay,
} from "@/server/application/public-calendar";
import type {
  IAppointmentRepository,
  IClock,
  IMasterProfileRepository,
  IMasterServiceRepository,
  IMasterTimeSlotRepository,
  ISalonRepository,
  IServiceRepository,
} from "@/server/application/ports";

export type PublicSalonCalendarMaster = {
  id: string;
  userName: string;
  specialization: string | null;
  avatarUrl: string | null;
  rating: number;
};

export type PublicSalonCalendarMasterDay = PublicCalendarDay & {
  masterId: string;
};

export type PublicSalonCalendarDay = {
  date: string;
  workingMasterCount: number;
  freeMasterCount: number;
  freeStartCount: number;
  masters: PublicSalonCalendarMasterDay[];
};

export type PublicSalonCalendar = {
  month: string;
  from: string;
  to: string;
  today: string;
  previewDurationMinutes: number;
  minMonth: string;
  maxMonth: string;
  masters: PublicSalonCalendarMaster[];
  days: PublicSalonCalendarDay[];
};

export class PublicSalonScheduleService {
  constructor(
    private readonly salons: ISalonRepository,
    private readonly masters: IMasterProfileRepository,
    private readonly services: IServiceRepository,
    private readonly masterServices: IMasterServiceRepository,
    private readonly timeSlots: IMasterTimeSlotRepository,
    private readonly appointments: IAppointmentRepository,
    private readonly clock: IClock,
  ) {}

  async getCalendar(salonId: string, month?: string | null) {
    const salon = await this.salons.getById(salonId);
    if (!salon) return err("Салон не найден");

    const meta = resolvePublicCalendarMonth(dateOnly(this.clock.utcNow()), month);
    if (!meta.ok) return meta;

    const [roster, salonServices, slots, appointments] = await Promise.all([
      this.masters.getBySalonId(salonId),
      this.services.getBySalonId(salonId, true),
      this.timeSlots.getBySalonAndDateRange(salonId, meta.value.from, meta.value.to),
      this.appointments.list({
        salonId,
        from: utcRangeForCalendar(meta.value.from, meta.value.to).from,
        to: utcRangeForCalendar(meta.value.from, meta.value.to).to,
      }),
    ]);

    const windows = activeWindows(slots);
    const liveAppointments = activeAppointments(appointments);
    const servicesByMaster = new Map<string, Service[]>();
    await Promise.all(
      roster.map(async (master) => {
        servicesByMaster.set(master.id, await this.masterServices.getServicesForMaster(master.id));
      }),
    );
    const salonDuration = previewDurationMinutes(salonServices);

    const windowsByMasterDate = new Map<string, Map<string, typeof windows>>();
    for (const window of windows) {
      const byDate = windowsByMasterDate.get(window.masterId) ?? new Map();
      const list = byDate.get(window.scheduleDate) ?? [];
      list.push(window);
      byDate.set(window.scheduleDate, list);
      windowsByMasterDate.set(window.masterId, byDate);
    }

    const appointmentsByMasterDate = new Map<string, Map<string, typeof liveAppointments>>();
    for (const appointment of liveAppointments) {
      const date = appointmentDateOnly(appointment);
      const byDate = appointmentsByMasterDate.get(appointment.masterId) ?? new Map();
      const list = byDate.get(date) ?? [];
      list.push(appointment);
      byDate.set(date, list);
      appointmentsByMasterDate.set(appointment.masterId, byDate);
    }

    const daysByDate = new Map<string, PublicSalonCalendarMasterDay[]>();
    for (const master of roster) {
      const masterServicesList = servicesByMaster.get(master.id) ?? [];
      const duration = masterServicesList.length ? previewDurationMinutes(masterServicesList) : salonDuration;
      const masterWindows = windowsByMasterDate.get(master.id);
      if (!masterWindows) continue;
      for (const [date, dayWindows] of masterWindows) {
        const day = buildPublicDaySchedule(
          date,
          dayWindows,
          appointmentsByMasterDate.get(master.id)?.get(date) ?? [],
          duration,
          this.clock.utcNow(),
        );
        const list = daysByDate.get(date) ?? [];
        list.push({ ...day, masterId: master.id });
        daysByDate.set(date, list);
      }
    }

    const nameById = new Map(roster.map((master) => [master.id, master.userName]));
    const days: PublicSalonCalendarDay[] = [...daysByDate.entries()]
      .map(([date, masterDays]) => {
        const ordered = [...masterDays].sort((left, right) =>
          (nameById.get(left.masterId) ?? "").localeCompare(nameById.get(right.masterId) ?? "", "ru"),
        );
        return {
          date,
          workingMasterCount: ordered.length,
          freeMasterCount: ordered.filter((item) => item.freeStartCount > 0).length,
          freeStartCount: ordered.reduce((sum, item) => sum + item.freeStartCount, 0),
          masters: ordered,
        };
      })
      .sort((left, right) => left.date.localeCompare(right.date));

    return ok({
      ...meta.value,
      previewDurationMinutes: salonDuration,
      masters: roster
        .slice()
        .sort((left, right) => left.userName.localeCompare(right.userName, "ru"))
        .map(toPublicSalonCalendarMaster),
      days,
    } satisfies PublicSalonCalendar);
  }
}

function toPublicSalonCalendarMaster(master: MasterProfile): PublicSalonCalendarMaster {
  return {
    id: master.id,
    userName: master.userName,
    specialization: master.specialization,
    avatarUrl: master.avatarUrl ?? null,
    rating: master.rating,
  };
}
