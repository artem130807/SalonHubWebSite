import { randomUUID } from "node:crypto";
import { err, ok } from "@/server/domain/result";
import type { SessionPayload } from "@/server/application/ports";
import {
  addMinutes,
  appointmentSchedulingRules,
  availableSlotCalculator,
  dateOnly,
    isValidClockTime,
    isValidDateOnly,
    normalizeClockTime,
    timeSlotCapacityRules,
  toMinutes,
} from "@/server/domain/scheduling";
import {
  AppointmentStatus,
  InboxMessageType,
  MessageAudience,
  TimeSlotStatus,
  UserRole,
  type Appointment,
  type MasterTimeSlot,
} from "@/server/domain/types";
import type {
  IAppointmentRepository,
  IClock,
  IMasterProfileRepository,
  IMasterServiceRepository,
  IMasterTimeSlotRepository,
  IServiceRepository,
  IUserRepository,
} from "@/server/application/ports";
import { InboxService, appointmentNotice } from "@/server/application/platform-services";

export class TimeSlotService {
  constructor(
    private readonly timeSlots: IMasterTimeSlotRepository,
    private readonly masters: IMasterProfileRepository,
    private readonly appointments: IAppointmentRepository,
    private readonly services: IServiceRepository,
    private readonly clock: IClock,
  ) {}

  async getMine(masterUserId: string, date: string) {
    const master = await this.masters.getByUserId(masterUserId);
    if (!master) return err("Профиль мастера не найден");
    return ok(await this.timeSlots.getByMasterAndDate(master.id, date));
  }

  async create(masterUserId: string, input: { scheduleDate: string; startTime: string; endTime: string }) {
    const master = await this.masters.getByUserId(masterUserId);
    if (!master) return err("Профиль мастера не найден");
    const startTime = normalizeClockTime(input.startTime);
    const endTime = normalizeClockTime(input.endTime);
    if (!isValidDateOnly(input.scheduleDate) || !isValidClockTime(startTime) || !isValidClockTime(endTime)) {
      return err("Некорректные дата или время смены");
    }
    if (toMinutes(endTime) <= toMinutes(startTime)) {
      return err("Окончание смены должно быть позже начала");
    }
    const existing = await this.timeSlots.getByMasterAndDate(master.id, input.scheduleDate);
    const overlaps = existing.some(
      (slot) =>
        slot.status !== TimeSlotStatus.Cancelled &&
        toMinutes(startTime) < toMinutes(slot.endTime) &&
        toMinutes(slot.startTime) < toMinutes(endTime),
    );
    if (overlaps) return err("Рабочее окно пересекается с уже существующим");
    const slot: MasterTimeSlot = {
      id: randomUUID(),
      masterId: master.id,
      scheduleDate: input.scheduleDate,
      startTime,
      endTime,
      status: TimeSlotStatus.Available,
    };
    await this.timeSlots.add(slot);
    return ok(slot);
  }

  async createRange(
    masterUserId: string,
    items: { scheduleDate: string; startTime: string; endTime: string }[],
  ) {
    const created = [];
    for (const item of items) {
      const result = await this.create(masterUserId, item);
      if (!result.ok) return result;
      created.push(result.value);
    }
    return ok(created);
  }

  async delete(masterUserId: string, timeSlotId: string) {
    const master = await this.masters.getByUserId(masterUserId);
    if (!master) return err("Профиль мастера не найден");
    const slot = await this.timeSlots.getById(timeSlotId);
    if (!slot || slot.masterId !== master.id) return err("Рабочее окно не найдено");
    const active = await this.appointments.getActiveByMasterAndDate(master.id, slot.scheduleDate);
    if (active.some((a) => a.timeSlotId === timeSlotId)) {
      return err("Нельзя удалить окно, в котором есть записи");
    }
    await this.timeSlots.delete(timeSlotId);
    return ok(undefined);
  }

