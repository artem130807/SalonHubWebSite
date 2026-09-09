import { PrismaClient, UserRole, TimeSlotStatus, AppointmentStatus } from "@prisma/client";
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

  await prisma.salonPromotion.upsert({
    where: { id: "44444444-4444-4444-4444-444444444444" },
    update: {},
    create: {
      id: "44444444-4444-4444-4444-444444444444",
      salonId: salon.id,
      title: "Стрижка недели",
      description: "Скидка на мужскую стрижку в будни. Успейте записаться, пока действует акция.",
      discountPercent: 20,
      serviceId: haircut.id,
      isActive: true,
    },
  });

  const portfolioUrls = [
    "https://images.unsplash.com/photo-1503951914875-452162b0f3ea?auto=format&fit=crop&q=80&w=900&h=700",
    "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&q=80&w=900&h=700",
    "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&q=80&w=900&h=700",
  ];
  const existingPortfolio = await prisma.portfolioPhoto.count({ where: { masterId: master.id } });
  if (existingPortfolio === 0) {
    await prisma.portfolioPhoto.createMany({
      data: portfolioUrls.map((url, index) => ({
        masterId: master.id,
        url,
        caption: index === 0 ? "Классический fade" : index === 1 ? "Короткая стрижка" : "Текстура и укладка",
        sortOrder: index,
      })),
    });
  }

  const salonPhotoUrls = [
    "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=1400",
    "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&q=80&w=1400",
    "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&q=80&w=1400",
  ];
  await prisma.salonPhoto.deleteMany({ where: { salonId: salon.id } });
  await prisma.salonPhoto.createMany({
    data: salonPhotoUrls.map((url) => ({ salonId: salon.id, url })),
  });

  const client = await prisma.user.findUnique({ where: { email: "client@test.com" } });
  const demoSlotId = "66666666-6666-6666-6666-666666666666";
  const demoAppointmentId = "55555555-5555-5555-5555-555555555555";
  if (client) {
    const existingReview = await prisma.review.findUnique({ where: { appointmentId: demoAppointmentId } });
    if (!existingReview) {
      await prisma.masterTimeSlot.upsert({
        where: { id: demoSlotId },
        update: {},
        create: {
          id: demoSlotId,
          masterId: master.id,
          scheduleDate: new Date("2026-08-15T00:00:00.000Z"),
          startTime: "11:00",
          endTime: "18:00",
          status: TimeSlotStatus.Booked,
        },
      });
      await prisma.appointment.create({
        data: {
          id: demoAppointmentId,
          salonId: salon.id,
          clientId: client.id,
          masterId: master.id,
          serviceId: haircut.id,
          timeSlotId: demoSlotId,
          startTime: "11:00",
          endTime: "11:40",
          appointmentDate: new Date("2026-08-15T00:00:00.000Z"),
          status: AppointmentStatus.Completed,
        },
      });
      await prisma.review.create({
        data: {
          appointmentId: demoAppointmentId,
          clientId: client.id,
          salonId: salon.id,
          masterId: master.id,
          salonRating: 5,
          masterRating: 5,
          comment: "Отличная стрижка, приду ещё.",
        },
      });
      if (master.ratingCount === 0) {
        await prisma.masterProfile.update({ where: { id: master.id }, data: { rating: 5, ratingCount: 1 } });
      }
      if (salon.ratingCount === 0) {
        await prisma.salon.update({ where: { id: salon.id }, data: { rating: 5, ratingCount: 1 } });
      }
    }
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
