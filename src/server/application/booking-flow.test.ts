import { describe, expect, it } from "vitest";
import { createApp } from "@/server/application/create-app";
import { createInMemoryRepos } from "@/server/infrastructure/memory-repositories";
import { UserRole } from "@/server/domain/types";
import type { IClock, IPasswordHasher, ITokenService, IVerificationCodeGenerator } from "@/server/application/ports";

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
  const repos = createInMemoryRepos();
  return {
    ...createApp({
      ...repos,
      hasher,
      tokens,
      codes,
      clock: new TestClock(now),
    }),
    repos,
  };
}

describe("AuthService", () => {
  it("requires email verification before login", async () => {
    const { auth } = app();
    const registered = await auth.register(
      { name: "Иван", email: "ivan@test.com", phone: "+79991112233", password: "password1", city: "Москва", role: UserRole.Client },
      true,
    );
    expect(registered.ok).toBe(true);
    if (!registered.ok) return;
    const before = await auth.login("ivan@test.com", "password1");
    expect(before.ok).toBe(false);
    const verify = await auth.verifyEmail("ivan@test.com", registered.value.verificationCode!);
    expect(verify.ok).toBe(true);
    const login = await auth.login("ivan@test.com", "password1");
    expect(login.ok).toBe(true);
  });

  it("does not allow a master to self-register", async () => {
    const { auth } = app();
    const result = await auth.register(
      { name: "Мастер", email: "master@test.com", phone: "+79991112233", password: "password1", city: "Москва", role: UserRole.Master },
      true,
    );
    expect(result.ok).toBe(false);
  });
});

