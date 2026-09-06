import { AppointmentStatus, TimeSlotStatus } from "@/server/domain/types";
import { isUniqueConstraintError } from "@/server/infrastructure/prisma-errors";
import type {
  Appointment,
  EmailVerification,
  MasterProfile,
  MasterTimeSlot,
  RefreshTokenRecord,
  Salon,
  Service,
  User,
} from "@/server/domain/types";
import type {
  AppointmentListFilter,
  IAppointmentRepository,
  IEmailVerificationRepository,
  IMasterProfileRepository,
  IMasterServiceRepository,
  IMasterTimeSlotRepository,
  IRefreshTokenRepository,
  ISalonAdminRepository,
  ISalonRepository,
  IServiceRepository,
  IUserRepository,
} from "@/server/application/ports";
import { prisma } from "@/server/infrastructure/prisma";

function dateStr(value: Date) {
  return value.toISOString().slice(0, 10);
}

function dayRange(date: string) {
  const from = new Date(`${date}T00:00:00.000Z`);
  const to = new Date(from.getTime() + 24 * 60 * 60 * 1000);
  return { from, to };
}

function mapUser(row: {
  id: string;
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: User["role"];
  emailVerified: boolean;
  city: string | null;
  createdAt: Date;
}): User {
  return row;
}

function mapSalon(row: {
  id: string;
  name: string;
  description: string | null;
  city: string;
  street: string;
  building: string;
  phone: string | null;
  openingTime: string | null;
  closingTime: string | null;
  isActive: boolean;
  rating: { toNumber(): number } | number;
  ratingCount: number;
  createdAt: Date;
}): Salon {
  return {
    ...row,
    rating: typeof row.rating === "number" ? row.rating : row.rating.toNumber(),
  };
}

function mapMaster(row: {
  id: string;
  userId: string;
  salonId: string;
  bio: string | null;
  specialization: string | null;
  avatarUrl: string | null;
  rating: { toNumber(): number } | number;
  ratingCount: number;
  user: { name: string };
}): MasterProfile {
  return {
    id: row.id,
    userId: row.userId,
    salonId: row.salonId,
    bio: row.bio,
    specialization: row.specialization,
    avatarUrl: row.avatarUrl,
    rating: typeof row.rating === "number" ? row.rating : row.rating.toNumber(),
    ratingCount: row.ratingCount,
    userName: row.user.name,
  };
}

function mapService(row: {
  id: string;
  salonId: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: { toNumber(): number } | number;
  isActive: boolean;
  photoUrl: string | null;
}): Service {
  return {
    ...row,
    price: typeof row.price === "number" ? row.price : row.price.toNumber(),
  };
}

function mapSlot(row: {
  id: string;
  masterId: string;
  scheduleDate: Date;
  startTime: string;
  endTime: string;
  status: TimeSlotStatus;
}): MasterTimeSlot {
  return { ...row, scheduleDate: dateStr(row.scheduleDate) };
}

function mapAppointment(row: {
  id: string;
  salonId: string;
  clientId: string | null;
  guestName: string | null;
  masterId: string;
  serviceId: string;
  timeSlotId: string;
  clientNotes: string | null;
  status: AppointmentStatus;
  startTime: string;
  endTime: string;
  appointmentDate: Date;
  salon: { name: string };
  client: { name: string } | null;
  master: { user: { name: string } };
  service: { name: string; price: { toNumber(): number } | number };
}): Appointment {
  return {
    id: row.id,
    salonId: row.salonId,
    salonName: row.salon.name,
    clientId: row.clientId,
    clientName: row.client?.name ?? row.guestName ?? "Гость",
    guestName: row.guestName,
    masterId: row.masterId,
    masterName: row.master.user.name,
    serviceId: row.serviceId,
    serviceName: row.service.name,
    timeSlotId: row.timeSlotId,
    clientNotes: row.clientNotes,
    status: row.status,
    startTime: row.startTime,
    endTime: row.endTime,
    appointmentDate: row.appointmentDate,
    price: typeof row.service.price === "number" ? row.service.price : row.service.price.toNumber(),
  };
}

const appointmentInclude = {
  salon: true,
  client: true,
  master: { include: { user: true } },
  service: true,
} as const;

