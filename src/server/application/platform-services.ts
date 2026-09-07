import { randomUUID } from "node:crypto";
import { err, ok } from "@/server/domain/result";
import { applyRating, isValidStarRating, removeRating } from "@/server/domain/rating";
import { isAllowedPhotoUrl, isUuid } from "@/server/domain/media";
import { addDailyTotals, EMPTY_DAILY_TOTALS, tallyAppointments } from "@/server/domain/stats";
import { eachDateOnly, isoDateOnly, utcRangeForDateOnly } from "@/server/domain/calendar";
import { dateOnly, isValidClockTime, isValidDateOnly, normalizeClockTime, toMinutes } from "@/server/domain/scheduling";
import {
  AppointmentStatus,
  InboxMessageType,
  MessageAudience,
  TimeSlotStatus,
  UserRole,
  type ChatMessage,
  type Conversation,
  type InboxMessage,
  type MasterTimeSlot,
  type Review,
  type WeeklyTemplate,
} from "@/server/domain/types";
import type {
  IAppointmentRepository,
  IChatMessageRepository,
  IClock,
  IConversationRepository,
  IDailyStatsRepository,
  IInboxRepository,
  IMasterProfileRepository,
  INotifier,
  IPasswordHasher,
  ICityCatalog,
  IReviewRepository,
  ISalonAdminRepository,
  ISalonPhotoRepository,
  ISalonRepository,
  ISubscriptionRepository,
  IMasterTimeSlotRepository,
  IUserRepository,
  IWeeklyTemplateRepository,
  SessionPayload,
} from "@/server/application/ports";

function formatAppointmentDate(date: Date) {
  return dateOnly(date);
}

export class InboxService {
  constructor(
    private readonly inbox: IInboxRepository,
    private readonly notifier: INotifier,
    private readonly clock: IClock,
  ) {}

  async send(input: {
    userId: string;
    content: string;
    type: InboxMessageType;
    audience: MessageAudience;
    appointmentId?: string | null;
  }) {
    const message: InboxMessage = {
      id: randomUUID(),
      userId: input.userId,
      appointmentId: input.appointmentId ?? null,
      content: input.content,
      type: input.type,
      audience: input.audience,
      readAt: null,
      createdAt: this.clock.utcNow(),
    };
    await this.inbox.add(message);
    this.notifier.notifyUser(input.userId, {
      Id: message.id,
      Message: message.content,
      Timestamp: message.createdAt.toISOString(),
    });
    return ok(message);
  }

  async list(userId: string) {
    return ok(await this.inbox.listByUser(userId));
  }

  async unreadCount(userId: string) {
    return ok(await this.inbox.unreadCount(userId));
  }

  async markRead(userId: string, id: string) {
    const message = await this.inbox.getById(id);
    if (!message || message.userId !== userId) return err("Сообщение не найдено");
    await this.inbox.markRead(id, this.clock.utcNow());
    return ok(undefined);
  }

  async delete(userId: string, id: string) {
    const message = await this.inbox.getById(id);
    if (!message || message.userId !== userId) return err("Сообщение не найдено");
    await this.inbox.delete(id);
    return ok(undefined);
  }
}

export class ChatService {
  constructor(
    private readonly conversations: IConversationRepository,
    private readonly messages: IChatMessageRepository,
    private readonly users: IUserRepository,
    private readonly notifier: INotifier,
    private readonly clock: IClock,
  ) {}

  isParticipant(conversation: Conversation, userId: string) {
    return conversation.participant1Id === userId || conversation.participant2Id === userId;
  }

  async create(userId: string, participant2Id: string) {
    if (!isUuid(participant2Id)) return err("Пользователь не найден");
    if (userId === participant2Id) return err("Нельзя создать чат с собой");
    const other = await this.users.getById(participant2Id);
    if (!other) return err("Пользователь не найден");
    const existing = await this.conversations.getByParticipants(userId, participant2Id);
    if (existing) return ok(existing);
    const me = await this.users.getById(userId);
    const conversation: Conversation = {
      id: randomUUID(),
      participant1Id: userId,
      participant2Id,
      participant1Name: me?.name ?? "",
      participant2Name: other.name,
      createdAt: this.clock.utcNow(),
    };
    await this.conversations.add(conversation);
    return ok(conversation);
  }

