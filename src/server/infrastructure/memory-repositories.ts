import { AppointmentStatus, StatsJobStatus, TimeSlotStatus } from "@/server/domain/types";
import type {
  Appointment,
  ChatMessage,
  Conversation,
  DailyMasterStat,
  DailySalonStat,
  EmailVerification,
  InboxMessage,
  MasterProfile,
  MasterSubscription,
  MasterTimeSlot,
  RefreshTokenRecord,
  Review,
  Salon,
  SalonPhoto,
  SalonPromotion,
  PortfolioPhoto,
  Service,
  StatsJobRun,
  User,
  WeeklyTemplate,
} from "@/server/domain/types";
import type {
  AppointmentListFilter,
  IAppointmentRepository,
  IChatMessageRepository,
  IConversationRepository,
  IEmailVerificationRepository,
  IInboxRepository,
  IMasterProfileRepository,
  IMasterServiceRepository,
  IMasterTimeSlotRepository,
  IRefreshTokenRepository,
  IReviewRepository,
  ISalonAdminRepository,
  ISalonPhotoRepository,
  IPromotionRepository,
  IPortfolioRepository,
  ISalonRepository,
  IServiceRepository,
  IStatsJobRunRepository,
  IDailyStatsRepository,
  ISubscriptionRepository,
  IUserRepository,
  IWeeklyTemplateRepository,
} from "@/server/application/ports";

function dayRange(date: string) {
  const from = new Date(`${date}T00:00:00.000Z`);
  const to = new Date(from.getTime() + 24 * 60 * 60 * 1000);
  return { from, to };
}

export class InMemoryStore {
  users: User[] = [];
  verifications: EmailVerification[] = [];
  salons: Salon[] = [];
  salonAdmins: { id: string; userId: string; salonId: string }[] = [];
  masters: MasterProfile[] = [];
  services: Service[] = [];
  masterServices: { id: string; masterProfileId: string; serviceId: string }[] = [];
  timeSlots: MasterTimeSlot[] = [];
  appointments: Appointment[] = [];
  refreshTokens: RefreshTokenRecord[] = [];
  inbox: InboxMessage[] = [];
  reviews: Review[] = [];
  templates: WeeklyTemplate[] = [];
  subscriptions: MasterSubscription[] = [];
  conversations: Conversation[] = [];
  chatMessages: ChatMessage[] = [];
  photos: SalonPhoto[] = [];
  promotions: SalonPromotion[] = [];
  portfolio: PortfolioPhoto[] = [];
  dailySalonStats: DailySalonStat[] = [];
  dailyMasterStats: DailyMasterStat[] = [];
  statsJobRuns: StatsJobRun[] = [];
}

export class InMemoryUserRepository implements IUserRepository {
  constructor(private readonly db: InMemoryStore) {}
  async getById(id: string) {
    return this.db.users.find((u) => u.id === id) ?? null;
  }
  async getByEmail(email: string) {
    return this.db.users.find((u) => u.email === email) ?? null;
  }
  async add(user: User) {
    this.db.users.push(user);
  }
  async markEmailVerified(id: string) {
    const user = this.db.users.find((u) => u.id === id);
    if (user) user.emailVerified = true;
  }
  async updateCity(id: string, city: string) {
    const user = this.db.users.find((u) => u.id === id);
    if (user) user.city = city;
  }
  async updatePasswordHash(id: string, passwordHash: string) {
    const user = this.db.users.find((u) => u.id === id);
    if (user) user.passwordHash = passwordHash;
  }
  async listCities(prefix?: string) {
    const term = prefix?.trim().toLowerCase() ?? "";
    return [...new Set(this.db.users.map((u) => u.city).filter((city): city is string => Boolean(city)))]
      .filter((city) => !term || city.toLowerCase().includes(term))
      .sort();
  }
}

export class InMemoryEmailVerificationRepository implements IEmailVerificationRepository {
  constructor(private readonly db: InMemoryStore) {}
  async getActiveByEmail(email: string) {
    return (
      [...this.db.verifications]
        .filter((v) => v.email === email && !v.isUsed)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null
    );
  }
  async add(verification: EmailVerification) {
    this.db.verifications.push(verification);
  }
  async markUsed(id: string) {
    const item = this.db.verifications.find((v) => v.id === id);
    if (item) item.isUsed = true;
  }
}

