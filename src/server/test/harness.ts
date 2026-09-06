import { vi } from "vitest";
import { createApp } from "@/server/application/create-app";
import { createInMemoryRepos } from "@/server/infrastructure/memory-repositories";
import { UserRole } from "@/server/domain/types";
import type {
  IClock,
  INotifier,
  IPasswordHasher,
  ITokenService,
  IVerificationCodeGenerator,
} from "@/server/application/ports";

export class TestClock implements IClock {
  constructor(public now: Date) {}
  utcNow() {
    return this.now;
  }
}

export const hasher: IPasswordHasher = {
  hash: async (password) => `hash:${password}`,
  verify: async (password, passwordHash) => passwordHash === `hash:${password}`,
};

export const tokens: ITokenService = {
  sign: async (payload) => JSON.stringify(payload),
  verify: async (token) => JSON.parse(token),
};

export const codes: IVerificationCodeGenerator = {
  generate: () => "123456",
};

export function mockNotifier() {
  return {
    notifyUser: vi.fn(),
    notifyConversation: vi.fn(),
  } satisfies INotifier;
}

export function createTestApp(now = new Date("2026-09-03T08:00:00.000Z")) {
  const notifications: { userId: string; message: string }[] = [];
  const notifier: INotifier = {
    notifyUser(userId, payload) {
      notifications.push({ userId, message: payload.Message });
    },
    notifyConversation: vi.fn(),
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
    notifier,
    clock: new TestClock(now),
  };
}

export async function seedSalon(now = new Date("2026-09-03T08:00:00.000Z")) {
  const app = createTestApp(now);
  const adminReg = await app.auth.register(
    { name: "Админ", email: "admin@test.com", phone: "+79991112233", password: "password1", role: UserRole.SalonAdmin },
    true,
  );
  const clientReg = await app.auth.register(
    { name: "Клиент", email: "client@test.com", phone: "+79991112233", password: "password1", role: UserRole.Client },
    true,
  );
  if (!adminReg.ok || !clientReg.ok) throw new Error("register failed");
  await app.auth.verifyEmail("admin@test.com", "123456");
  await app.auth.verifyEmail("client@test.com", "123456");
  const salon = await app.salons.create(adminReg.value.userId, {
    name: "Салон",
    city: "Москва",
    street: "Тверская",
    building: "1",
  });
  if (!salon.ok) throw new Error(salon.error);
  const master = await app.masters.createForSalon(adminReg.value.userId, salon.value.id, {
    name: "Мастер",
    email: "master@test.com",
    phone: "+79991112234",
    password: "password1",
    specialization: "Стрижка",
  });
  if (!master.ok) throw new Error(master.error);
  const service = await app.catalog.create(adminReg.value.userId, salon.value.id, {
    name: "Стрижка",
    durationMinutes: 30,
    price: 1000,
  });
  if (!service.ok) throw new Error(service.error);
  await app.masters.assignService(adminReg.value.userId, master.value.id, service.value.id);
  const window = await app.timeSlots.create(master.value.userId, {
    scheduleDate: "2026-09-03",
    startTime: "10:00",
    endTime: "18:00",
  });
  if (!window.ok) throw new Error(window.error);
  return { app, adminReg, clientReg, salon, master, service, window };
}