export const prismaUsers: IUserRepository = {
  getById: async (id) => {
    const row = await prisma.user.findUnique({ where: { id } });
    return row ? mapUser(row) : null;
  },
  getByEmail: async (email) => {
    const row = await prisma.user.findUnique({ where: { email } });
    return row ? mapUser(row) : null;
  },
  add: async (user) => {
    await prisma.user.create({ data: user });
  },
  markEmailVerified: async (id) => {
    await prisma.user.update({ where: { id }, data: { emailVerified: true } });
  },
  updateCity: async (id, city) => {
    await prisma.user.update({ where: { id }, data: { city } });
  },
  updatePasswordHash: async (id, passwordHash) => {
    await prisma.user.update({ where: { id }, data: { passwordHash } });
  },
  listCities: async (prefix) => {
    const rows = await prisma.user.findMany({
      where: {
        city: prefix?.trim()
          ? { contains: prefix.trim(), mode: "insensitive", not: null }
          : { not: null },
      },
      select: { city: true },
      distinct: ["city"],
      orderBy: { city: "asc" },
      take: 20,
    });
    return rows.map((row) => row.city).filter((city): city is string => Boolean(city));
  },
};

export const prismaVerifications: IEmailVerificationRepository = {
  getActiveByEmail: async (email) =>
    prisma.emailVerification.findFirst({
      where: { email, isUsed: false },
      orderBy: { createdAt: "desc" },
    }) as Promise<EmailVerification | null>,
  add: async (verification) => {
    await prisma.emailVerification.create({ data: verification });
  },
  markUsed: async (id) => {
    await prisma.emailVerification.update({ where: { id }, data: { isUsed: true } });
  },
};

export const prismaSalons: ISalonRepository = {
  getById: async (id) => {
    const row = await prisma.salon.findUnique({ where: { id } });
    return row ? mapSalon(row) : null;
  },
  search: async (query) => {
    const name = query?.name?.trim();
    const category = query?.category?.trim();
    const city = query?.city?.trim();
    const rows = await prisma.salon.findMany({
      where: {
        isActive: true,
        city: city ? { contains: city, mode: "insensitive" } : undefined,
        OR: name
          ? [
              { name: { contains: name, mode: "insensitive" } },
              { city: { contains: name, mode: "insensitive" } },
              { street: { contains: name, mode: "insensitive" } },
            ]
          : undefined,
        services: category
          ? { some: { isActive: true, name: { contains: category, mode: "insensitive" } } }
          : undefined,
      },
      orderBy: { name: "asc" },
    });
    return rows.map(mapSalon);
  },
  listIds: async () => (await prisma.salon.findMany({ select: { id: true } })).map((row) => row.id),
  add: async (salon) => {
    await prisma.salon.create({ data: salon });
  },
  update: async (salon) => {
    await prisma.salon.update({
      where: { id: salon.id },
      data: {
        name: salon.name,
        description: salon.description,
        city: salon.city,
        street: salon.street,
        building: salon.building,
        phone: salon.phone,
        openingTime: salon.openingTime,
        closingTime: salon.closingTime,
      },
    });
  },
  updateRating: async (id, rating, ratingCount) => {
    await prisma.salon.update({ where: { id }, data: { rating, ratingCount } });
  },
};

export const prismaSalonAdmins: ISalonAdminRepository = {
  getByUserId: (userId) => prisma.salonAdmin.findUnique({ where: { userId } }),
  isAdminOfSalon: async (userId, salonId) =>
    Boolean(await prisma.salonAdmin.findFirst({ where: { userId, salonId } })),
  add: async (link) => {
    await prisma.salonAdmin.create({ data: link });
  },
};

export const prismaMasters: IMasterProfileRepository = {
  getById: async (id) => {
    const row = await prisma.masterProfile.findUnique({ where: { id }, include: { user: true } });
    return row ? mapMaster(row) : null;
  },
  getByUserId: async (userId) => {
    const row = await prisma.masterProfile.findUnique({ where: { userId }, include: { user: true } });
    return row ? mapMaster(row) : null;
  },
  getBySalonId: async (salonId) => {
    const rows = await prisma.masterProfile.findMany({ where: { salonId }, include: { user: true } });
    return rows.map(mapMaster);
  },
  listIds: async () => (await prisma.masterProfile.findMany({ select: { id: true } })).map((row) => row.id),
  listTopRated: async (limit) => {
    const rows = await prisma.masterProfile.findMany({
      include: { user: true },
      orderBy: [{ rating: "desc" }, { ratingCount: "desc" }],
      take: limit,
    });
    return rows.map(mapMaster);
  },
  add: async (profile) => {
    await prisma.masterProfile.create({
      data: {
        id: profile.id,
        userId: profile.userId,
        salonId: profile.salonId,
        bio: profile.bio,
        specialization: profile.specialization,
        avatarUrl: profile.avatarUrl ?? null,
      },
    });
  },
  update: async (profile) => {
    await prisma.masterProfile.update({
      where: { id: profile.id },
      data: {
        bio: profile.bio,
        specialization: profile.specialization,
        avatarUrl: profile.avatarUrl ?? null,
      },
    });
  },
  updateRating: async (id, rating, ratingCount) => {
    await prisma.masterProfile.update({ where: { id }, data: { rating, ratingCount } });
  },
};