export class InMemorySalonRepository implements ISalonRepository {
  constructor(private readonly db: InMemoryStore) {}
  async getById(id: string) {
    return this.db.salons.find((s) => s.id === id) ?? null;
  }
  async listIds() {
    return this.db.salons.map((salon) => salon.id);
  }
  async search(query?: { name?: string; category?: string; city?: string }) {
    const name = query?.name?.trim().toLowerCase();
    const category = query?.category?.trim().toLowerCase();
    const city = query?.city?.trim().toLowerCase();
    return this.db.salons.filter((salon) => {
      if (!salon.isActive) return false;
      if (city && salon.city.toLowerCase() !== city) return false;
      if (name) {
        const haystack = `${salon.name} ${salon.street} ${salon.building}`.toLowerCase();
        if (!haystack.includes(name)) return false;
      }
      if (category) {
        const has = this.db.services.some(
          (s) => s.salonId === salon.id && s.isActive && s.name.toLowerCase().includes(category),
        );
        if (!has) return false;
      }
      return true;
    });
  }
  async add(salon: Salon) {
    this.db.salons.push(salon);
  }
  async update(salon: Salon) {
    const index = this.db.salons.findIndex((s) => s.id === salon.id);
    if (index >= 0) this.db.salons[index] = salon;
  }
  async updateRating(id: string, rating: number, ratingCount: number) {
    const salon = this.db.salons.find((s) => s.id === id);
    if (salon) {
      salon.rating = rating;
      salon.ratingCount = ratingCount;
    }
  }
}

export class InMemorySalonAdminRepository implements ISalonAdminRepository {
  constructor(private readonly db: InMemoryStore) {}
  async getByUserId(userId: string) {
    return this.db.salonAdmins.find((a) => a.userId === userId) ?? null;
  }
  async isAdminOfSalon(userId: string, salonId: string) {
    return this.db.salonAdmins.some((a) => a.userId === userId && a.salonId === salonId);
  }
  async add(link: { id: string; userId: string; salonId: string }) {
    this.db.salonAdmins.push(link);
  }
}

export class InMemoryMasterProfileRepository implements IMasterProfileRepository {
  constructor(private readonly db: InMemoryStore) {}
  async getById(id: string) {
    return this.db.masters.find((m) => m.id === id) ?? null;
  }
  async getByUserId(userId: string) {
    return this.db.masters.find((m) => m.userId === userId) ?? null;
  }
  async getBySalonId(salonId: string) {
    return this.db.masters.filter((m) => m.salonId === salonId);
  }
  async listIds() {
    return this.db.masters.map((master) => master.id);
  }
  async listTopRated(limit: number, city?: string) {
    const cityKey = city?.trim().toLowerCase();
    const salonIds = cityKey
      ? new Set(this.db.salons.filter((salon) => salon.city.toLowerCase() === cityKey).map((salon) => salon.id))
      : null;
    return [...this.db.masters]
      .filter((master) => !salonIds || salonIds.has(master.salonId))
      .sort((a, b) => b.ratingCount - a.ratingCount || b.rating - a.rating)
      .slice(0, limit);
  }
  async add(profile: MasterProfile) {
    this.db.masters.push(profile);
  }
  async update(profile: MasterProfile) {
    const index = this.db.masters.findIndex((m) => m.id === profile.id);
    if (index >= 0) this.db.masters[index] = profile;
  }
  async updateRating(id: string, rating: number, ratingCount: number) {
    const master = this.db.masters.find((m) => m.id === id);
    if (master) {
      master.rating = rating;
      master.ratingCount = ratingCount;
    }
  }
}

export class InMemoryServiceRepository implements IServiceRepository {
  constructor(private readonly db: InMemoryStore) {}
  async getById(id: string) {
    return this.db.services.find((s) => s.id === id) ?? null;
  }
  async getBySalonId(salonId: string, activeOnly = true) {
    return this.db.services.filter((s) => s.salonId === salonId && (!activeOnly || s.isActive));
  }
  async add(service: Service) {
    this.db.services.push(service);
  }
  async update(service: Service) {
    const index = this.db.services.findIndex((s) => s.id === service.id);
    if (index >= 0) this.db.services[index] = service;
  }
}

