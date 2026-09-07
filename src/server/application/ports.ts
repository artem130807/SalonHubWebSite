import type {
  Appointment,
  AppointmentStatus,
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
  Service,
  StatsJobRun,
  TimeSlotStatus,
  User,
  WeeklyTemplate,
} from "@/server/domain/types";

export interface IClock {
  utcNow(): Date;
}

export type NotificationPayload = {
  Id: string;
  Message: string;
  Timestamp: string;
};

export interface INotifier {
  notifyUser(userId: string, payload: NotificationPayload): void;
  notifyConversation(conversationId: string, target: string, payload: unknown): void;
}

export interface IPasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, passwordHash: string): Promise<boolean>;
}

export interface ITokenService {
  sign(payload: SessionPayload): Promise<string>;
  verify(token: string): Promise<SessionPayload | null>;
}

export type SessionPayload = {
  userId: string;
  role: string;
  name: string;
  masterProfileId?: string;
  salonId?: string;
};

export interface IVerificationCodeGenerator {
  generate(length?: number): string;
}

export interface ICityCatalog {
  isValid(cityName: string): boolean;
  canonical(cityName: string): string | null;
  list(prefix?: string): string[];
}

export interface IUserRepository {
  getById(id: string): Promise<User | null>;
  getByEmail(email: string): Promise<User | null>;
  add(user: User): Promise<void>;
  markEmailVerified(id: string): Promise<void>;
  updateCity(id: string, city: string): Promise<void>;
  updatePasswordHash(id: string, passwordHash: string): Promise<void>;
  listCities(prefix?: string): Promise<string[]>;
}

export interface IEmailVerificationRepository {
  getActiveByEmail(email: string): Promise<EmailVerification | null>;
  add(verification: EmailVerification): Promise<void>;
  markUsed(id: string): Promise<void>;
}

export interface IRefreshTokenRepository {
  getByTokenHash(tokenHash: string): Promise<RefreshTokenRecord | null>;
  add(record: RefreshTokenRecord): Promise<void>;
  claimIfActive(id: string, revokedAt: Date): Promise<boolean>;
  setReplacedBy(id: string, replacedById: string): Promise<void>;
  revokeFamily(familyId: string, revokedAt: Date): Promise<void>;
  revokeAllForUser(userId: string, revokedAt: Date): Promise<void>;
}

export type SalonSearchQuery = {
  name?: string;
  category?: string;
  city?: string;
};

export interface ISalonRepository {
  getById(id: string): Promise<Salon | null>;
  search(query?: SalonSearchQuery): Promise<Salon[]>;
  listIds(): Promise<string[]>;
  add(salon: Salon): Promise<void>;
  update(salon: Salon): Promise<void>;
  updateRating(id: string, rating: number, ratingCount: number): Promise<void>;
}

export interface ISalonAdminRepository {
  getByUserId(userId: string): Promise<{ id: string; userId: string; salonId: string } | null>;
  isAdminOfSalon(userId: string, salonId: string): Promise<boolean>;
  add(link: { id: string; userId: string; salonId: string }): Promise<void>;
}

export interface IMasterProfileRepository {
  getById(id: string): Promise<MasterProfile | null>;
  getByUserId(userId: string): Promise<MasterProfile | null>;
  getBySalonId(salonId: string): Promise<MasterProfile[]>;
  listIds(): Promise<string[]>;
  listTopRated(limit: number, city?: string): Promise<MasterProfile[]>;
  add(profile: MasterProfile): Promise<void>;
  update(profile: MasterProfile): Promise<void>;
  updateRating(id: string, rating: number, ratingCount: number): Promise<void>;
}

export interface IServiceRepository {
  getById(id: string): Promise<Service | null>;
  getBySalonId(salonId: string, activeOnly?: boolean): Promise<Service[]>;
  add(service: Service): Promise<void>;
  update(service: Service): Promise<void>;
}

export interface IMasterServiceRepository {
  exists(masterProfileId: string, serviceId: string): Promise<boolean>;
  getServicesForMaster(masterProfileId: string): Promise<Service[]>;
  add(link: { id: string; masterProfileId: string; serviceId: string }): Promise<void>;
  remove(masterProfileId: string, serviceId: string): Promise<void>;
}

export interface IMasterTimeSlotRepository {
  getById(id: string): Promise<MasterTimeSlot | null>;
  getByMasterAndDate(masterId: string, date: string): Promise<MasterTimeSlot[]>;
  getBySalonAndDate(salonId: string, date: string): Promise<MasterTimeSlot[]>;
  add(slot: MasterTimeSlot): Promise<void>;
  addMany(slots: MasterTimeSlot[]): Promise<void>;
  delete(id: string): Promise<void>;
  updateStatus(id: string, status: TimeSlotStatus): Promise<void>;
}