export const prismaServices: IServiceRepository = {
  getById: async (id) => {
    const row = await prisma.service.findUnique({ where: { id } });
    return row ? mapService(row) : null;
  },
  getBySalonId: async (salonId, activeOnly = true) => {
    const rows = await prisma.service.findMany({
      where: { salonId, ...(activeOnly ? { isActive: true } : {}) },
      orderBy: { name: "asc" },
    });
    return rows.map(mapService);
  },
  add: async (service) => {
    await prisma.service.create({ data: service });
  },
  update: async (service) => {
    await prisma.service.update({
      where: { id: service.id },
      data: {
        name: service.name,
        description: service.description,
        durationMinutes: service.durationMinutes,
        price: service.price,
        isActive: service.isActive,
        photoUrl: service.photoUrl ?? null,
      },
    });
  },
};

export const prismaMasterServices: IMasterServiceRepository = {
  exists: async (masterProfileId, serviceId) =>
    Boolean(await prisma.masterService.findUnique({ where: { masterProfileId_serviceId: { masterProfileId, serviceId } } })),
  getServicesForMaster: async (masterProfileId) => {
    const rows = await prisma.masterService.findMany({
      where: { masterProfileId, service: { isActive: true } },
      include: { service: true },
    });
    return rows.map((row) => mapService(row.service));
  },
  add: async (link) => {
    await prisma.masterService.create({ data: link });
  },
  remove: async (masterProfileId, serviceId) => {
    await prisma.masterService.delete({
      where: { masterProfileId_serviceId: { masterProfileId, serviceId } },
    });
  },
};

export const prismaTimeSlots: IMasterTimeSlotRepository = {
  getById: async (id) => {
    const row = await prisma.masterTimeSlot.findUnique({ where: { id } });
    return row ? mapSlot(row) : null;
  },
  getByMasterAndDate: async (masterId, date) => {
    const rows = await prisma.masterTimeSlot.findMany({
      where: { masterId, scheduleDate: new Date(`${date}T00:00:00.000Z`) },
      orderBy: { startTime: "asc" },
    });
    return rows.map(mapSlot);
  },
  getBySalonAndDate: async (salonId, date) => {
    const rows = await prisma.masterTimeSlot.findMany({
      where: { master: { salonId }, scheduleDate: new Date(`${date}T00:00:00.000Z`) },
    });
    return rows.map(mapSlot);
  },
  add: async (slot) => {
    await prisma.masterTimeSlot.create({
      data: {
        id: slot.id,
        masterId: slot.masterId,
        scheduleDate: new Date(`${slot.scheduleDate}T00:00:00.000Z`),
        startTime: slot.startTime,
        endTime: slot.endTime,
        status: slot.status,
      },
    });
  },
  addMany: async (slots) => {
    if (slots.length === 0) return;
    await prisma.masterTimeSlot.createMany({
      data: slots.map((slot) => ({
        id: slot.id,
        masterId: slot.masterId,
        scheduleDate: new Date(`${slot.scheduleDate}T00:00:00.000Z`),
        startTime: slot.startTime,
        endTime: slot.endTime,
        status: slot.status,
      })),
    });
  },
  delete: async (id) => {
    await prisma.masterTimeSlot.delete({ where: { id } });
  },
  updateStatus: async (id, status) => {
    await prisma.masterTimeSlot.update({ where: { id }, data: { status } });
  },
};