export class InMemoryMasterServiceRepository implements IMasterServiceRepository {
  constructor(private readonly db: InMemoryStore) {}
  async exists(masterProfileId: string, serviceId: string) {
    return this.db.masterServices.some(
      (x) => x.masterProfileId === masterProfileId && x.serviceId === serviceId,
    );
  }
  async getServicesForMaster(masterProfileId: string) {
    const ids = this.db.masterServices
      .filter((x) => x.masterProfileId === masterProfileId)
      .map((x) => x.serviceId);
    return this.db.services.filter((s) => ids.includes(s.id) && s.isActive);
  }
  async add(link: { id: string; masterProfileId: string; serviceId: string }) {
    this.db.masterServices.push(link);
  }
  async remove(masterProfileId: string, serviceId: string) {
    this.db.masterServices = this.db.masterServices.filter(
      (x) => !(x.masterProfileId === masterProfileId && x.serviceId === serviceId),
    );
  }
}

export class InMemoryTimeSlotRepository implements IMasterTimeSlotRepository {
  constructor(private readonly db: InMemoryStore) {}
  async getById(id: string) {
    return this.db.timeSlots.find((s) => s.id === id) ?? null;
  }
  async getByMasterAndDate(masterId: string, date: string) {
    return this.db.timeSlots.filter((s) => s.masterId === masterId && s.scheduleDate === date);
  }
  async getBySalonAndDate(salonId: string, date: string) {
    const masterIds = this.db.masters.filter((m) => m.salonId === salonId).map((m) => m.id);
    return this.db.timeSlots.filter((s) => masterIds.includes(s.masterId) && s.scheduleDate === date);
  }
  async add(slot: MasterTimeSlot) {
    this.db.timeSlots.push(slot);
  }
  async addMany(slots: MasterTimeSlot[]) {
    this.db.timeSlots.push(...slots);
  }
  async delete(id: string) {
    this.db.timeSlots = this.db.timeSlots.filter((s) => s.id !== id);
  }
  async updateStatus(id: string, status: TimeSlotStatus) {
    const slot = this.db.timeSlots.find((s) => s.id === id);
    if (slot) slot.status = status;
  }
}

export class InMemoryAppointmentRepository implements IAppointmentRepository {
  constructor(private readonly db: InMemoryStore) {}

  private hydrate(a: Appointment): Appointment {
    const salon = this.db.salons.find((s) => s.id === a.salonId);
    const client = a.clientId ? this.db.users.find((u) => u.id === a.clientId) : undefined;
    const master = this.db.masters.find((m) => m.id === a.masterId);
    const service = this.db.services.find((s) => s.id === a.serviceId);
    return {
      ...a,
      salonName: salon?.name ?? a.salonName,
      clientName: client?.name ?? a.guestName ?? a.clientName ?? "Гость",
      masterName: master?.userName ?? a.masterName,
      serviceName: service?.name ?? a.serviceName,
      price: service?.price ?? a.price,
    };
  }

  async getById(id: string) {
    const found = this.db.appointments.find((a) => a.id === id);
    return found ? this.hydrate(found) : null;
  }
  async getByClientId(clientId: string) {
    return this.db.appointments.filter((a) => a.clientId === clientId).map((a) => this.hydrate(a));
  }
  async getByMasterAndDate(masterId: string, date: string) {
    const { from, to } = dayRange(date);
    return this.db.appointments
      .filter((a) => a.masterId === masterId && a.appointmentDate >= from && a.appointmentDate < to)
      .map((a) => this.hydrate(a));
  }
  async getActiveByMasterAndDate(masterId: string, date: string) {
    const items = await this.getByMasterAndDate(masterId, date);
    return items.filter((a) => a.status !== AppointmentStatus.Cancelled);
  }
  async getBySalonAndDate(salonId: string, date: string) {
    const { from, to } = dayRange(date);
    return this.db.appointments
      .filter((a) => a.salonId === salonId && a.appointmentDate >= from && a.appointmentDate < to)
      .map((a) => this.hydrate(a));
  }
  async getOverlapping(input: { timeSlotId: string; date: string; startTime: string; endTime: string }) {
    const { from, to } = dayRange(input.date);
    return (
      this.db.appointments.find(
        (a) =>
          a.timeSlotId === input.timeSlotId &&
          a.appointmentDate >= from &&
          a.appointmentDate < to &&
          a.status !== AppointmentStatus.Cancelled &&
          input.startTime < a.endTime &&
          a.startTime < input.endTime,
      ) ?? null
    );
  }
  async createExclusive(appointment: Appointment) {
    const date = appointment.appointmentDate.toISOString().slice(0, 10);
    const conflict = await this.getOverlapping({
      timeSlotId: appointment.timeSlotId,
      date,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
    });
    if (conflict) return "conflict";
    this.db.appointments.push(this.hydrate(appointment));
    return "ok";
  }
  async updateStatus(id: string, status: AppointmentStatus) {
    const item = this.db.appointments.find((a) => a.id === id);
    if (item) item.status = status;
  }
  async list(filter: AppointmentListFilter) {
    return this.db.appointments
      .filter((a) => {
        if (filter.clientId && a.clientId !== filter.clientId) return false;
        if (filter.masterId && a.masterId !== filter.masterId) return false;
        if (filter.salonId && a.salonId !== filter.salonId) return false;
        if (filter.timeSlotId && a.timeSlotId !== filter.timeSlotId) return false;
        if (filter.status && a.status !== filter.status) return false;
        if (filter.from && a.appointmentDate < filter.from) return false;
        if (filter.to && a.appointmentDate >= filter.to) return false;
        if (filter.withoutReview && this.db.reviews.some((r) => r.appointmentId === a.id)) return false;
        return true;
      })
      .map((a) => this.hydrate(a));
  }
}