  async get(userId: string, id: string) {
    const conversation = await this.conversations.getById(id);
    if (!conversation || !this.isParticipant(conversation, userId)) return err("Диалог не найден");
    return ok(conversation);
  }

  async list(userId: string, search?: string) {
    return ok(await this.conversations.listByUser(userId, search));
  }

  async remove(userId: string, id: string) {
    const conversation = await this.conversations.getById(id);
    if (!conversation || !this.isParticipant(conversation, userId)) return err("Диалог не найден");
    await this.conversations.delete(id);
    return ok(undefined);
  }

  async send(userId: string, conversationId: string, body: string) {
    const text = body.trim();
    if (!text) return err("Сообщение не может быть пустым");
    const conversation = await this.conversations.getById(conversationId);
    if (!conversation || !this.isParticipant(conversation, userId)) return err("Диалог не найден");
    const sender = await this.users.getById(userId);
    const message: ChatMessage = {
      id: randomUUID(),
      conversationId,
      senderId: userId,
      senderName: sender?.name ?? "",
      body: text,
      createdAt: this.clock.utcNow(),
      readAt: null,
    };
    await this.messages.add(message);
    this.notifier.notifyConversation(conversationId, "ReceiveMessage", message);
    return ok(message);
  }

  async listMessages(userId: string, conversationId: string) {
    const conversation = await this.conversations.getById(conversationId);
    if (!conversation || !this.isParticipant(conversation, userId)) return err("Диалог не найден");
    const items = await this.messages.listByConversation(conversationId);
    const now = this.clock.utcNow();
    const result: ChatMessage[] = [];
    for (const item of items) {
      if (item.senderId !== userId && !item.readAt) {
        const next = { ...item, readAt: now };
        await this.messages.update(next);
        result.push(next);
      } else {
        result.push(item);
      }
    }
    return ok(result);
  }

  async unreadCount(userId: string) {
    return ok(await this.messages.unreadCount(userId));
  }

  async updateMessage(userId: string, id: string, body: string) {
    const message = await this.messages.getById(id);
    if (!message || message.senderId !== userId) return err("Сообщение не найдено");
    const text = body.trim();
    if (!text) return err("Сообщение не может быть пустым");
    const next = { ...message, body: text };
    await this.messages.update(next);
    this.notifier.notifyConversation(message.conversationId, "ReceiveMessage", next);
    return ok(next);
  }

  async deleteMessage(userId: string, id: string) {
    const message = await this.messages.getById(id);
    if (!message || message.senderId !== userId) return err("Сообщение не найдено");
    await this.messages.delete(id);
    this.notifier.notifyConversation(message.conversationId, "MessageDeleted", { id });
    return ok(undefined);
  }
}

export class ReviewService {
  constructor(
    private readonly reviews: IReviewRepository,
    private readonly appointments: IAppointmentRepository,
    private readonly salons: ISalonRepository,
    private readonly masters: IMasterProfileRepository,
    private readonly clock: IClock,
  ) {}

  async create(
    clientId: string,
    input: { appointmentId: string; salonRating: number; masterRating: number; comment?: string },
  ) {
    if (!isValidStarRating(input.salonRating) || !isValidStarRating(input.masterRating)) {
      return err("Оценка должна быть от 1 до 5");
    }
    const appointment = await this.appointments.getById(input.appointmentId);
    if (!appointment) return err("Запись не найдена");
    if (appointment.clientId !== clientId) return err("Вы можете оставить отзыв только по своей записи");
    if (appointment.status !== AppointmentStatus.Completed) {
      return err("Вы не можете оставить отзыв на невыполненную запись");
    }
    if (await this.reviews.getByAppointmentId(appointment.id)) {
      return err("Вы уже оставляли отзыв на эту запись");
    }
    const review: Review = {
      id: randomUUID(),
      appointmentId: appointment.id,
      clientId,
      salonId: appointment.salonId,
      masterId: appointment.masterId,
      salonRating: input.salonRating,
      masterRating: input.masterRating,
      comment: input.comment?.trim() || null,
      createdAt: this.clock.utcNow(),
    };
    await this.reviews.add(review);
    await this.bumpSalon(appointment.salonId, input.salonRating);
    await this.bumpMaster(appointment.masterId, input.masterRating);
    return ok(review);
  }