export const prismaAppointments: IAppointmentRepository = {
  getById: async (id) => {
    const row = await prisma.appointment.findUnique({ where: { id }, include: appointmentInclude });
    return row ? mapAppointment(row) : null;
  },
  getByClientId: async (clientId) => {
    const rows = await prisma.appointment.findMany({
      where: { clientId },
      include: appointmentInclude,
      orderBy: [{ appointmentDate: "desc" }, { startTime: "asc" }],
    });
    return rows.map(mapAppointment);
  },
  getByMasterAndDate: async (masterId, date) => {
    const { from, to } = dayRange(date);
    const rows = await prisma.appointment.findMany({
      where: { masterId, appointmentDate: { gte: from, lt: to } },
      include: appointmentInclude,
      orderBy: { startTime: "asc" },
    });
    return rows.map(mapAppointment);
  },
  getActiveByMasterAndDate: async (masterId, date) => {
    const { from, to } = dayRange(date);
    const rows = await prisma.appointment.findMany({
      where: {
        masterId,
        appointmentDate: { gte: from, lt: to },
        status: { not: AppointmentStatus.Cancelled },
      },
      include: appointmentInclude,
    });
    return rows.map(mapAppointment);
  },
  getBySalonAndDate: async (salonId, date) => {
    const { from, to } = dayRange(date);
    const rows = await prisma.appointment.findMany({
      where: { salonId, appointmentDate: { gte: from, lt: to } },
      include: appointmentInclude,
      orderBy: { startTime: "asc" },
    });
    return rows.map(mapAppointment);
  },
  getOverlapping: async (input) => {
    const { from, to } = dayRange(input.date);
    const row = await prisma.appointment.findFirst({
      where: {
        timeSlotId: input.timeSlotId,
        appointmentDate: { gte: from, lt: to },
        status: { not: AppointmentStatus.Cancelled },
        startTime: { lt: input.endTime },
        endTime: { gt: input.startTime },
      },
      include: appointmentInclude,
    });
    return row ? mapAppointment(row) : null;
  },
  createExclusive: async (appointment) => {
    try {
      return await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT 1 FROM "MasterTimeSlot" WHERE id = ${appointment.timeSlotId}::uuid FOR UPDATE`;
        const { from, to } = dayRange(appointment.appointmentDate.toISOString().slice(0, 10));
        const conflict = await tx.appointment.findFirst({
          where: {
            timeSlotId: appointment.timeSlotId,
            appointmentDate: { gte: from, lt: to },
            status: { not: AppointmentStatus.Cancelled },
            startTime: { lt: appointment.endTime },
            endTime: { gt: appointment.startTime },
          },
        });
        if (conflict) return "conflict" as const;
        await tx.appointment.create({
          data: {
            id: appointment.id,
            salonId: appointment.salonId,
            clientId: appointment.clientId,
            guestName: appointment.guestName ?? null,
            masterId: appointment.masterId,
            serviceId: appointment.serviceId,
            timeSlotId: appointment.timeSlotId,
            clientNotes: appointment.clientNotes,
            status: appointment.status,
            startTime: appointment.startTime,
            endTime: appointment.endTime,
            appointmentDate: appointment.appointmentDate,
          },
        });
        return "ok" as const;
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        return "conflict";
      }
      throw error;
    }
  },
  updateStatus: async (id, status) => {
    await prisma.appointment.update({ where: { id }, data: { status } });
  },
  list: async (filter) => {
    const rows = await prisma.appointment.findMany({
      where: {
        clientId: filter.clientId,
        masterId: filter.masterId,
        salonId: filter.salonId,
        timeSlotId: filter.timeSlotId,
        status: filter.status,
        appointmentDate:
          filter.from || filter.to
            ? { gte: filter.from, lt: filter.to }
            : undefined,
        review: filter.withoutReview ? { is: null } : undefined,
      },
      include: appointmentInclude,
      orderBy: [{ appointmentDate: "desc" }, { startTime: "asc" }],
    });
    return rows.map(mapAppointment);
  },
};

export const prismaRefreshTokens: IRefreshTokenRepository = {
  getByTokenHash: async (tokenHash) => {
    const row = await prisma.refreshToken.findUnique({ where: { tokenHash } });
    return row ? mapRefreshToken(row) : null;
  },
  add: async (record) => {
    await prisma.refreshToken.create({ data: record });
  },
  claimIfActive: async (id, revokedAt) => {
    const result = await prisma.refreshToken.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt },
    });
    return result.count === 1;
  },
  setReplacedBy: async (id, replacedById) => {
    await prisma.refreshToken.update({ where: { id }, data: { replacedById } });
  },
  revokeFamily: async (familyId, revokedAt) => {
    await prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt },
    });
  },
  revokeAllForUser: async (userId, revokedAt) => {
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt },
    });
  },
};

function mapRefreshToken(row: {
  id: string;
  userId: string;
  tokenHash: string;
  familyId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedById: string | null;
  createdAt: Date;
}): RefreshTokenRecord {
  return row;
}