export class InMemoryRefreshTokenRepository implements IRefreshTokenRepository {
  constructor(private readonly db: InMemoryStore) {}

  async getByTokenHash(tokenHash: string) {
    return this.db.refreshTokens.find((token) => token.tokenHash === tokenHash) ?? null;
  }

  async add(record: RefreshTokenRecord) {
    this.db.refreshTokens.push(record);
  }

  async claimIfActive(id: string, revokedAt: Date) {
    const item = this.db.refreshTokens.find((token) => token.id === id);
    if (!item || item.revokedAt) return false;
    item.revokedAt = revokedAt;
    return true;
  }

  async setReplacedBy(id: string, replacedById: string) {
    const item = this.db.refreshTokens.find((token) => token.id === id);
    if (item) item.replacedById = replacedById;
  }

  async revokeFamily(familyId: string, revokedAt: Date) {
    for (const token of this.db.refreshTokens) {
      if (token.familyId === familyId && !token.revokedAt) {
        token.revokedAt = revokedAt;
      }
    }
  }

  async revokeAllForUser(userId: string, revokedAt: Date) {
    for (const token of this.db.refreshTokens) {
      if (token.userId === userId && !token.revokedAt) {
        token.revokedAt = revokedAt;
      }
    }
  }
}

export class InMemoryInboxRepository implements IInboxRepository {
  constructor(private readonly db: InMemoryStore) {}
  async add(message: InboxMessage) {
    this.db.inbox.push(message);
  }
  async listByUser(userId: string) {
    return this.db.inbox
      .filter((m) => m.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  async unreadCount(userId: string) {
    return this.db.inbox.filter((m) => m.userId === userId && !m.readAt).length;
  }
  async getById(id: string) {
    return this.db.inbox.find((m) => m.id === id) ?? null;
  }
  async markRead(id: string, readAt: Date) {
    const item = this.db.inbox.find((m) => m.id === id);
    if (item) item.readAt = readAt;
  }
  async delete(id: string) {
    this.db.inbox = this.db.inbox.filter((m) => m.id !== id);
  }
}

export class InMemoryReviewRepository implements IReviewRepository {
  constructor(private readonly db: InMemoryStore) {}
  private hydrate(review: Review): Review {
    const salon = this.db.salons.find((s) => s.id === review.salonId);
    const master = this.db.masters.find((m) => m.id === review.masterId);
    const client = this.db.users.find((u) => u.id === review.clientId);
    return { ...review, salonName: salon?.name, masterName: master?.userName, clientName: client?.name };
  }
  async add(review: Review) {
    this.db.reviews.push(review);
  }
  async update(review: Review) {
    const index = this.db.reviews.findIndex((r) => r.id === review.id);
    if (index >= 0) this.db.reviews[index] = review;
  }
  async delete(id: string) {
    this.db.reviews = this.db.reviews.filter((r) => r.id !== id);
  }
  async getById(id: string) {
    const found = this.db.reviews.find((r) => r.id === id);
    return found ? this.hydrate(found) : null;
  }
  async getByAppointmentId(appointmentId: string) {
    const found = this.db.reviews.find((r) => r.appointmentId === appointmentId);
    return found ? this.hydrate(found) : null;
  }
  async listByClient(clientId: string) {
    return this.db.reviews.filter((r) => r.clientId === clientId).map((r) => this.hydrate(r));
  }
  async listBySalon(salonId: string) {
    return this.db.reviews.filter((r) => r.salonId === salonId).map((r) => this.hydrate(r));
  }
  async listByMaster(masterId: string) {
    return this.db.reviews.filter((r) => r.masterId === masterId).map((r) => this.hydrate(r));
  }
  async listLowRating(salonId?: string) {
    return this.db.reviews
      .filter((r) => (!salonId || r.salonId === salonId) && (r.salonRating <= 3 || r.masterRating <= 3))
      .map((r) => this.hydrate(r));
  }
}

export class InMemoryWeeklyTemplateRepository implements IWeeklyTemplateRepository {
  constructor(private readonly db: InMemoryStore) {}
  async add(template: WeeklyTemplate) {
    this.db.templates.push(template);
  }
  async update(template: WeeklyTemplate) {
    const index = this.db.templates.findIndex((t) => t.id === template.id);
    if (index >= 0) this.db.templates[index] = template;
  }
  async delete(id: string) {
    this.db.templates = this.db.templates.filter((t) => t.id !== id);
  }
  async getById(id: string) {
    return this.db.templates.find((t) => t.id === id) ?? null;
  }
  async listByMaster(masterId: string) {
    return this.db.templates.filter((t) => t.masterId === masterId);
  }
}

export class InMemorySubscriptionRepository implements ISubscriptionRepository {
  constructor(private readonly db: InMemoryStore) {}
  private hydrate(item: MasterSubscription): MasterSubscription {
    const master = this.db.masters.find((m) => m.id === item.masterId);
    const salon = master ? this.db.salons.find((s) => s.id === master.salonId) : undefined;
    return {
      ...item,
      masterName: master?.userName ?? item.masterName,
      salonName: salon?.name ?? item.salonName,
    };
  }
  async add(item: MasterSubscription) {
    this.db.subscriptions.push(item);
  }
  async delete(id: string) {
    this.db.subscriptions = this.db.subscriptions.filter((s) => s.id !== id);
  }
  async getById(id: string) {
    const found = this.db.subscriptions.find((s) => s.id === id);
    return found ? this.hydrate(found) : null;
  }
  async getByClientAndMaster(clientId: string, masterId: string) {
    const found = this.db.subscriptions.find((s) => s.clientId === clientId && s.masterId === masterId);
    return found ? this.hydrate(found) : null;
  }
  async listByClient(clientId: string) {
    return this.db.subscriptions.filter((s) => s.clientId === clientId).map((s) => this.hydrate(s));
  }
}

export class InMemoryConversationRepository implements IConversationRepository {
  constructor(private readonly db: InMemoryStore) {}
  private hydrate(item: Conversation): Conversation {
    const p1 = this.db.users.find((u) => u.id === item.participant1Id);
    const p2 = this.db.users.find((u) => u.id === item.participant2Id);
    return {
      ...item,
      participant1Name: p1?.name ?? item.participant1Name,
      participant2Name: p2?.name ?? item.participant2Name,
    };
  }
  async add(conversation: Conversation) {
    this.db.conversations.push(conversation);
  }
  async delete(id: string) {
    this.db.conversations = this.db.conversations.filter((c) => c.id !== id);
    this.db.chatMessages = this.db.chatMessages.filter((m) => m.conversationId !== id);
  }
  async getById(id: string) {
    const found = this.db.conversations.find((c) => c.id === id);
    return found ? this.hydrate(found) : null;
  }
  async getByParticipants(a: string, b: string) {
    const found = this.db.conversations.find(
      (c) =>
        (c.participant1Id === a && c.participant2Id === b) ||
        (c.participant1Id === b && c.participant2Id === a),
    );
    return found ? this.hydrate(found) : null;
  }
  async listByUser(userId: string, search?: string) {
    const term = search?.trim().toLowerCase() ?? "";
    return this.db.conversations
      .filter((c) => c.participant1Id === userId || c.participant2Id === userId)
      .map((c) => this.hydrate(c))
      .filter((c) => {
        if (!term) return true;
        const other = c.participant1Id === userId ? c.participant2Name : c.participant1Name;
        return other.toLowerCase().includes(term);
      });
  }
}

export class InMemoryChatMessageRepository implements IChatMessageRepository {
  constructor(private readonly db: InMemoryStore) {}
  private hydrate(item: ChatMessage): ChatMessage {
    const sender = this.db.users.find((u) => u.id === item.senderId);
    return { ...item, senderName: sender?.name ?? item.senderName };
  }
  async add(message: ChatMessage) {
    this.db.chatMessages.push(message);
  }
  async update(message: ChatMessage) {
    const index = this.db.chatMessages.findIndex((m) => m.id === message.id);
    if (index >= 0) this.db.chatMessages[index] = message;
  }
  async delete(id: string) {
    this.db.chatMessages = this.db.chatMessages.filter((m) => m.id !== id);
  }
  async getById(id: string) {
    const found = this.db.chatMessages.find((m) => m.id === id);
    return found ? this.hydrate(found) : null;
  }
  async listByConversation(conversationId: string) {
    return this.db.chatMessages
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((m) => this.hydrate(m));
  }
  async unreadCount(userId: string) {
    const conversationIds = this.db.conversations
      .filter((c) => c.participant1Id === userId || c.participant2Id === userId)
      .map((c) => c.id);
    return this.db.chatMessages.filter(
      (m) => conversationIds.includes(m.conversationId) && m.senderId !== userId && !m.readAt,
    ).length;
  }
}

export class InMemorySalonPhotoRepository implements ISalonPhotoRepository {
  constructor(private readonly db: InMemoryStore) {}
  async add(photo: SalonPhoto) {
    this.db.photos.push(photo);
  }
  async delete(id: string) {
    this.db.photos = this.db.photos.filter((p) => p.id !== id);
  }
  async getById(id: string) {
    return this.db.photos.find((p) => p.id === id) ?? null;
  }
  async listBySalon(salonId: string) {
    return this.db.photos.filter((p) => p.salonId === salonId);
  }
}

export class InMemoryPromotionRepository implements IPromotionRepository {
  constructor(private readonly db: InMemoryStore) {}
  async add(promotion: SalonPromotion) {
    this.db.promotions.push(promotion);
  }
  async update(promotion: SalonPromotion) {
    const index = this.db.promotions.findIndex((item) => item.id === promotion.id);
    if (index >= 0) this.db.promotions[index] = promotion;
  }
  async delete(id: string) {
    this.db.promotions = this.db.promotions.filter((item) => item.id !== id);
  }
  async getById(id: string) {
    return this.db.promotions.find((item) => item.id === id) ?? null;
  }
  async listBySalon(salonId: string) {
    return this.db.promotions
      .filter((item) => item.salonId === salonId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  async listBySalonIds(salonIds: string[]) {
    const set = new Set(salonIds);
    return this.db.promotions.filter((item) => set.has(item.salonId));
  }
}

export class InMemoryPortfolioRepository implements IPortfolioRepository {
  constructor(private readonly db: InMemoryStore) {}
  async add(photo: PortfolioPhoto) {
    this.db.portfolio.push(photo);
  }
  async delete(id: string) {
    this.db.portfolio = this.db.portfolio.filter((item) => item.id !== id);
  }
  async getById(id: string) {
    return this.db.portfolio.find((item) => item.id === id) ?? null;
  }
  async listByMaster(masterId: string) {
    return this.db.portfolio
      .filter((item) => item.masterId === masterId)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.getTime() - b.createdAt.getTime());
  }
  async listByMasterIds(masterIds: string[]) {
    const set = new Set(masterIds);
    return this.db.portfolio
      .filter((item) => set.has(item.masterId))
      .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.getTime() - b.createdAt.getTime());
  }
}

export class InMemoryDailyStatsRepository implements IDailyStatsRepository {
  constructor(private readonly db: InMemoryStore) {}

  async upsertSalon(stat: DailySalonStat) {
    const index = this.db.dailySalonStats.findIndex((row) => row.salonId === stat.salonId && row.statDate === stat.statDate);
    if (index >= 0) {
      this.db.dailySalonStats[index] = { ...stat, id: this.db.dailySalonStats[index]!.id };
      return;
    }
    this.db.dailySalonStats.push(stat);
  }

  async upsertMaster(stat: DailyMasterStat) {
    const index = this.db.dailyMasterStats.findIndex((row) => row.masterId === stat.masterId && row.statDate === stat.statDate);
    if (index >= 0) {
      this.db.dailyMasterStats[index] = { ...stat, id: this.db.dailyMasterStats[index]!.id };
      return;
    }
    this.db.dailyMasterStats.push(stat);
  }

  async listSalon(salonId: string, fromDate: string, toDateExclusive: string) {
    return this.db.dailySalonStats.filter(
      (row) => row.salonId === salonId && row.statDate >= fromDate && row.statDate < toDateExclusive,
    );
  }

  async listMaster(masterId: string, fromDate: string, toDateExclusive: string) {
    return this.db.dailyMasterStats.filter(
      (row) => row.masterId === masterId && row.statDate >= fromDate && row.statDate < toDateExclusive,
    );
  }
}

export class InMemoryStatsJobRunRepository implements IStatsJobRunRepository {
  constructor(private readonly db: InMemoryStore) {}

  async get(statDate: string) {
    return this.db.statsJobRuns.find((row) => row.statDate === statDate) ?? null;
  }

  async claim(statDate: string, now: Date, leaseUntil: Date, workerId: string) {
    const existing = this.db.statsJobRuns.find((row) => row.statDate === statDate);
    if (!existing) {
      this.db.statsJobRuns.push({
        id: crypto.randomUUID(),
        statDate,
        status: StatsJobStatus.Running,
        attempt: 1,
        leaseUntil,
        workerId,
        error: null,
        startedAt: now,
        completedAt: null,
      });
      return true;
    }
    if (existing.status === StatsJobStatus.Completed) return false;
    if (existing.status === StatsJobStatus.Running && existing.leaseUntil.getTime() > now.getTime()) return false;
    existing.status = StatsJobStatus.Running;
    existing.attempt += 1;
    existing.leaseUntil = leaseUntil;
    existing.workerId = workerId;
    existing.error = null;
    existing.startedAt = now;
    existing.completedAt = null;
    return true;
  }

  async renewLease(statDate: string, leaseUntil: Date, workerId: string) {
    const existing = this.db.statsJobRuns.find((row) => row.statDate === statDate);
    if (existing && existing.status === StatsJobStatus.Running && existing.workerId === workerId) {
      existing.leaseUntil = leaseUntil;
    }
  }

  async markCompleted(statDate: string, now: Date) {
    const existing = this.db.statsJobRuns.find((row) => row.statDate === statDate);
    if (!existing) return;
    existing.status = StatsJobStatus.Completed;
    existing.completedAt = now;
    existing.error = null;
  }

  async markFailed(statDate: string, now: Date, error: string) {
    const existing = this.db.statsJobRuns.find((row) => row.statDate === statDate);
    if (!existing) return;
    existing.status = StatsJobStatus.Failed;
    existing.completedAt = now;
    existing.error = error;
  }
}

export function createInMemoryRepos(db = new InMemoryStore()) {
  return {
    db,
    users: new InMemoryUserRepository(db),
    verifications: new InMemoryEmailVerificationRepository(db),
    salons: new InMemorySalonRepository(db),
    salonAdmins: new InMemorySalonAdminRepository(db),
    masters: new InMemoryMasterProfileRepository(db),
    services: new InMemoryServiceRepository(db),
    masterServices: new InMemoryMasterServiceRepository(db),
    timeSlots: new InMemoryTimeSlotRepository(db),
    appointments: new InMemoryAppointmentRepository(db),
    refreshTokens: new InMemoryRefreshTokenRepository(db),
    inbox: new InMemoryInboxRepository(db),
    reviews: new InMemoryReviewRepository(db),
    templates: new InMemoryWeeklyTemplateRepository(db),
    subscriptions: new InMemorySubscriptionRepository(db),
    conversations: new InMemoryConversationRepository(db),
    chatMessages: new InMemoryChatMessageRepository(db),
    photos: new InMemorySalonPhotoRepository(db),
    promotions: new InMemoryPromotionRepository(db),
    portfolio: new InMemoryPortfolioRepository(db),
    dailyStats: new InMemoryDailyStatsRepository(db),
    statsJobRuns: new InMemoryStatsJobRunRepository(db),
  };
}