  async update(
    clientId: string,
    id: string,
    input: { salonRating: number; masterRating: number; comment?: string },
  ) {
    if (!isValidStarRating(input.salonRating) || !isValidStarRating(input.masterRating)) {
      return err("Оценка должна быть от 1 до 5");
    }
    const review = await this.reviews.getById(id);
    if (!review || review.clientId !== clientId) return err("Отзыв не найден");
    await this.replaceSalon(review.salonId, review.salonRating, input.salonRating);
    await this.replaceMaster(review.masterId, review.masterRating, input.masterRating);
    const next = {
      ...review,
      salonRating: input.salonRating,
      masterRating: input.masterRating,
      comment: input.comment?.trim() || null,
    };
    await this.reviews.update(next);
    return ok(next);
  }

  async delete(clientId: string, id: string) {
    const review = await this.reviews.getById(id);
    if (!review || review.clientId !== clientId) return err("Отзыв не найден");
    await this.dropSalon(review.salonId, review.salonRating);
    await this.dropMaster(review.masterId, review.masterRating);
    await this.reviews.delete(id);
    return ok(undefined);
  }

  async mine(clientId: string) {
    return ok(await this.reviews.listByClient(clientId));
  }

  async bySalon(salonId: string) {
    return ok(await this.reviews.listBySalon(salonId));
  }

  async byMaster(masterId: string) {
    return ok(await this.reviews.listByMaster(masterId));
  }

  async lowRating(salonId: string) {
    if (!salonId?.trim()) return err("Салон не найден");
    return ok(await this.reviews.listLowRating(salonId));
  }

  async awaiting(clientId: string) {
    return ok(
      await this.appointments.list({
        clientId,
        status: AppointmentStatus.Completed,
        withoutReview: true,
      }),
    );
  }

  private async bumpSalon(id: string, value: number) {
    const salon = await this.salons.getById(id);
    if (!salon) return;
    const next = applyRating(salon.rating, salon.ratingCount, value);
    await this.salons.updateRating(id, next.rating, next.ratingCount);
  }

  private async bumpMaster(id: string, value: number) {
    const master = await this.masters.getById(id);
    if (!master) return;
    const next = applyRating(master.rating, master.ratingCount, value);
    await this.masters.updateRating(id, next.rating, next.ratingCount);
  }

  private async replaceSalon(id: string, previous: number, nextValue: number) {
    const salon = await this.salons.getById(id);
    if (!salon) return;
    const next = applyRating(salon.rating, salon.ratingCount, nextValue, previous);
    await this.salons.updateRating(id, next.rating, next.ratingCount);
  }

  private async replaceMaster(id: string, previous: number, nextValue: number) {
    const master = await this.masters.getById(id);
    if (!master) return;
    const next = applyRating(master.rating, master.ratingCount, nextValue, previous);
    await this.masters.updateRating(id, next.rating, next.ratingCount);
  }

  private async dropSalon(id: string, value: number) {
    const salon = await this.salons.getById(id);
    if (!salon) return;
    const next = removeRating(salon.rating, salon.ratingCount, value);
    await this.salons.updateRating(id, next.rating, next.ratingCount);
  }

  private async dropMaster(id: string, value: number) {
    const master = await this.masters.getById(id);
    if (!master) return;
    const next = removeRating(master.rating, master.ratingCount, value);
    await this.masters.updateRating(id, next.rating, next.ratingCount);
  }
}

export class TemplateService {
  constructor(
    private readonly templates: IWeeklyTemplateRepository,
    private readonly masters: IMasterProfileRepository,
    private readonly timeSlots: IMasterTimeSlotRepository,
  ) {}

  async list(masterUserId: string) {
    const master = await this.masters.getByUserId(masterUserId);
    if (!master) return err("Профиль мастера не найден");
    return ok(await this.templates.listByMaster(master.id));
  }

  async get(masterUserId: string, id: string) {
    const master = await this.masters.getByUserId(masterUserId);
    if (!master) return err("Профиль мастера не найден");
    const template = await this.templates.getById(id);
    if (!template || template.masterId !== master.id) return err("Шаблон не найден");
    return ok(template);
  }

