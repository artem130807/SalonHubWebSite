import type {
  IAppointmentRepository,
  IChatMessageRepository,
  IClock,
  IConversationRepository,
  IDailyStatsRepository,
  IEmailVerificationRepository,
  IInboxRepository,
  IMasterProfileRepository,
  IMasterServiceRepository,
  IMasterTimeSlotRepository,
  INotifier,
  IPasswordHasher,
  IRefreshTokenRepository,
  IReviewRepository,
  ISalonAdminRepository,
  ISalonPhotoRepository,
  ISalonRepository,
  IServiceRepository,
  IStatsJobRunRepository,
  ISubscriptionRepository,
  ITokenService,
  IUserRepository,
  IVerificationCodeGenerator,
  IWeeklyTemplateRepository,
  SessionPayload,
} from "@/server/application/ports";
import { AuthService } from "@/server/application/auth-service";
import { CatalogService, MasterManagementService } from "@/server/application/master-catalog-service";
import { SalonService } from "@/server/application/salon-service";
import { AppointmentService, TimeSlotService } from "@/server/application/booking-services";
import {
  ChatService,
  InboxService,
  PhotoService,
  ProfileService,
  ReviewService,
  StatsService,
  SubscriptionService,
  TemplateService,
} from "@/server/application/platform-services";
import { DailyStatsJobService } from "@/server/application/daily-stats-job";

const silentNotifier: INotifier = {
  notifyUser() {},
  notifyConversation() {},
};

export type AppDeps = {
  users: IUserRepository;
  verifications: IEmailVerificationRepository;
  salons: ISalonRepository;
  salonAdmins: ISalonAdminRepository;
  masters: IMasterProfileRepository;
  services: IServiceRepository;
  masterServices: IMasterServiceRepository;
  timeSlots: IMasterTimeSlotRepository;
  appointments: IAppointmentRepository;
  refreshTokens: IRefreshTokenRepository;
  inbox: IInboxRepository;
  reviews: IReviewRepository;
  templates: IWeeklyTemplateRepository;
  subscriptions: ISubscriptionRepository;
  conversations: IConversationRepository;
  chatMessages: IChatMessageRepository;
  photos: ISalonPhotoRepository;
  dailyStats: IDailyStatsRepository;
  statsJobRuns: IStatsJobRunRepository;
  hasher: IPasswordHasher;
  tokens: ITokenService;
  codes: IVerificationCodeGenerator;
  clock: IClock;
  notifier?: INotifier;
};

export type AppServices = ReturnType<typeof createApp>;

export function createApp(deps: AppDeps) {
  const notifier = deps.notifier ?? silentNotifier;
  const auth = new AuthService(
    deps.users,
    deps.verifications,
    deps.masters,
    deps.salonAdmins,
    deps.refreshTokens,
    deps.hasher,
    deps.tokens,
    deps.codes,
    deps.clock,
  );
  const salons = new SalonService(
    deps.salons,
    deps.salonAdmins,
    deps.users,
    deps.timeSlots,
    deps.appointments,
    deps.clock,
    deps.photos,
    deps.services,
  );
  const masters = new MasterManagementService(
    deps.masters,
    deps.masterServices,
    deps.services,
    deps.salonAdmins,
    deps.users,
    deps.hasher,
    deps.clock,
  );
  const catalog = new CatalogService(deps.services, deps.salonAdmins);
  const timeSlots = new TimeSlotService(
    deps.timeSlots,
    deps.masters,
    deps.appointments,
    deps.services,
    deps.clock,
  );
  const inbox = new InboxService(deps.inbox, notifier, deps.clock);
  const appointments = new AppointmentService(
    deps.appointments,
    deps.services,
    deps.masterServices,
    deps.timeSlots,
    deps.masters,
    deps.users,
    timeSlots,
    inbox,
    deps.clock,
  );
  const chat = new ChatService(deps.conversations, deps.chatMessages, deps.users, notifier, deps.clock);
  const reviews = new ReviewService(deps.reviews, deps.appointments, deps.salons, deps.masters, deps.clock);
  const templates = new TemplateService(deps.templates, deps.masters, deps.timeSlots);
  const subscriptions = new SubscriptionService(deps.subscriptions, deps.masters, deps.salons, deps.users);
  const stats = new StatsService(deps.appointments, deps.masters, deps.clock, deps.dailyStats);
  const dailyStatsJob = new DailyStatsJobService(
    deps.appointments,
    deps.salons,
    deps.masters,
    deps.dailyStats,
    deps.statsJobRuns,
    deps.clock,
  );
  const photos = new PhotoService(deps.photos, deps.salonAdmins);
  const profile = new ProfileService(deps.users, deps.hasher);

  return {
    auth,
    salons,
    masters,
    catalog,
    timeSlots,
    appointments,
    inbox,
    chat,
    reviews,
    templates,
    subscriptions,
    stats,
    dailyStatsJob,
    photos,
    profile,
    tokens: deps.tokens,
  };
}

export class SystemClock implements IClock {
  utcNow() {
    return new Date();
  }
}

export class BcryptPasswordHasher implements IPasswordHasher {
  async hash(password: string) {
    const bcrypt = await import("bcryptjs");
    return bcrypt.hash(password, 10);
  }
  async verify(password: string, passwordHash: string) {
    const bcrypt = await import("bcryptjs");
    return bcrypt.compare(password, passwordHash);
  }
}

export class NumericCodeGenerator implements IVerificationCodeGenerator {
  generate(length = 6) {
    const max = 10 ** length;
    return String(Math.floor(Math.random() * max)).padStart(length, "0");
  }
}

export class JoseTokenService implements ITokenService {
  constructor(
    private readonly secret: Uint8Array,
    private readonly expires = "15m",
  ) {}

  async sign(payload: SessionPayload) {
    const { SignJWT } = await import("jose");
    return new SignJWT({
      userId: payload.userId,
      role: payload.role,
      name: payload.name,
      masterProfileId: payload.masterProfileId ?? "",
      salonId: payload.salonId ?? "",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(this.expires)
      .sign(this.secret);
  }

  async verify(token: string) {
    try {
      const { jwtVerify } = await import("jose");
      const { payload } = await jwtVerify(token, this.secret);
      return {
        userId: String(payload.userId ?? payload.sub ?? ""),
        role: String(payload.role ?? ""),
        name: String(payload.name ?? ""),
        masterProfileId: payload.masterProfileId ? String(payload.masterProfileId) : undefined,
        salonId: payload.salonId ? String(payload.salonId) : undefined,
      };
    } catch {
      return null;
    }
  }
}
