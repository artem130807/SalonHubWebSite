import { describe, expect, it } from "vitest";
import { createApp } from "@/server/application/create-app";
import { createInMemoryRepos } from "@/server/infrastructure/memory-repositories";
import {
  AppointmentStatus,
  InboxMessageType,
  UserRole,
} from "@/server/domain/types";
import type { IClock, INotifier, IPasswordHasher, ITokenService, IVerificationCodeGenerator } from "@/server/application/ports";

class TestClock implements IClock {
  constructor(private now: Date) {}
  utcNow() {
    return this.now;
  }
}

const hasher: IPasswordHasher = {
  hash: async (password) => `hash:${password}`,
  verify: async (password, passwordHash) => passwordHash === `hash:${password}`,
};

const tokens: ITokenService = {
  sign: async (payload) => JSON.stringify(payload),
  verify: async (token) => JSON.parse(token),
};

const codes: IVerificationCodeGenerator = {
  generate: () => "123456",
};

function app(now = new Date("2026-09-03T08:00:00.000Z")) {
  const notifications: { userId: string; message: string }[] = [];
  const notifier: INotifier = {
    notifyUser(userId, payload) {
      notifications.push({ userId, message: payload.Message });
    },
    notifyConversation() {},
  };
  const repos = createInMemoryRepos();
  return {
    ...createApp({
      ...repos,
      hasher,
      tokens,
      codes,
      clock: new TestClock(now),
      notifier,
    }),
    repos,
    notifications,
  };
}

async function seed() {
  const services = app();
  const adminReg = await services.auth.register(
    { name: "Админ", email: "admin@test.com", phone: "+79991112233", password: "password1", city: "Москва", role: UserRole.SalonAdmin },
    true,
  );
  const clientReg = await services.auth.register(
    { name: "Клиент", email: "client@test.com", phone: "+79991112233", password: "password1", city: "Москва", role: UserRole.Client },
    true,
  );
  if (!adminReg.ok || !clientReg.ok) throw new Error("register failed");
  await services.auth.verifyEmail("admin@test.com", "123456");
  await services.auth.verifyEmail("client@test.com", "123456");
  const salon = await services.salons.create(adminReg.value.userId, {
    name: "Салон",
    city: "Москва",
    street: "Тверская",
    building: "1",
  });
  if (!salon.ok) throw new Error(salon.error);
  const master = await services.masters.createForSalon(adminReg.value.userId, salon.value.id, {
    name: "Мастер",
    email: "master@test.com",
    phone: "+79991112234",
    password: "password1",
    specialization: "Стрижка",
  });
  if (!master.ok) throw new Error(master.error);
  const service = await services.catalog.create(adminReg.value.userId, salon.value.id, {
    name: "Стрижка",
    durationMinutes: 30,
    price: 1000,
  });
  if (!service.ok) throw new Error(service.error);
  await services.masters.assignService(adminReg.value.userId, master.value.id, service.value.id);
  const window = await services.timeSlots.create(master.value.userId, {
    scheduleDate: "2026-09-03",
    startTime: "10:00",
    endTime: "18:00",
  });
  if (!window.ok) throw new Error(window.error);
  return { services, adminReg, clientReg, salon, master, service, window };
}