  async create(
    masterUserId: string,
    input: { name: string; days: { weekday: number; startTime: string; endTime: string }[] },
  ) {
    const master = await this.masters.getByUserId(masterUserId);
    if (!master) return err("Профиль мастера не найден");
    if (!input.name.trim()) return err("Название шаблона обязательно");
    const days = this.normalizeDays(input.days);
    if (!days.ok) return days;
    const template: WeeklyTemplate = {
      id: randomUUID(),
      masterId: master.id,
      name: input.name.trim(),
      days: days.value,
    };
    await this.templates.add(template);
    return ok(template);
  }

  async updateDay(
    masterUserId: string,
    templateId: string,
    input: { weekday: number; startTime: string; endTime: string; dayId?: string },
  ) {
    const templateResult = await this.get(masterUserId, templateId);
    if (!templateResult.ok) return templateResult;
    const days = this.normalizeDays([
      ...templateResult.value.days.filter((day) => day.weekday !== input.weekday),
      {
        id: input.dayId ?? templateResult.value.days.find((day) => day.weekday === input.weekday)?.id,
        weekday: input.weekday,
        startTime: input.startTime,
        endTime: input.endTime,
      },
    ]);
    if (!days.ok) return days;
    const next = { ...templateResult.value, days: days.value };
    await this.templates.update(next);
    return ok(next);
  }

  async deleteDay(masterUserId: string, templateId: string, dayId: string) {
    const templateResult = await this.get(masterUserId, templateId);
    if (!templateResult.ok) return templateResult;
    const next = {
      ...templateResult.value,
      days: templateResult.value.days.filter((day) => day.id !== dayId),
    };
    await this.templates.update(next);
    return ok(next);
  }

  async remove(masterUserId: string, id: string) {
    const templateResult = await this.get(masterUserId, id);
    if (!templateResult.ok) return templateResult;
    await this.templates.delete(id);
    return ok(undefined);
  }

  async apply(masterUserId: string, templateId: string, from: string, to: string) {
    const templateResult = await this.get(masterUserId, templateId);
    if (!templateResult.ok) return templateResult;
    if (!isValidDateOnly(from) || !isValidDateOnly(to) || from > to) {
      return err("Некорректный диапазон дат");
    }
    const created: MasterTimeSlot[] = [];
    for (let cursor = new Date(`${from}T00:00:00.000Z`); dateOnly(cursor) <= to; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
      const date = dateOnly(cursor);
      const weekday = cursor.getUTCDay();
      const day = templateResult.value.days.find((item) => item.weekday === weekday);
      if (!day) continue;
      const existing = await this.timeSlots.getByMasterAndDate(templateResult.value.masterId, date);
      const overlaps = existing.some(
        (slot) =>
          slot.status !== TimeSlotStatus.Cancelled &&
          toMinutes(day.startTime) < toMinutes(slot.endTime) &&
          toMinutes(slot.startTime) < toMinutes(day.endTime),
      );
      if (overlaps) continue;
      created.push({
        id: randomUUID(),
        masterId: templateResult.value.masterId,
        scheduleDate: date,
        startTime: day.startTime,
        endTime: day.endTime,
        status: TimeSlotStatus.Available,
      });
    }
    await this.timeSlots.addMany(created);
    return ok(created);
  }

  private normalizeDays(days: { id?: string; weekday: number; startTime: string; endTime: string }[]) {
    const mapped = days.map((day) => {
      const startTime = normalizeClockTime(day.startTime);
      const endTime = normalizeClockTime(day.endTime);
      return {
        id: day.id ?? randomUUID(),
        weekday: day.weekday,
        startTime,
        endTime,
      };
    });
    if (mapped.some((day) => day.weekday < 0 || day.weekday > 6)) {
      return err("День недели должен быть от 0 (вс) до 6 (сб)");
    }
    if (mapped.some((day) => !isValidClockTime(day.startTime) || !isValidClockTime(day.endTime))) {
      return err("Некорректное время шаблона");
    }
    if (mapped.some((day) => toMinutes(day.endTime) <= toMinutes(day.startTime))) {
      return err("Окончание смены должно быть позже начала");
    }
    return ok(mapped);
  }
}

