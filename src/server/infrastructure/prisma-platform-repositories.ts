import type {
  ChatMessage,
  Conversation,
  InboxMessage,
  MasterSubscription,
  Review,
  SalonPhoto,
  SalonPromotion,
  WeeklyTemplate,
} from "@/server/domain/types";
import type {
  IChatMessageRepository,
  IConversationRepository,
  IInboxRepository,
  IPortfolioRepository,
  IPromotionRepository,
  IReviewRepository,
  ISalonPhotoRepository,
  ISubscriptionRepository,
  IWeeklyTemplateRepository,
} from "@/server/application/ports";
import { prisma } from "@/server/infrastructure/prisma";

function mapInbox(row: InboxMessage): InboxMessage {
  return row;
}

function mapReview(row: {
  id: string;
  appointmentId: string;
  clientId: string;
  salonId: string;
  masterId: string;
  salonRating: number;
  masterRating: number;
  comment: string | null;
  createdAt: Date;
  salon?: { name: string };
  master?: { user: { name: string } };
  client?: { name: string };
}): Review {
  return {
    id: row.id,
    appointmentId: row.appointmentId,
    clientId: row.clientId,
    salonId: row.salonId,
    masterId: row.masterId,
    salonRating: row.salonRating,
    masterRating: row.masterRating,
    comment: row.comment,
    createdAt: row.createdAt,
    salonName: row.salon?.name,
    masterName: row.master?.user.name,
    clientName: row.client?.name,
  };
}

function mapTemplate(row: {
  id: string;
  masterId: string;
  name: string;
  days: { id: string; weekday: number; startTime: string; endTime: string }[];
}): WeeklyTemplate {
  return row;
}

function mapConversation(row: {
  id: string;
  participant1Id: string;
  participant2Id: string;
  createdAt: Date;
  participant1: { name: string };
  participant2: { name: string };
}): Conversation {
  return {
    id: row.id,
    participant1Id: row.participant1Id,
    participant2Id: row.participant2Id,
    participant1Name: row.participant1.name,
    participant2Name: row.participant2.name,
    createdAt: row.createdAt,
  };
}

function mapChatMessage(row: {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: Date;
  readAt: Date | null;
  sender: { name: string };
}): ChatMessage {
  return {
    id: row.id,
    conversationId: row.conversationId,
    senderId: row.senderId,
    senderName: row.sender.name,
    body: row.body,
    createdAt: row.createdAt,
    readAt: row.readAt,
  };
}

export const prismaInbox: IInboxRepository = {
  add: async (message) => {
    await prisma.inboxMessage.create({
      data: {
        id: message.id,
        userId: message.userId,
        appointmentId: message.appointmentId,
        content: message.content,
        type: message.type,
        audience: message.audience,
        readAt: message.readAt,
        createdAt: message.createdAt,
      },
    });
  },
  listByUser: async (userId) => {
    const rows = await prisma.inboxMessage.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapInbox);
  },
  unreadCount: async (userId) => prisma.inboxMessage.count({ where: { userId, readAt: null } }),
  getById: async (id) => {
    const row = await prisma.inboxMessage.findUnique({ where: { id } });
    return row ? mapInbox(row) : null;
  },
  markRead: async (id, readAt) => {
    await prisma.inboxMessage.update({ where: { id }, data: { readAt } });
  },
  delete: async (id) => {
    await prisma.inboxMessage.delete({ where: { id } });
  },
};