describe("platform reviews, walk-in, chat, templates", () => {
  it("notifies client and master on booking and allows a review after complete", async () => {
    const { services, clientReg, master, salon, service, window } = await seed();
    const booked = await services.appointments.create(clientReg.value.userId, {
      salonId: salon.value.id,
      masterId: master.value.id,
      serviceId: service.value.id,
      timeSlotId: window.value.id,
      startTime: "10:00",
      appointmentDate: "2026-09-03",
    });
    expect(booked.ok).toBe(true);
    if (!booked.ok) return;
    expect(services.notifications.some((n) => n.userId === clientReg.value.userId)).toBe(true);
    expect(services.notifications.some((n) => n.userId === master.value.userId)).toBe(true);
    const inbox = await services.inbox.list(clientReg.value.userId);
    expect(inbox.ok && inbox.value[0]?.type).toBe(InboxMessageType.CreationAppointment);

    const earlyReview = await services.reviews.create(clientReg.value.userId, {
      appointmentId: booked.value.id,
      salonRating: 5,
      masterRating: 5,
    });
    expect(earlyReview.ok).toBe(false);

    const completed = await services.appointments.complete(master.value.userId, booked.value.id);
    expect(completed.ok).toBe(true);
    const review = await services.reviews.create(clientReg.value.userId, {
      appointmentId: booked.value.id,
      salonRating: 5,
      masterRating: 4,
      comment: "Отлично",
    });
    expect(review.ok).toBe(true);
    const duplicate = await services.reviews.create(clientReg.value.userId, {
      appointmentId: booked.value.id,
      salonRating: 3,
      masterRating: 3,
    });
    expect(duplicate.ok).toBe(false);
    const ratedSalon = await services.salons.getById(salon.value.id);
    expect(ratedSalon.ok && ratedSalon.value.rating).toBe(5);
  });

  it("lets a master create a walk-in guest appointment", async () => {
    const { services, master, salon, service, window } = await seed();
    const walkIn = await services.appointments.createWalkIn(master.value.userId, {
      salonId: salon.value.id,
      masterId: master.value.id,
      serviceId: service.value.id,
      timeSlotId: window.value.id,
      startTime: "11:00",
      appointmentDate: "2026-09-03",
      guestName: "Гость Иван",
    });
    expect(walkIn.ok).toBe(true);
    if (!walkIn.ok) return;
    expect(walkIn.value.clientId).toBeNull();
    expect(walkIn.value.clientName).toBe("Гость Иван");
    expect(walkIn.value.status).toBe(AppointmentStatus.Confirmed);
  });

  it("creates a chat only for participants and delivers messages", async () => {
    const { services, clientReg, master } = await seed();
    const created = await services.chat.create(clientReg.value.userId, master.value.userId);
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const stranger = await services.auth.register(
      { name: "Другой", email: "other@test.com", phone: "+79991112235", password: "password1", city: "Москва", role: UserRole.Client },
      true,
    );
    expect(stranger.ok).toBe(true);
    if (!stranger.ok) return;
    await services.auth.verifyEmail("other@test.com", "123456");
    const forbidden = await services.chat.listMessages(stranger.value.userId, created.value.id);
    expect(forbidden.ok).toBe(false);
    const sent = await services.chat.send(clientReg.value.userId, created.value.id, "Привет");
    expect(sent.ok).toBe(true);
    const messages = await services.chat.listMessages(master.value.userId, created.value.id);
    expect(messages.ok && messages.value[0]?.body).toBe("Привет");
    expect(messages.ok && messages.value[0]?.readAt).toBeTruthy();
  });

  it("applies a weekly template to a date range without overlapping windows", async () => {
    const { services, master } = await seed();
    const template = await services.templates.create(master.value.userId, {
      name: "Будни",
      days: [{ weekday: 4, startTime: "09:00", endTime: "12:00" }],
    });
    expect(template.ok).toBe(true);
    if (!template.ok) return;
    const applied = await services.templates.apply(
      master.value.userId,
      template.value.id,
      "2026-09-03",
      "2026-09-10",
    );
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    expect(applied.value.some((slot) => slot.scheduleDate === "2026-09-03")).toBe(false);
    expect(applied.value.some((slot) => slot.scheduleDate === "2026-09-10" && slot.startTime === "09:00")).toBe(true);
  });

  it("computes completed revenue for master statistics", async () => {
    const { services, clientReg, master, salon, service, window } = await seed();
    const booked = await services.appointments.create(clientReg.value.userId, {
      salonId: salon.value.id,
      masterId: master.value.id,
      serviceId: service.value.id,
      timeSlotId: window.value.id,
      startTime: "10:00",
      appointmentDate: "2026-09-03",
    });
    expect(booked.ok).toBe(true);
    if (!booked.ok) return;
    await services.appointments.complete(master.value.userId, booked.value.id);
    const stats = await services.stats.mine(
      { userId: master.value.userId, role: UserRole.Master, name: "Мастер", masterProfileId: master.value.id, salonId: salon.value.id },
      "week",
      new Date("2026-09-03T12:00:00.000Z"),
    );
    expect(stats.ok && stats.value.completedCount).toBe(1);
    expect(stats.ok && stats.value.revenue).toBe(1000);
  });

  it("cancels overdue confirmed appointments and notifies participants", async () => {
    const { services, clientReg, master, salon, service, window } = await seed();
    const booked = await services.appointments.create(clientReg.value.userId, {
      salonId: salon.value.id,
      masterId: master.value.id,
      serviceId: service.value.id,
      timeSlotId: window.value.id,
      startTime: "10:00",
      appointmentDate: "2026-09-03",
    });
    expect(booked.ok).toBe(true);
    if (!booked.ok) return;
    const late = app(new Date("2026-09-03T18:30:00.000Z"));
    late.repos.db.users = services.repos.db.users;
    late.repos.db.masters = services.repos.db.masters;
    late.repos.db.salons = services.repos.db.salons;
    late.repos.db.services = services.repos.db.services;
    late.repos.db.timeSlots = services.repos.db.timeSlots;
    late.repos.db.appointments = services.repos.db.appointments;
    late.repos.db.masterServices = services.repos.db.masterServices;
    const expired = await late.appointments.cancelExpired();
    expect(expired.ok && expired.value.cancelled).toBe(1);
    expect(services.repos.db.appointments[0]?.status).toBe("Cancelled");
  });

  it("updates and deletes a review, rolling ratings back", async () => {
    const { services, clientReg, master, salon, service, window } = await seed();
    const booked = await services.appointments.create(clientReg.value.userId, {
      salonId: salon.value.id,
      masterId: master.value.id,
      serviceId: service.value.id,
      timeSlotId: window.value.id,
      startTime: "10:00",
      appointmentDate: "2026-09-03",
    });
    if (!booked.ok) return;
    await services.appointments.complete(master.value.userId, booked.value.id);
    const created = await services.reviews.create(clientReg.value.userId, {
      appointmentId: booked.value.id,
      salonRating: 5,
      masterRating: 5,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const updated = await services.reviews.update(clientReg.value.userId, created.value.id, {
      salonRating: 3,
      masterRating: 4,
    });
    expect(updated.ok).toBe(true);
    const salonAfter = await services.salons.getById(salon.value.id);
    expect(salonAfter.ok && salonAfter.value.rating).toBe(3);
    await services.reviews.delete(clientReg.value.userId, created.value.id);
    const salonCleared = await services.salons.getById(salon.value.id);
    expect(salonCleared.ok && salonCleared.value.rating).toBe(0);
    expect(salonCleared.ok && salonCleared.value.ratingCount).toBe(0);
  });

  it("keeps inbox messages private and lets a client favorite a master", async () => {
    const { services, clientReg, master, salon, service, window } = await seed();
    await services.appointments.create(clientReg.value.userId, {
      salonId: salon.value.id,
      masterId: master.value.id,
      serviceId: service.value.id,
      timeSlotId: window.value.id,
      startTime: "10:00",
      appointmentDate: "2026-09-03",
    });
    const mine = await services.inbox.list(clientReg.value.userId);
    expect(mine.ok && mine.value.length).toBeGreaterThan(0);
    if (!mine.ok) return;
    const stolen = await services.inbox.markRead(master.value.userId, mine.value[0]!.id);
    expect(stolen.ok).toBe(false);
    const fav = await services.subscriptions.add(clientReg.value.userId, master.value.id);
    expect(fav.ok).toBe(true);
    const asMaster = await services.subscriptions.add(master.value.userId, master.value.id);
    expect(asMaster.ok).toBe(false);
  });

  it("rejects a walk-in without a guest or client and a client listing another master's slots", async () => {
    const { services, clientReg, master, salon, service, window } = await seed();
    const missing = await services.appointments.createWalkIn(master.value.userId, {
      salonId: salon.value.id,
      masterId: master.value.id,
      serviceId: service.value.id,
      timeSlotId: window.value.id,
      startTime: "11:00",
      appointmentDate: "2026-09-03",
    });
    expect(missing.ok).toBe(false);
    const forbidden = await services.appointments.getByTimeSlot(
      { userId: clientReg.value.userId, role: UserRole.Client, name: "Клиент" },
      window.value.id,
    );
    expect(forbidden.ok).toBe(false);
  });

  it("preserves template day ids on update and rejects unsafe salon photo URLs", async () => {
    const { services, adminReg, master, salon } = await seed();
    const template = await services.templates.create(master.value.userId, {
      name: "Будни",
      days: [{ weekday: 1, startTime: "10:00", endTime: "14:00" }],
    });
    expect(template.ok).toBe(true);
    if (!template.ok) return;
    const dayId = template.value.days[0]!.id;
    const updated = await services.templates.updateDay(master.value.userId, template.value.id, {
      weekday: 1,
      startTime: "11:00",
      endTime: "15:00",
    });
    expect(updated.ok && updated.value.days[0]?.id).toBe(dayId);
    const first = await services.photos.add(adminReg.value.userId, salon.value.id, "/uploads/0.jpg");
    expect(first.ok).toBe(true);
    const badUrl = await services.photos.add(adminReg.value.userId, salon.value.id, "javascript:alert(1)");
    expect(badUrl.ok).toBe(false);
    const traversal = await services.photos.add(adminReg.value.userId, salon.value.id, "/uploads/../.env");
    expect(traversal.ok).toBe(false);
  });

  it("changes city and password through the profile service", async () => {
    const { services, clientReg } = await seed();
    const city = await services.profile.updateCity(clientReg.value.userId, "Казань");
    expect(city.ok && city.value.city).toBe("Казань");
    const invalidCity = await services.profile.updateCity(clientReg.value.userId, "Неттакогогорода");
    expect(invalidCity.ok).toBe(false);
    const wrong = await services.profile.updatePassword(clientReg.value.userId, "nope", "password2");
    expect(wrong.ok).toBe(false);
    const okPass = await services.profile.updatePassword(clientReg.value.userId, "password1", "password2");
    expect(okPass.ok).toBe(true);
    const login = await services.auth.login("client@test.com", "password2");
    expect(login.ok).toBe(true);
  });

  it("lets a salon admin publish a live promotion and hides expired ones from the public list", async () => {
    const { services, adminReg, clientReg, salon, service } = await seed();
    const live = await services.promotions.create(adminReg.value.userId, salon.value.id, {
      title: "Стрижка недели",
      description: "Скидка на мужскую стрижку",
      discountPercent: 20,
      serviceId: service.value.id,
      startsOn: "2026-09-01",
      endsOn: "2026-09-20",
    });
    expect(live.ok).toBe(true);
    const expired = await services.promotions.create(adminReg.value.userId, salon.value.id, {
      title: "Старая акция",
      discountPercent: 40,
      startsOn: "2026-08-01",
      endsOn: "2026-08-31",
    });
    expect(expired.ok).toBe(true);
    const publicList = await services.promotions.listPublic(salon.value.id);
    expect(publicList.ok && publicList.value.map((item) => item.title)).toEqual(["Стрижка недели"]);
    const stolen = await services.promotions.create(clientReg.value.userId, salon.value.id, {
      title: "Чужая",
      discountPercent: 15,
    });
    expect(stolen.ok).toBe(false);
    const catalog = await services.salons.search({ city: "Москва" });
    expect(catalog[0]?.bestDiscountPercent).toBe(20);
  });

  it("lets a master add portfolio photos and forbids another user from deleting them", async () => {
    const { services, clientReg, master } = await seed();
    const added = await services.portfolio.add(master.value.userId, {
      url: "/uploads/cut-1.jpg",
      caption: "Fade",
    });
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    const listed = await services.portfolio.listByMaster(master.value.id);
    expect(listed.ok && listed.value[0]?.caption).toBe("Fade");
    const stolen = await services.portfolio.remove(clientReg.value.userId, added.value.id);
    expect(stolen.ok).toBe(false);
    const removed = await services.portfolio.remove(master.value.userId, added.value.id);
    expect(removed.ok).toBe(true);
    const badUrl = await services.portfolio.add(master.value.userId, { url: "javascript:alert(1)" });
    expect(badUrl.ok).toBe(false);
  });

  it("forbids client statistics and refuses to unassign a missing master service", async () => {
    const { services, clientReg, adminReg, master, service } = await seed();
    const stats = await services.stats.mine(
      { userId: clientReg.value.userId, role: UserRole.Client, name: "Клиент" },
      "week",
    );
    expect(stats.ok).toBe(false);
    const removed = await services.masters.unassignService(adminReg.value.userId, master.value.id, service.value.id);
    expect(removed.ok).toBe(true);
    const again = await services.masters.unassignService(adminReg.value.userId, master.value.id, service.value.id);
    expect(again.ok).toBe(false);
  });
});