export class SubscriptionService {
  constructor(
    private readonly subscriptions: ISubscriptionRepository,
    private readonly masters: IMasterProfileRepository,
    private readonly salons: ISalonRepository,
    private readonly users: IUserRepository,
  ) {}

  async add(clientId: string, masterId: string) {
    const user = await this.users.getById(clientId);
    if (!user || user.role !== UserRole.Client) return err("Подписка доступна только клиенту");
    const master = await this.masters.getById(masterId);
    if (!master) return err("Мастер не найден");
    const existing = await this.subscriptions.getByClientAndMaster(clientId, masterId);
    if (existing) return ok(existing);
    const salon = await this.salons.getById(master.salonId);
    const item = {
      id: randomUUID(),
      clientId,
      masterId,
      masterName: master.userName,
      salonName: salon?.name ?? "",
    };
    await this.subscriptions.add(item);
    return ok(item);
  }

  async remove(clientId: string, id: string) {
    const item = await this.subscriptions.getById(id);
    if (!item || item.clientId !== clientId) return err("Подписка не найдена");
    await this.subscriptions.delete(id);
    return ok(undefined);
  }

  async list(clientId: string) {
    return ok(await this.subscriptions.listByClient(clientId));
  }
}

export class StatsService {
  constructor(
    private readonly appointments: IAppointmentRepository,
    private readonly masters: IMasterProfileRepository,
    private readonly clock: IClock,
    private readonly dailyStats: IDailyStatsRepository,
  ) {}

  async salon(viewer: SessionPayload, salonId: string, period: "week" | "month" | "year", date = this.clock.utcNow()) {
    if (viewer.role !== UserRole.SalonAdmin || viewer.salonId !== salonId) {
      return err("Нет прав на статистику салона");
    }
    const range = periodRange(period, date);
    return ok(await this.collect({ salonId }, range, date));
  }

  async master(viewer: SessionPayload, masterId: string, period: "week" | "month" | "year", date = this.clock.utcNow()) {
    const master = await this.masters.getById(masterId);
    if (!master) return err("Мастер не найден");
    const isOwn = viewer.role === UserRole.Master && viewer.masterProfileId === masterId;
    const isAdmin = viewer.role === UserRole.SalonAdmin && viewer.salonId === master.salonId;
    if (!isOwn && !isAdmin) return err("Нет прав на статистику мастера");
    const range = periodRange(period, date);
    return ok(await this.collect({ masterId }, range, date));
  }

  async mine(viewer: SessionPayload, period: "week" | "month" | "year", date = this.clock.utcNow()) {
    if (viewer.role !== UserRole.Master || !viewer.masterProfileId) {
      return err("Профиль мастера не найден");
    }
    return this.master(viewer, viewer.masterProfileId, period, date);
  }

  private async collect(
    scope: { salonId?: string; masterId?: string },
    range: { from: Date; to: Date; period: string },
    now: Date,
  ) {
    const fromDate = isoDateOnly(range.from);
    const toDate = isoDateOnly(range.to);
    const today = dateOnly(now);
    const snapshots = scope.salonId
      ? await this.dailyStats.listSalon(scope.salonId, fromDate, toDate)
      : await this.dailyStats.listMaster(scope.masterId!, fromDate, toDate);
    const usable = snapshots.filter((row) => row.statDate !== today);
    const covered = new Set(usable.map((row) => row.statDate));
    const days = eachDateOnly(fromDate, toDate);
    const missing = days.filter((day) => day === today || !covered.has(day));

    if (missing.length === days.length) {
      const items = await this.appointments.list({ ...scope, from: range.from, to: range.to });
      return { period: range.period, from: range.from.toISOString(), to: range.to.toISOString(), ...tallyAppointments(items) };
    }

    const live = [];
    for (const day of missing) {
      const window = utcRangeForDateOnly(day);
      live.push(...(await this.appointments.list({ ...scope, from: window.from, to: window.to })));
    }
    const totals = addDailyTotals(
      usable.reduce((acc, row) => addDailyTotals(acc, row), EMPTY_DAILY_TOTALS),
      tallyAppointments(live),
    );
    return { period: range.period, from: range.from.toISOString(), to: range.to.toISOString(), ...totals };
  }
}