  async getAvailable(masterId: string, date: string, durationMinutes: number) {
    if (!isValidDateOnly(date)) return err("Некорректная дата");
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      return err("Некорректная длительность услуги");
    }
    const slots = await this.timeSlots.getByMasterAndDate(masterId, date);
    const windows = slots.filter((s) => s.status !== TimeSlotStatus.Cancelled);
    const appointments = await this.appointments.getActiveByMasterAndDate(masterId, date);
    const busy = new Map(
      windows.map((w) => [
        w.id,
        appointments
          .filter((a) => a.timeSlotId === w.id)
          .map((a) => ({ startTime: a.startTime, endTime: a.endTime })),
      ]),
    );
    const starts = availableSlotCalculator.calculate(windows, busy, durationMinutes, this.clock.utcNow());
    return ok(
      starts.map((s) => ({
        timeSlotId: s.sourceWindowId,
        masterId: s.masterId,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
      })),
    );
  }

  async refreshBookedStatus(timeSlotId: string, date: string) {
    const slot = await this.timeSlots.getById(timeSlotId);
    if (!slot) return;
    const master = await this.masters.getById(slot.masterId);
    if (!master) return;
    const salonServices = await this.services.getBySalonId(master.salonId, true);
    const durations = salonServices.map((s) => s.durationMinutes).filter((d) => d > 0);
    const appointments = await this.appointments.getActiveByMasterAndDate(slot.masterId, date);
    const busy = appointments
      .filter((a) => a.timeSlotId === slot.id)
      .map((a) => ({ startTime: a.startTime, endTime: a.endTime }));
    const booked = timeSlotCapacityRules.isFullyBooked(slot, busy, durations, this.clock.utcNow());
    await this.timeSlots.updateStatus(slot.id, booked ? TimeSlotStatus.Booked : TimeSlotStatus.Available);
  }
}

export class AppointmentService {
  constructor(
    private readonly appointments: IAppointmentRepository,
    private readonly services: IServiceRepository,
    private readonly masterServices: IMasterServiceRepository,
    private readonly timeSlots: IMasterTimeSlotRepository,
    private readonly masters: IMasterProfileRepository,
    private readonly users: IUserRepository,
    private readonly timeSlotService: TimeSlotService,
    private readonly inbox: InboxService,
    private readonly clock: IClock,
  ) {}

  async create(
    clientId: string,
    input: {
      salonId: string;
      masterId: string;
      serviceId: string;
      timeSlotId: string;
      startTime: string;
      appointmentDate: string;
      clientNotes?: string;
    },
  ) {
    if (!clientId) return err("Пользователь не авторизован");
    const client = await this.users.getById(clientId);
    if (!client || client.role !== UserRole.Client) return err("Запись доступна только клиенту");
    const service = await this.services.getById(input.serviceId);
    if (!service || !service.isActive) return err("Услуги не существует");
    if (service.salonId !== input.salonId) return err("Услуга не принадлежит выбранному салону");
    const master = await this.masters.getById(input.masterId);
    if (!master || master.salonId !== service.salonId) {
      return err("Мастер не работает в выбранном салоне");
    }
    const masterOffers = await this.masterServices.exists(input.masterId, input.serviceId);
    const source = await this.timeSlots.getById(input.timeSlotId);
    if (!source || source.status === TimeSlotStatus.Cancelled) {
      return err("Слот недоступен или устарел. Обновите список слотов.");
    }
    const startTime = normalizeClockTime(input.startTime);
    const existing = await this.appointments.getActiveByMasterAndDate(input.masterId, input.appointmentDate);
    const validation = appointmentSchedulingRules.validate({
      requestedMasterId: input.masterId,
      windowMasterId: source.masterId,
      windowDate: source.scheduleDate,
      appointmentDate: input.appointmentDate,
      windowStart: source.startTime,
      windowEnd: source.endTime,
      startTime,
      serviceDurationMinutes: service.durationMinutes,
      masterOffersService: masterOffers,
      existing: existing
        .filter((a) => a.timeSlotId === source.id)
        .map((a) => ({ startTime: a.startTime, endTime: a.endTime })),
      utcNow: this.clock.utcNow(),
    });
    if (!validation.ok) return err(validation.error);
    const endTime = addMinutes(startTime, service.durationMinutes);
    if (!endTime) return err("Время записи выходит за пределы выбранного слота.");
    const appointmentDate = new Date(`${input.appointmentDate}T00:00:00.000Z`);
    const draft: Omit<Appointment, "salonName" | "clientName" | "masterName" | "serviceName"> = {
      id: randomUUID(),
      salonId: service.salonId,
      clientId,
      guestName: null,
      masterId: input.masterId,
      serviceId: input.serviceId,
      timeSlotId: input.timeSlotId,
      clientNotes: input.clientNotes?.trim() || null,
      status: AppointmentStatus.Confirmed,
      startTime,
      endTime,
      appointmentDate,
      price: service.price,
    };
    const created = await this.appointments.createExclusive(draft);
    if (created === "conflict") return err("Слот занят");
    await this.timeSlotService.refreshBookedStatus(draft.timeSlotId, input.appointmentDate);
    const saved = await this.getById(draft.id);
    if (saved.ok) await this.notifyCreated(saved.value, master.userId);
    return saved;
  }

