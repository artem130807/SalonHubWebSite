import { createApp, BcryptPasswordHasher, JoseTokenService, NumericCodeGenerator, SystemClock } from "@/server/application/create-app";
import {
  prismaAppointments,
  prismaMasters,
  prismaMasterServices,
  prismaRefreshTokens,
  prismaSalonAdmins,
  prismaSalons,
  prismaServices,
  prismaTimeSlots,
  prismaUsers,
  prismaVerifications,
} from "@/server/infrastructure/prisma-repositories";
import {
  prismaChatMessages,
  prismaConversations,
  prismaInbox,
  prismaPhotos,
  prismaReviews,
  prismaSubscriptions,
  prismaTemplates,
} from "@/server/infrastructure/prisma-platform-repositories";
import { prismaDailyStats, prismaStatsJobRuns } from "@/server/infrastructure/prisma-stats-repositories";
import { realtimeHub } from "@/server/realtime/hub";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "change-this-to-a-long-dev-secret-key-32chars!",
);

let app: ReturnType<typeof createApp> | undefined;

export function getApp() {
  app ??= createApp({
    users: prismaUsers,
    verifications: prismaVerifications,
    salons: prismaSalons,
    salonAdmins: prismaSalonAdmins,
    masters: prismaMasters,
    services: prismaServices,
    masterServices: prismaMasterServices,
    timeSlots: prismaTimeSlots,
    appointments: prismaAppointments,
    refreshTokens: prismaRefreshTokens,
    inbox: prismaInbox,
    reviews: prismaReviews,
    templates: prismaTemplates,
    subscriptions: prismaSubscriptions,
    conversations: prismaConversations,
    chatMessages: prismaChatMessages,
    photos: prismaPhotos,
    dailyStats: prismaDailyStats,
    statsJobRuns: prismaStatsJobRuns,
    hasher: new BcryptPasswordHasher(),
    tokens: new JoseTokenService(secret),
    codes: new NumericCodeGenerator(),
    clock: new SystemClock(),
    notifier: realtimeHub,
  });
  return app;
}