export class PhotoService {
  constructor(
    private readonly photos: ISalonPhotoRepository,
    private readonly salonAdmins: ISalonAdminRepository,
  ) {}

  async list(salonId: string) {
    return ok(await this.photos.listBySalon(salonId));
  }

  async add(adminUserId: string, salonId: string, url: string) {
    if (!(await this.salonAdmins.isAdminOfSalon(adminUserId, salonId))) {
      return err("Нет прав на добавление фото");
    }
    const trimmed = url.trim();
    if (!isAllowedPhotoUrl(trimmed)) {
      return err("Некорректный адрес фото");
    }
    const existing = await this.photos.listBySalon(salonId);
    if (existing.length >= 5) return err("Можно загрузить не больше 5 фото салона");
    const photo = { id: randomUUID(), salonId, url: trimmed };
    await this.photos.add(photo);
    return ok(photo);
  }

  async remove(adminUserId: string, id: string) {
    const photo = await this.photos.getById(id);
    if (!photo) return err("Фото не найдено");
    if (!(await this.salonAdmins.isAdminOfSalon(adminUserId, photo.salonId))) {
      return err("Нет прав на удаление фото");
    }
    await this.photos.delete(id);
    return ok(undefined);
  }
}

export class ProfileService {
  constructor(
    private readonly users: IUserRepository,
    private readonly hasher: IPasswordHasher,
    private readonly cityCatalog: ICityCatalog,
  ) {}

  async publicProfile(id: string) {
    const user = await this.users.getById(id);
    if (!user) return err("Пользователь не найден");
    return ok({
      id: user.id,
      name: user.name,
      city: user.city ?? null,
      role: user.role,
    });
  }

  async updateCity(userId: string, city: string) {
    const next = this.cityCatalog.canonical(city);
    if (!next) return err("Вы указали неверный город");
    await this.users.updateCity(userId, next);
    return ok({ city: next });
  }

  async updatePassword(userId: string, currentPassword: string, nextPassword: string) {
    const user = await this.users.getById(userId);
    if (!user) return err("Пользователь не найден");
    if (!(await this.hasher.verify(currentPassword, user.passwordHash))) {
      return err("Неверный текущий пароль");
    }
    if (!nextPassword || nextPassword.length < 8) {
      return err("Пароль должен содержать минимум 8 символов");
    }
    await this.users.updatePasswordHash(userId, await this.hasher.hash(nextPassword));
    return ok(undefined);
  }

  async cities(prefix?: string) {
    return ok(this.cityCatalog.list(prefix));
  }
}

function periodRange(period: "week" | "month" | "year", date: Date) {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  if (period === "year") {
    const from = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
    const to = new Date(Date.UTC(utc.getUTCFullYear() + 1, 0, 1));
    return { from, to, period };
  }
  if (period === "month") {
    const from = new Date(Date.UTC(utc.getUTCFullYear(), utc.getUTCMonth(), 1));
    const to = new Date(Date.UTC(utc.getUTCFullYear(), utc.getUTCMonth() + 1, 1));
    return { from, to, period };
  }
  const weekday = (utc.getUTCDay() + 6) % 7;
  const from = new Date(utc);
  from.setUTCDate(utc.getUTCDate() - weekday);
  const to = new Date(from);
  to.setUTCDate(from.getUTCDate() + 7);
  return { from, to, period };
}

export function appointmentNotice(kind: InboxMessageType, appointment: {
  appointmentDate: Date;
  serviceName: string;
  clientName: string;
}) {
  const when = formatAppointmentDate(appointment.appointmentDate);
  if (kind === InboxMessageType.CreationAppointment) {
    return {
      client: `Запись на ${when}, успешно создана`,
      master: `Пользователь ${appointment.clientName}, записался к вам на ${appointment.serviceName}, запись ${when}`,
    };
  }
  if (kind === InboxMessageType.CancelledAppointment) {
    return {
      client: `Запись на ${when} отменена`,
      master: `Запись клиента ${appointment.clientName} на ${when} отменена`,
    };
  }
  return {
    client: `Запись на ${when} завершена. Оставьте отзыв`,
    master: `Вы завершили запись клиента ${appointment.clientName} на ${when}`,
  };
}