  async createWalkIn(
    masterUserId: string,
    input: {
      salonId: string;
      masterId: string;
      serviceId: string;
      timeSlotId: string;
      startTime: string;
      appointmentDate: string;
      clientNotes?: string;
      clientId?: string | null;
      guestName?: string | null;
    },
  ) {
    const actor = await this.masters.getByUserId(masterUserId);
    if (!actor) return err("Профиль мастера не найден");
    if (actor.id !== input.masterId) return err("Можно записывать только к себе");
    const guestName = input.guestName?.trim() || null;
    const clientId = input.clientId?.trim() || null;
    if (!clientId && !guestName) return err("Укажите клиента или имя гостя");
    if (clientId) {
      const client = await this.users.getById(clientId);
      if (!client || client.role !== UserRole.Client) return err("Клиент не найден");
    }
    const service = await this.services.getById(input.serviceId);
    if (!service || !service.isActive) return err("Услуги не существует");
    if (service.salonId !== input.salonId || service.salonId !== actor.salonId) {
      return err("Услуга не принадлежит выбранному салону");
    }
    const masterOffers = await this.masterServices.exists(input.masterId, input.serviceId);
    const source = await this.timeSlots.getById(input.timeSlotId);
    if (!source || source.status === TimeSlotStatus.Cancelled) {
      return err("Слот недоступен или устарел. Обновите список слотов.");
    }
    const startTime = normalizeClockTime(input.startTime);
    const existing = await this.appointments.getActiveByMasterAndDate(input.masterId, input.appointmentDate);
    const validation = appointmentSchedulingRules.validate({
      requestedMasterId: input.masterId,
      windowMasterId: source.masterId,
      windowDate: source.scheduleDate,
      appointmentDate: input.appointmentDate,
      windowStart: source.startTime,
      windowEnd: source.endTime,
      startTime,
      serviceDurationMinutes: service.durationMinutes,
      masterOffersService: masterOffers,
      existing: existing
        .filter((a) => a.timeSlotId === source.id)
        .map((a) => ({ startTime: a.startTime, endTime: a.endTime })),
      utcNow: this.clock.utcNow(),
    });
    if (!validation.ok) return err(validation.error);
    const endTime = addMinutes(startTime, service.durationMinutes);
    if (!endTime) return err("Время записи выходит за пределы выбранного слота.");
    const draft: Omit<Appointment, "salonName" | "clientName" | "masterName" | "serviceName"> = {
      id: randomUUID(),
      salonId: service.salonId,
      clientId,
      guestName,
      masterId: input.masterId,
      serviceId: input.serviceId,
      timeSlotId: input.timeSlotId,
      clientNotes: input.clientNotes?.trim() || null,
      status: AppointmentStatus.Confirmed,
      startTime,
      endTime,
      appointmentDate: new Date(`${input.appointmentDate}T00:00:00.000Z`),
      price: service.price,
    };
    const created = await this.appointments.createExclusive(draft);
    if (created === "conflict") return err("Слот занят");
    await this.timeSlotService.refreshBookedStatus(draft.timeSlotId, input.appointmentDate);
    const saved = await this.getById(draft.id);
    if (saved.ok) {
      await this.inbox.send({
        userId: actor.userId,
        content: `Вы записали пользователя на ${saved.value.serviceName}, запись ${dateOnly(saved.value.appointmentDate)}`,
        type: InboxMessageType.CreationAppointment,
        audience: MessageAudience.Master,
        appointmentId: saved.value.id,
      });
      if (saved.value.clientId) {
        await this.inbox.send({
          userId: saved.value.clientId,
          content: `Запись на ${dateOnly(saved.value.appointmentDate)}, успешно создана`,
          type: InboxMessageType.CreationAppointment,
          audience: MessageAudience.User,
          appointmentId: saved.value.id,
        });
      }
    }
    return saved;
  }

  async getById(id: string, viewer?: SessionPayload) {
    const appointment = await this.appointments.getById(id);
    if (!appointment) return err("Запись не найдена");
    if (viewer && !this.canView(appointment, viewer)) return err("Запись не найдена");
    return ok(appointment);
  }

  private canView(appointment: Appointment, viewer: SessionPayload) {
    if (viewer.role === UserRole.Client) return appointment.clientId === viewer.userId;
    if (viewer.role === UserRole.Master) return appointment.masterId === viewer.masterProfileId;
    if (viewer.role === UserRole.SalonAdmin) return appointment.salonId === viewer.salonId;
    return false;
  }

  async getMine(clientId: string) {
    return ok(await this.appointments.getByClientId(clientId));
  }

  async getMasterDay(masterUserId: string, date: string) {
    const master = await this.masters.getByUserId(masterUserId);
    if (!master) return err("Профиль мастера не найден");
    return ok(await this.appointments.getByMasterAndDate(master.id, date));
  }

  async getSalonDay(salonId: string, date: string) {
    if (!salonId) return err("Салон администратора не найден");
    return ok(await this.appointments.getBySalonAndDate(salonId, date));
  }

