import { PrismaClient, UserRole, TimeSlotStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password1", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@test.com" },
    update: {},
    create: {
      name: "Админ",
      email: "admin@test.com",
      phone: "+79990001122",
      passwordHash,
      role: UserRole.SalonAdmin,
      emailVerified: true,
    },
  });
  await prisma.user.upsert({
    where: { email: "client@test.com" },
    update: {},
    create: {
      name: "Клиент",
      email: "client@test.com",
      phone: "+79991112233",
      passwordHash,
      role: UserRole.Client,
      emailVerified: true,
    },
  });
  const masterUser = await prisma.user.upsert({
    where: { email: "master@test.com" },
    update: {},
    create: {
      name: "Александр",
      email: "master@test.com",
      phone: "+79993334455",
      passwordHash,
      role: UserRole.Master,
      emailVerified: true,
    },
  });

  const salon = await prisma.salon.upsert({
    where: { id: "11111111-1111-1111-1111-111111111111" },
    update: {},
    create: {
      id: "11111111-1111-1111-1111-111111111111",
      name: "Парикмахерская Локон",
      description: "Барбершоп в центре",
      city: "Москва",
      street: "Тверская",
      building: "1",
      phone: "+79990001122",
      openingTime: "10:00",
      closingTime: "20:00",
    },
  });

  await prisma.salonAdmin.upsert({
    where: { userId: admin.id },
    update: {},
    create: { userId: admin.id, salonId: salon.id },
  });

  const master = await prisma.masterProfile.upsert({
    where: { userId: masterUser.id },
    update: {},
    create: {
      userId: masterUser.id,
      salonId: salon.id,
      specialization: "Стрижки",
      bio: "Топ-стилист",
    },
  });

  const haircut = await prisma.service.upsert({
    where: { id: "22222222-2222-2222-2222-222222222222" },
    update: {},
    create: {
      id: "22222222-2222-2222-2222-222222222222",
      salonId: salon.id,
      name: "Мужская стрижка",
      durationMinutes: 40,
      price: 1500,
    },
  });
  const shave = await prisma.service.upsert({
    where: { id: "33333333-3333-3333-3333-333333333333" },
    update: {},
    create: {
      id: "33333333-3333-3333-3333-333333333333",
      salonId: salon.id,
      name: "Бритьё",
      durationMinutes: 20,
      price: 800,
    },
  });

  await prisma.masterService.upsert({
    where: { masterProfileId_serviceId: { masterProfileId: master.id, serviceId: haircut.id } },
    update: {},
    create: { masterProfileId: master.id, serviceId: haircut.id },
  });
  await prisma.masterService.upsert({
    where: { masterProfileId_serviceId: { masterProfileId: master.id, serviceId: shave.id } },
    update: {},
    create: { masterProfileId: master.id, serviceId: shave.id },
  });

  const dateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: process.env.APP_TIMEZONE ?? "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const dateMap = Object.fromEntries(dateParts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  const date = new Date(`${dateMap.year}-${dateMap.month}-${dateMap.day}T00:00:00.000Z`);
  const week = Array.from({ length: 7 }).map((_, index) => {
    const scheduleDate = new Date(date);
    scheduleDate.setUTCDate(scheduleDate.getUTCDate() + index);
    return scheduleDate;
  });
  const existing = await prisma.masterTimeSlot.findMany({
    where: {
      masterId: master.id,
      scheduleDate: { in: week },
    },
    select: { scheduleDate: true },
  });
  const existingKeys = new Set(existing.map((slot) => slot.scheduleDate.toISOString().slice(0, 10)));
  const missing = week.filter((scheduleDate) => !existingKeys.has(scheduleDate.toISOString().slice(0, 10)));
  if (missing.length > 0) {
    await prisma.masterTimeSlot.createMany({
      data: missing.map((scheduleDate) => ({
        masterId: master.id,
        scheduleDate,
        startTime: "10:00",
        endTime: "18:00",
        status: TimeSlotStatus.Available,
      })),
    });
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