export const prismaReviews: IReviewRepository = {
  add: async (review) => {
    await prisma.review.create({
      data: {
        id: review.id,
        appointmentId: review.appointmentId,
        clientId: review.clientId,
        salonId: review.salonId,
        masterId: review.masterId,
        salonRating: review.salonRating,
        masterRating: review.masterRating,
        comment: review.comment,
        createdAt: review.createdAt,
      },
    });
  },
  update: async (review) => {
    await prisma.review.update({
      where: { id: review.id },
      data: {
        salonRating: review.salonRating,
        masterRating: review.masterRating,
        comment: review.comment,
      },
    });
  },
  delete: async (id) => {
    await prisma.review.delete({ where: { id } });
  },
  getById: async (id) => {
    const row = await prisma.review.findUnique({
      where: { id },
      include: { salon: true, master: { include: { user: true } }, client: true },
    });
    return row ? mapReview(row) : null;
  },
  getByAppointmentId: async (appointmentId) => {
    const row = await prisma.review.findUnique({
      where: { appointmentId },
      include: { salon: true, master: { include: { user: true } }, client: true },
    });
    return row ? mapReview(row) : null;
  },
  listByClient: async (clientId) => {
    const rows = await prisma.review.findMany({
      where: { clientId },
      include: { salon: true, master: { include: { user: true } }, client: true },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapReview);
  },
  listBySalon: async (salonId) => {
    const rows = await prisma.review.findMany({
      where: { salonId },
      include: { salon: true, master: { include: { user: true } }, client: true },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapReview);
  },
  listByMaster: async (masterId) => {
    const rows = await prisma.review.findMany({
      where: { masterId },
      include: { salon: true, master: { include: { user: true } }, client: true },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapReview);
  },
  listLowRating: async (salonId) => {
    const rows = await prisma.review.findMany({
      where: {
        salonId: salonId || undefined,
        OR: [{ salonRating: { lte: 3 } }, { masterRating: { lte: 3 } }],
      },
      include: { salon: true, master: { include: { user: true } }, client: true },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapReview);
  },
};

export const prismaTemplates: IWeeklyTemplateRepository = {
  add: async (template) => {
    await prisma.weeklyTemplate.create({
      data: {
        id: template.id,
        masterId: template.masterId,
        name: template.name,
        days: {
          create: template.days.map((day) => ({
            id: day.id,
            weekday: day.weekday,
            startTime: day.startTime,
            endTime: day.endTime,
          })),
        },
      },
    });
  },
  update: async (template) => {
    await prisma.$transaction([
      prisma.templateDay.deleteMany({ where: { templateId: template.id } }),
      prisma.weeklyTemplate.update({
        where: { id: template.id },
        data: {
          name: template.name,
          days: {
            create: template.days.map((day) => ({
              id: day.id,
              weekday: day.weekday,
              startTime: day.startTime,
              endTime: day.endTime,
            })),
          },
        },
      }),
    ]);
  },
  delete: async (id) => {
    await prisma.weeklyTemplate.delete({ where: { id } });
  },
  getById: async (id) => {
    const row = await prisma.weeklyTemplate.findUnique({ where: { id }, include: { days: true } });
    return row ? mapTemplate(row) : null;
  },
  listByMaster: async (masterId) => {
    const rows = await prisma.weeklyTemplate.findMany({
      where: { masterId },
      include: { days: true },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapTemplate);
  },
};

export const prismaSubscriptions: ISubscriptionRepository = {
  add: async (item) => {
    await prisma.masterSubscription.create({
      data: { id: item.id, clientId: item.clientId, masterId: item.masterId },
    });
  },
  delete: async (id) => {
    await prisma.masterSubscription.delete({ where: { id } });
  },
  getById: async (id) => {
    const row = await prisma.masterSubscription.findUnique({
      where: { id },
      include: { master: { include: { user: true, salon: true } } },
    });
    if (!row) return null;
    return {
      id: row.id,
      clientId: row.clientId,
      masterId: row.masterId,
      masterName: row.master.user.name,
      salonName: row.master.salon.name,
    };
  },
  getByClientAndMaster: async (clientId, masterId) => {
    const row = await prisma.masterSubscription.findUnique({
      where: { clientId_masterId: { clientId, masterId } },
      include: { master: { include: { user: true, salon: true } } },
    });
    if (!row) return null;
    return {
      id: row.id,
      clientId: row.clientId,
      masterId: row.masterId,
      masterName: row.master.user.name,
      salonName: row.master.salon.name,
    };
  },
  listByClient: async (clientId) => {
    const rows = await prisma.masterSubscription.findMany({
      where: { clientId },
      include: { master: { include: { user: true, salon: true } } },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => ({
      id: row.id,
      clientId: row.clientId,
      masterId: row.masterId,
      masterName: row.master.user.name,
      salonName: row.master.salon.name,
    }));
  },
};

export const prismaConversations: IConversationRepository = {
  add: async (conversation) => {
    await prisma.conversation.create({
      data: {
        id: conversation.id,
        participant1Id: conversation.participant1Id,
        participant2Id: conversation.participant2Id,
        createdAt: conversation.createdAt,
      },
    });
  },
  delete: async (id) => {
    await prisma.conversation.delete({ where: { id } });
  },
  getById: async (id) => {
    const row = await prisma.conversation.findUnique({
      where: { id },
      include: { participant1: true, participant2: true },
    });
    return row ? mapConversation(row) : null;
  },
  getByParticipants: async (a, b) => {
    const row = await prisma.conversation.findFirst({
      where: {
        OR: [
          { participant1Id: a, participant2Id: b },
          { participant1Id: b, participant2Id: a },
        ],
      },
      include: { participant1: true, participant2: true },
    });
    return row ? mapConversation(row) : null;
  },
  listByUser: async (userId, search) => {
    const term = search?.trim();
    const rows = await prisma.conversation.findMany({
      where: {
        AND: [
          { OR: [{ participant1Id: userId }, { participant2Id: userId }] },
          term
            ? {
                OR: [
                  { participant1: { name: { contains: term, mode: "insensitive" } } },
                  { participant2: { name: { contains: term, mode: "insensitive" } } },
                ],
              }
            : {},
        ],
      },
      include: { participant1: true, participant2: true },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapConversation);
  },
};

export const prismaChatMessages: IChatMessageRepository = {
  add: async (message) => {
    await prisma.chatMessage.create({
      data: {
        id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        body: message.body,
        createdAt: message.createdAt,
        readAt: message.readAt,
      },
    });
  },
  update: async (message) => {
    await prisma.chatMessage.update({
      where: { id: message.id },
      data: { body: message.body, readAt: message.readAt },
    });
  },
  delete: async (id) => {
    await prisma.chatMessage.delete({ where: { id } });
  },
  getById: async (id) => {
    const row = await prisma.chatMessage.findUnique({ where: { id }, include: { sender: true } });
    return row ? mapChatMessage(row) : null;
  },
  listByConversation: async (conversationId) => {
    const rows = await prisma.chatMessage.findMany({
      where: { conversationId },
      include: { sender: true },
      orderBy: { createdAt: "asc" },
    });
    return rows.map(mapChatMessage);
  },
  unreadCount: async (userId) =>
    prisma.chatMessage.count({
      where: {
        senderId: { not: userId },
        readAt: null,
        conversation: { OR: [{ participant1Id: userId }, { participant2Id: userId }] },
      },
    }),
};

export const prismaPhotos: ISalonPhotoRepository = {
  add: async (photo) => {
    await prisma.salonPhoto.create({ data: { id: photo.id, salonId: photo.salonId, url: photo.url } });
  },
  delete: async (id) => {
    await prisma.salonPhoto.delete({ where: { id } });
  },
  getById: async (id) => prisma.salonPhoto.findUnique({ where: { id } }),
  listBySalon: async (salonId) =>
    prisma.salonPhoto.findMany({ where: { salonId }, orderBy: { createdAt: "asc" } }),
};

function mapPromotion(row: {
  id: string;
  salonId: string;
  title: string;
  description: string | null;
  discountPercent: number;
  serviceId: string | null;
  imageUrl: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  service?: { name: string } | null;
}): SalonPromotion {
  return {
    id: row.id,
    salonId: row.salonId,
    title: row.title,
    description: row.description,
    discountPercent: row.discountPercent,
    serviceId: row.serviceId,
    serviceName: row.service?.name ?? null,
    imageUrl: row.imageUrl,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    isActive: row.isActive,
    createdAt: row.createdAt,
  };
}

export const prismaPromotions: IPromotionRepository = {
  add: async (promotion) => {
    await prisma.salonPromotion.create({
      data: {
        id: promotion.id,
        salonId: promotion.salonId,
        title: promotion.title,
        description: promotion.description,
        discountPercent: promotion.discountPercent,
        serviceId: promotion.serviceId,
        imageUrl: promotion.imageUrl,
        startsAt: promotion.startsAt,
        endsAt: promotion.endsAt,
        isActive: promotion.isActive,
        createdAt: promotion.createdAt,
      },
    });
  },
  update: async (promotion) => {
    await prisma.salonPromotion.update({
      where: { id: promotion.id },
      data: {
        title: promotion.title,
        description: promotion.description,
        discountPercent: promotion.discountPercent,
        serviceId: promotion.serviceId,
        imageUrl: promotion.imageUrl,
        startsAt: promotion.startsAt,
        endsAt: promotion.endsAt,
        isActive: promotion.isActive,
      },
    });
  },
  delete: async (id) => {
    await prisma.salonPromotion.delete({ where: { id } });
  },
  getById: async (id) => {
    const row = await prisma.salonPromotion.findUnique({ where: { id }, include: { service: true } });
    return row ? mapPromotion(row) : null;
  },
  listBySalon: async (salonId) => {
    const rows = await prisma.salonPromotion.findMany({
      where: { salonId },
      include: { service: true },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapPromotion);
  },
  listBySalonIds: async (salonIds) => {
    if (salonIds.length === 0) return [];
    const rows = await prisma.salonPromotion.findMany({
      where: { salonId: { in: salonIds } },
      include: { service: true },
    });
    return rows.map(mapPromotion);
  },
};

export const prismaPortfolio: IPortfolioRepository = {
  add: async (photo) => {
    await prisma.portfolioPhoto.create({
      data: {
        id: photo.id,
        masterId: photo.masterId,
        url: photo.url,
        caption: photo.caption,
        sortOrder: photo.sortOrder,
        createdAt: photo.createdAt,
      },
    });
  },
  delete: async (id) => {
    await prisma.portfolioPhoto.delete({ where: { id } });
  },
  getById: async (id) => prisma.portfolioPhoto.findUnique({ where: { id } }),
  listByMaster: async (masterId) =>
    prisma.portfolioPhoto.findMany({
      where: { masterId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
  listByMasterIds: async (masterIds) => {
    if (masterIds.length === 0) return [];
    return prisma.portfolioPhoto.findMany({
      where: { masterId: { in: masterIds } },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  },
};