  async cancel(userId: string, appointmentId: string) {
    const appointment = await this.appointments.getById(appointmentId);
    if (!appointment) return err("Запись не найдена");
    const master = await this.masters.getByUserId(userId);
    const isOwner = appointment.clientId === userId;
    const isMaster = master?.id === appointment.masterId;
    if (!isOwner && !isMaster) return err("Нет прав на отмену записи");
    if (appointment.status === AppointmentStatus.Cancelled) return err("Запись уже отменена");
    if (appointment.status === AppointmentStatus.Completed) return err("Завершённый визит нельзя отменить");
    await this.appointments.updateStatus(appointmentId, AppointmentStatus.Cancelled);
    await this.timeSlotService.refreshBookedStatus(
      appointment.timeSlotId,
      dateOnly(appointment.appointmentDate),
    );
    await this.notifyStatus(appointment, InboxMessageType.CancelledAppointment);
    return ok(undefined);
  }

  async complete(masterUserId: string, appointmentId: string) {
    const master = await this.masters.getByUserId(masterUserId);
    if (!master) return err("Профиль мастера не найден");
    const appointment = await this.appointments.getById(appointmentId);
    if (!appointment || appointment.masterId !== master.id) return err("Запись не найдена");
    if (appointment.status !== AppointmentStatus.Confirmed) {
      return err("Завершить можно только подтверждённую запись");
    }
    await this.appointments.updateStatus(appointmentId, AppointmentStatus.Completed);
    await this.notifyStatus(appointment, InboxMessageType.CompletedAppointment);
    return ok(undefined);
  }

  async getByTimeSlot(viewer: SessionPayload, timeSlotId: string) {
    const slot = await this.timeSlots.getById(timeSlotId);
    if (!slot) return err("Рабочее окно не найдено");
    if (viewer.role === UserRole.Master && viewer.masterProfileId !== slot.masterId) {
      return err("Нет прав на просмотр записей");
    }
    if (viewer.role === UserRole.SalonAdmin) {
      const master = await this.masters.getById(slot.masterId);
      if (!master || master.salonId !== viewer.salonId) return err("Нет прав на просмотр записей");
    }
    if (viewer.role !== UserRole.Master && viewer.role !== UserRole.SalonAdmin) {
      return err("Нет прав на просмотр записей");
    }
    return ok(await this.appointments.list({ timeSlotId }));
  }

  async listSalon(salonId: string, date?: string) {
    if (!salonId) return err("Салон администратора не найден");
    if (date) return ok(await this.appointments.getBySalonAndDate(salonId, date));
    return ok(await this.appointments.list({ salonId }));
  }

  async listMaster(masterUserId: string, date?: string) {
    const master = await this.masters.getByUserId(masterUserId);
    if (!master) return err("Профиль мастера не найден");
    if (date) return ok(await this.appointments.getByMasterAndDate(master.id, date));
    return ok(await this.appointments.list({ masterId: master.id }));
  }

  async cancelExpired() {
    const now = this.clock.utcNow();
    const items = await this.appointments.list({ status: AppointmentStatus.Confirmed, to: now });
    let cancelled = 0;
    for (const item of items) {
      const end = new Date(`${dateOnly(item.appointmentDate)}T${item.endTime}:00.000Z`);
      if (end > now) continue;
      await this.appointments.updateStatus(item.id, AppointmentStatus.Cancelled);
      await this.timeSlotService.refreshBookedStatus(item.timeSlotId, dateOnly(item.appointmentDate));
      await this.notifyStatus({ ...item, status: AppointmentStatus.Cancelled }, InboxMessageType.CancelledAppointment);
      cancelled += 1;
    }
    return ok({ cancelled });
  }

  private async notifyCreated(appointment: Appointment, masterUserId: string) {
    const texts = appointmentNotice(InboxMessageType.CreationAppointment, appointment);
    if (appointment.clientId) {
      await this.inbox.send({
        userId: appointment.clientId,
        content: texts.client,
        type: InboxMessageType.CreationAppointment,
        audience: MessageAudience.User,
        appointmentId: appointment.id,
      });
    }
    await this.inbox.send({
      userId: masterUserId,
      content: texts.master,
      type: InboxMessageType.CreationAppointment,
      audience: MessageAudience.Master,
      appointmentId: appointment.id,
    });
  }

  private async notifyStatus(appointment: Appointment, type: InboxMessageType) {
    const texts = appointmentNotice(type, appointment);
    if (appointment.clientId) {
      await this.inbox.send({
        userId: appointment.clientId,
        content: texts.client,
        type,
        audience: MessageAudience.User,
        appointmentId: appointment.id,
      });
    }
    const master = await this.masters.getById(appointment.masterId);
    if (master) {
      await this.inbox.send({
        userId: master.userId,
        content: texts.master,
        type,
        audience: MessageAudience.Master,
        appointmentId: appointment.id,
      });
    }
  }
}