describe("booking flow", () => {
  it("lets a client book an available start and the master complete it", async () => {
    const services = app();
    const adminReg = await services.auth.register(
      { name: "Админ", email: "admin@test.com", phone: "+79991112233", password: "password1", city: "Москва", role: UserRole.SalonAdmin },
      true,
    );
    const clientReg = await services.auth.register(
      { name: "Клиент", email: "client@test.com", phone: "+79991112233", password: "password1", city: "Москва", role: UserRole.Client },
      true,
    );
    expect(adminReg.ok && clientReg.ok).toBe(true);
    if (!adminReg.ok || !clientReg.ok) return;
    await services.auth.verifyEmail("admin@test.com", "123456");
    await services.auth.verifyEmail("client@test.com", "123456");

    const salon = await services.salons.create(adminReg.value.userId, {
      name: "Локон",
      city: "Москва",
      street: "Тверская",
      building: "1",
      phone: "+79990001122",
      openingTime: "10:00",
      closingTime: "20:00",
    });
    expect(salon.ok).toBe(true);
    if (!salon.ok) return;

    const service = await services.catalog.create(adminReg.value.userId, salon.value.id, {
      name: "Стрижка",
      durationMinutes: 40,
      price: 1500,
    });
    expect(service.ok).toBe(true);
    if (!service.ok) return;

    const master = await services.masters.createForSalon(adminReg.value.userId, salon.value.id, {
      name: "Александр",
      email: "master@test.com",
      phone: "+79993334455",
      password: "password1",
      specialization: "Стрижки",
    });
    expect(master.ok).toBe(true);
    if (!master.ok) return;
    await services.masters.assignService(adminReg.value.userId, master.value.id, service.value.id);

    const masterLogin = await services.auth.login("master@test.com", "password1");
    expect(masterLogin.ok).toBe(true);
    if (!masterLogin.ok) return;

    const window = await services.timeSlots.create(masterLogin.value.userId, {
      scheduleDate: "2026-09-10",
      startTime: "10:00",
      endTime: "18:00",
    });
    expect(window.ok).toBe(true);

    const available = await services.timeSlots.getAvailable(master.value.id, "2026-09-10", 40);
    expect(available.ok && available.value.length > 0).toBe(true);
    if (!available.ok) return;
    const start = available.value[0];

    const created = await services.appointments.create(clientReg.value.userId, {
      salonId: salon.value.id,
      masterId: master.value.id,
      serviceId: service.value.id,
      timeSlotId: start.timeSlotId,
      startTime: start.startTime,
      appointmentDate: "2026-09-10",
      clientNotes: "без насадки",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.value.startTime).toBe("10:00");
    expect(created.value.endTime).toBe("10:40");

    const overlap = await services.appointments.create(clientReg.value.userId, {
      salonId: salon.value.id,
      masterId: master.value.id,
      serviceId: service.value.id,
      timeSlotId: start.timeSlotId,
      startTime: start.startTime,
      appointmentDate: "2026-09-10",
    });
    expect(overlap.ok).toBe(false);

    const complete = await services.appointments.complete(masterLogin.value.userId, created.value.id);
    expect(complete.ok).toBe(true);
  });

  it("rejects a start inside the 15-minute lead time", async () => {
    const services = app(new Date("2026-09-10T10:00:00.000Z"));
    const adminReg = await services.auth.register(
      { name: "Админ", email: "admin2@test.com", phone: "+79991112233", password: "password1", city: "Москва", role: UserRole.SalonAdmin },
      true,
    );
    const clientReg = await services.auth.register(
      { name: "Клиент", email: "client2@test.com", phone: "+79991112233", password: "password1", city: "Москва", role: UserRole.Client },
      true,
    );
    if (!adminReg.ok || !clientReg.ok) return;
    await services.auth.verifyEmail("admin2@test.com", "123456");
    await services.auth.verifyEmail("client2@test.com", "123456");
    const salon = await services.salons.create(adminReg.value.userId, {
      name: "Локон",
      city: "Москва",
      street: "Тверская",
      building: "1",
    });
    if (!salon.ok) return;
    const service = await services.catalog.create(adminReg.value.userId, salon.value.id, {
      name: "Стрижка",
      durationMinutes: 40,
      price: 1500,
    });
    if (!service.ok) return;
    const master = await services.masters.createForSalon(adminReg.value.userId, salon.value.id, {
      name: "Александр",
      email: "master2@test.com",
      phone: "+79993334455",
      password: "password1",
    });
    if (!master.ok) return;
    await services.masters.assignService(adminReg.value.userId, master.value.id, service.value.id);
    const masterLogin = await services.auth.login("master2@test.com", "password1");
    if (!masterLogin.ok) return;
    await services.timeSlots.create(masterLogin.value.userId, {
      scheduleDate: "2026-09-10",
      startTime: "10:00",
      endTime: "18:00",
    });
    const created = await services.appointments.create(clientReg.value.userId, {
      salonId: salon.value.id,
      masterId: master.value.id,
      serviceId: service.value.id,
      timeSlotId: (await services.repos.timeSlots.getByMasterAndDate(master.value.id, "2026-09-10"))[0]!.id,
      startTime: "10:00",
      appointmentDate: "2026-09-10",
    });
    expect(created.ok).toBe(false);
  });

  it("rejects a master from another salon", async () => {
    const services = app();
    const adminReg = await services.auth.register(
      { name: "Админ", email: "admin3@test.com", phone: "+79991112233", password: "password1", city: "Москва", role: UserRole.SalonAdmin },
      true,
    );
    const clientReg = await services.auth.register(
      { name: "Клиент", email: "client3@test.com", phone: "+79991112233", password: "password1", city: "Москва", role: UserRole.Client },
      true,
    );
    if (!adminReg.ok || !clientReg.ok) return;
    await services.auth.verifyEmail("admin3@test.com", "123456");
    await services.auth.verifyEmail("client3@test.com", "123456");
    const salon = await services.salons.create(adminReg.value.userId, {
      name: "Локон",
      city: "Москва",
      street: "Тверская",
      building: "1",
    });
    if (!salon.ok) return;
    const service = await services.catalog.create(adminReg.value.userId, salon.value.id, {
      name: "Стрижка",
      durationMinutes: 40,
      price: 1500,
    });
    if (!service.ok) return;
    const master = await services.masters.createForSalon(adminReg.value.userId, salon.value.id, {
      name: "Александр",
      email: "master3@test.com",
      phone: "+79993334455",
      password: "password1",
    });
    if (!master.ok) return;
    await services.masters.assignService(adminReg.value.userId, master.value.id, service.value.id);
    const masterLogin = await services.auth.login("master3@test.com", "password1");
    if (!masterLogin.ok) return;
    const window = await services.timeSlots.create(masterLogin.value.userId, {
      scheduleDate: "2026-09-10",
      startTime: "10:00",
      endTime: "18:00",
    });
    if (!window.ok) return;
    services.repos.db.masters[0]!.salonId = "99999999-9999-9999-9999-999999999999";
    const created = await services.appointments.create(clientReg.value.userId, {
      salonId: salon.value.id,
      masterId: master.value.id,
      serviceId: service.value.id,
      timeSlotId: window.value.id,
      startTime: "10:00",
      appointmentDate: "2026-09-10",
    });
    expect(created.ok).toBe(false);
  });

  it("rejects a non-numeric duration when listing starts", async () => {
    const { timeSlots } = app();
    const result = await timeSlots.getAvailable("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "2026-09-10", Number("nope"));
    expect(result.ok).toBe(false);
  });
});