export interface IAppointmentRepository {
  getById(id: string): Promise<Appointment | null>;
  getByClientId(clientId: string): Promise<Appointment[]>;
  getByMasterAndDate(masterId: string, date: string): Promise<Appointment[]>;
  getActiveByMasterAndDate(masterId: string, date: string): Promise<Appointment[]>;
  getBySalonAndDate(salonId: string, date: string): Promise<Appointment[]>;
  getOverlapping(input: {
    timeSlotId: string;
    date: string;
    startTime: string;
    endTime: string;
  }): Promise<Appointment | null>;
  createExclusive(appointment: Omit<Appointment, "salonName" | "clientName" | "masterName" | "serviceName" | "price"> & { price?: number }): Promise<"ok" | "conflict">;
  updateStatus(id: string, status: AppointmentStatus): Promise<void>;
  list(filter: AppointmentListFilter): Promise<Appointment[]>;
}

export type AppointmentListFilter = {
  clientId?: string;
  masterId?: string;
  salonId?: string;
  timeSlotId?: string;
  status?: AppointmentStatus;
  from?: Date;
  to?: Date;
  withoutReview?: boolean;
};

export interface IInboxRepository {
  add(message: InboxMessage): Promise<void>;
  listByUser(userId: string): Promise<InboxMessage[]>;
  unreadCount(userId: string): Promise<number>;
  getById(id: string): Promise<InboxMessage | null>;
  markRead(id: string, readAt: Date): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface IReviewRepository {
  add(review: Review): Promise<void>;
  update(review: Review): Promise<void>;
  delete(id: string): Promise<void>;
  getById(id: string): Promise<Review | null>;
  getByAppointmentId(appointmentId: string): Promise<Review | null>;
  listByClient(clientId: string): Promise<Review[]>;
  listBySalon(salonId: string): Promise<Review[]>;
  listByMaster(masterId: string): Promise<Review[]>;
  listLowRating(salonId?: string): Promise<Review[]>;
}

export interface IWeeklyTemplateRepository {
  add(template: WeeklyTemplate): Promise<void>;
  update(template: WeeklyTemplate): Promise<void>;
  delete(id: string): Promise<void>;
  getById(id: string): Promise<WeeklyTemplate | null>;
  listByMaster(masterId: string): Promise<WeeklyTemplate[]>;
}

export interface ISubscriptionRepository {
  add(item: MasterSubscription): Promise<void>;
  delete(id: string): Promise<void>;
  getById(id: string): Promise<MasterSubscription | null>;
  getByClientAndMaster(clientId: string, masterId: string): Promise<MasterSubscription | null>;
  listByClient(clientId: string): Promise<MasterSubscription[]>;
}

export interface IConversationRepository {
  add(conversation: Conversation): Promise<void>;
  delete(id: string): Promise<void>;
  getById(id: string): Promise<Conversation | null>;
  getByParticipants(a: string, b: string): Promise<Conversation | null>;
  listByUser(userId: string, search?: string): Promise<Conversation[]>;
}

export interface IChatMessageRepository {
  add(message: ChatMessage): Promise<void>;
  update(message: ChatMessage): Promise<void>;
  delete(id: string): Promise<void>;
  getById(id: string): Promise<ChatMessage | null>;
  listByConversation(conversationId: string): Promise<ChatMessage[]>;
  unreadCount(userId: string): Promise<number>;
}

export interface ISalonPhotoRepository {
  add(photo: SalonPhoto): Promise<void>;
  delete(id: string): Promise<void>;
  getById(id: string): Promise<SalonPhoto | null>;
  listBySalon(salonId: string): Promise<SalonPhoto[]>;
}

export interface IDailyStatsRepository {
  upsertSalon(stat: DailySalonStat): Promise<void>;
  upsertMaster(stat: DailyMasterStat): Promise<void>;
  listSalon(salonId: string, fromDate: string, toDateExclusive: string): Promise<DailySalonStat[]>;
  listMaster(masterId: string, fromDate: string, toDateExclusive: string): Promise<DailyMasterStat[]>;
}

export interface IStatsJobRunRepository {
  get(statDate: string): Promise<StatsJobRun | null>;
  claim(statDate: string, now: Date, leaseUntil: Date, workerId: string): Promise<boolean>;
  renewLease(statDate: string, leaseUntil: Date, workerId: string): Promise<void>;
  markCompleted(statDate: string, now: Date): Promise<void>;
  markFailed(statDate: string, now: Date, error: string): Promise<void>;
}

export interface IJobScheduler {
  everyDayAt(hour: number, minute: number, timeZone: string, task: () => Promise<void>): void;
  stop(): void;
}
