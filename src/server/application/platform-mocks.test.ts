import { describe, expect, it, vi } from "vitest";
import { CatalogService } from "@/server/application/master-catalog-service";
import {
  ChatService,
  ReviewService,
  InboxService,
  PhotoService,
  StatsService,
  SubscriptionService,
} from "@/server/application/platform-services";
import { AppointmentStatus, InboxMessageType, MessageAudience, UserRole } from "@/server/domain/types";
import type {
  IAppointmentRepository,
  IChatMessageRepository,
  IClock,
  IConversationRepository,
  IInboxRepository,
  IMasterProfileRepository,
  IReviewRepository,
  ISalonAdminRepository,
  ISalonPhotoRepository,
  ISalonRepository,
  IServiceRepository,
  ISubscriptionRepository,
  IUserRepository,
} from "@/server/application/ports";
import { codes, hasher, mockNotifier, tokens } from "@/server/test/harness";
import { createApp } from "@/server/application/create-app";
import { createInMemoryRepos } from "@/server/infrastructure/memory-repositories";

const clock: IClock = { utcNow: () => new Date("2026-09-03T12:00:00.000Z") };

describe("ReviewService with mocked ports", () => {
  it("rejects a review for another client's appointment", async () => {
    const reviews = { getByAppointmentId: vi.fn(), add: vi.fn() } as unknown as IReviewRepository;
    const appointments = {
      getById: vi.fn().mockResolvedValue({
        id: "apt",
        clientId: "owner",
        status: AppointmentStatus.Completed,
        salonId: "salon",
        masterId: "master",
      }),
    } as unknown as IAppointmentRepository;
    const service = new ReviewService(reviews, appointments, {} as ISalonRepository, {} as IMasterProfileRepository, clock);
    const result = await service.create("intruder", { appointmentId: "apt", salonRating: 5, masterRating: 5 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("только по своей записи");
    expect(reviews.add).not.toHaveBeenCalled();
  });

  it("writes a review and updates both ratings", async () => {
    const reviews = {
      getByAppointmentId: vi.fn().mockResolvedValue(null),
      add: vi.fn(),
    } as unknown as IReviewRepository;
    const appointments = {
      getById: vi.fn().mockResolvedValue({
        id: "apt",
        clientId: "client",
        status: AppointmentStatus.Completed,
        salonId: "salon",
        masterId: "master",
      }),
    } as unknown as IAppointmentRepository;
    const salons = {
      getById: vi.fn().mockResolvedValue({ id: "salon", rating: 0, ratingCount: 0 }),
      updateRating: vi.fn(),
    } as unknown as ISalonRepository;
    const masters = {
      getById: vi.fn().mockResolvedValue({ id: "master", rating: 0, ratingCount: 0 }),
      updateRating: vi.fn(),
    } as unknown as IMasterProfileRepository;
    const service = new ReviewService(reviews, appointments, salons, masters, clock);
    const result = await service.create("client", { appointmentId: "apt", salonRating: 5, masterRating: 4 });
    expect(result.ok).toBe(true);
    expect(reviews.add).toHaveBeenCalledOnce();
    expect(salons.updateRating).toHaveBeenCalledWith("salon", 5, 1);
    expect(masters.updateRating).toHaveBeenCalledWith("master", 4, 1);
  });

  it("does not list low ratings without a salon id", async () => {
    const reviews = { listLowRating: vi.fn() } as unknown as IReviewRepository;
    const service = new ReviewService(reviews, {} as IAppointmentRepository, {} as ISalonRepository, {} as IMasterProfileRepository, clock);
    const result = await service.lowRating("");
    expect(result.ok).toBe(false);
    expect(reviews.listLowRating).not.toHaveBeenCalled();
  });
});

describe("InboxService with mocked notifier", () => {
  it("persists a message and notifies the user", async () => {
    const inbox = { add: vi.fn() } as unknown as IInboxRepository;
    const notifier = mockNotifier();
    const service = new InboxService(inbox, notifier, clock);
    const result = await service.send({
      userId: "u1",
      content: "Запись создана",
      type: InboxMessageType.CreationAppointment,
      audience: MessageAudience.User,
      appointmentId: "apt",
    });
    expect(result.ok).toBe(true);
    expect(inbox.add).toHaveBeenCalledOnce();
    expect(notifier.notifyUser).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({ Message: "Запись создана" }),
    );
  });

  it("does not mark another user's message as read", async () => {
    const inbox = {
      getById: vi.fn().mockResolvedValue({ id: "m1", userId: "owner" }),
      markRead: vi.fn(),
    } as unknown as IInboxRepository;
    const service = new InboxService(inbox, mockNotifier(), clock);
    const result = await service.markRead("other", "m1");
    expect(result.ok).toBe(false);
    expect(inbox.markRead).not.toHaveBeenCalled();
  });
});

describe("PhotoService with mocked ports", () => {
  it("rejects a javascript URL", async () => {
    const photos = { listBySalon: vi.fn(), add: vi.fn() } as unknown as ISalonPhotoRepository;
    const admins = { isAdminOfSalon: vi.fn().mockResolvedValue(true) } as unknown as ISalonAdminRepository;
    const service = new PhotoService(photos, admins);
    const result = await service.add("admin", "salon", "javascript:alert(1)");
    expect(result.ok).toBe(false);
    expect(photos.add).not.toHaveBeenCalled();
  });

  it("rejects path traversal in upload URLs", async () => {
    const photos = { listBySalon: vi.fn(), add: vi.fn() } as unknown as ISalonPhotoRepository;
    const admins = { isAdminOfSalon: vi.fn().mockResolvedValue(true) } as unknown as ISalonAdminRepository;
    const service = new PhotoService(photos, admins);
    const result = await service.add("admin", "salon", "/uploads/../.env");
    expect(result.ok).toBe(false);
    expect(photos.add).not.toHaveBeenCalled();
  });
});

describe("SubscriptionService with mocked ports", () => {
  it("rejects a master who tries to subscribe", async () => {
    const users = {
      getById: vi.fn().mockResolvedValue({ id: "m", role: UserRole.Master }),
    } as unknown as IUserRepository;
    const service = new SubscriptionService(
      {} as ISubscriptionRepository,
      {} as IMasterProfileRepository,
      {} as ISalonRepository,
      users,
    );
    const result = await service.add("m", "master-profile");
    expect(result.ok).toBe(false);
  });
});

describe("ChatService with mocked ports", () => {
  it("returns messages with readAt set for the viewer", async () => {
    const now = new Date("2026-09-03T12:00:00.000Z");
    const conversations = {
      getById: vi.fn().mockResolvedValue({ id: "c1", participant1Id: "a", participant2Id: "b" }),
    } as unknown as IConversationRepository;
    const unread = {
      id: "m1",
      conversationId: "c1",
      senderId: "a",
      senderName: "A",
      body: "hi",
      createdAt: now,
      readAt: null,
    };
    const messages = {
      listByConversation: vi.fn().mockResolvedValue([unread]),
      update: vi.fn(),
    } as unknown as IChatMessageRepository;
    const service = new ChatService(conversations, messages, {} as IUserRepository, mockNotifier(), {
      utcNow: () => now,
    });
    const result = await service.listMessages("b", "c1");
    expect(result.ok && result.value[0]?.readAt).toEqual(now);
    expect(messages.update).toHaveBeenCalledWith(expect.objectContaining({ id: "m1", readAt: now }));
  });

  it("rejects a non-uuid peer without hitting the user repository", async () => {
    const users = { getById: vi.fn() } as unknown as IUserRepository;
    const service = new ChatService(
      {} as IConversationRepository,
      {} as IChatMessageRepository,
      users,
      mockNotifier(),
      clock,
    );
    const result = await service.create("11111111-1111-4111-8111-111111111111", "not-a-uuid");
    expect(result.ok).toBe(false);
    expect(users.getById).not.toHaveBeenCalled();
  });

  it("notifies the conversation when a message is deleted", async () => {
    const notifier = mockNotifier();
    const messages = {
      getById: vi.fn().mockResolvedValue({ id: "m1", senderId: "a", conversationId: "c1" }),
      delete: vi.fn(),
    } as unknown as IChatMessageRepository;
    const service = new ChatService(
      {} as IConversationRepository,
      messages,
      {} as IUserRepository,
      notifier,
      clock,
    );
    const result = await service.deleteMessage("a", "m1");
    expect(result.ok).toBe(true);
    expect(messages.delete).toHaveBeenCalledWith("m1");
    expect(notifier.notifyConversation).toHaveBeenCalledWith("c1", "MessageDeleted", { id: "m1" });
  });
});

describe("StatsService with mocked clock", () => {
  it("uses IClock when the period date is omitted", async () => {
    const list = vi.fn().mockResolvedValue([]);
    const appointments = { list } as unknown as IAppointmentRepository;
    const masters = {
      getById: vi.fn().mockResolvedValue({ id: "m", salonId: "s", userId: "u" }),
    } as unknown as IMasterProfileRepository;
    const frozen = { utcNow: () => new Date("2026-01-15T12:00:00.000Z") };
    const dailyStats = { listMaster: vi.fn().mockResolvedValue([]) };
    const service = new StatsService(appointments, masters, frozen, dailyStats as never);
    await service.mine(
      { userId: "u", role: UserRole.Master, name: "Мастер", masterProfileId: "m" },
      "week",
    );
    const arg = list.mock.calls[0]![0] as { masterId: string; from: Date; to: Date };
    expect(arg.masterId).toBe("m");
    expect(arg.from.toISOString().startsWith("2026-01-12")).toBe(true);
  });
});

describe("CatalogService with mocked ports", () => {
  it("rejects a traversing service photo URL", async () => {
    const services = { add: vi.fn() } as unknown as IServiceRepository;
    const admins = { isAdminOfSalon: vi.fn().mockResolvedValue(true) } as unknown as ISalonAdminRepository;
    const catalog = new CatalogService(services, admins);
    const result = await catalog.create("admin", "salon", {
      name: "Стрижка",
      durationMinutes: 30,
      price: 1000,
      photoUrl: "/uploads/../.env",
    });
    expect(result.ok).toBe(false);
    expect(services.add).not.toHaveBeenCalled();
  });
});

describe("createApp composition", () => {
  it("runs without an injected notifier", async () => {
    const app = createApp({
      ...createInMemoryRepos(),
      hasher,
      tokens,
      codes,
      clock,
    });
    const result = await app.inbox.send({
      userId: "u1",
      content: "ok",
      type: InboxMessageType.CreationAppointment,
      audience: MessageAudience.User,
    });
    expect(result.ok).toBe(true);
  });
});
