import { randomUUID } from "node:crypto";
import { err, ok } from "@/server/domain/result";
import { isAllowedPhotoUrl } from "@/server/domain/media";
import { UserRole, type MasterProfile, type Service, type User } from "@/server/domain/types";
import type {
  IClock,
  IMasterProfileRepository,
  IMasterServiceRepository,
  IPasswordHasher,
  ISalonAdminRepository,
  IServiceRepository,
  IUserRepository,
} from "@/server/application/ports";

export class MasterManagementService {
  constructor(
    private readonly masters: IMasterProfileRepository,
    private readonly masterServices: IMasterServiceRepository,
    private readonly services: IServiceRepository,
    private readonly salonAdmins: ISalonAdminRepository,
    private readonly users: IUserRepository,
    private readonly hasher: IPasswordHasher,
    private readonly clock: IClock,
  ) {}

  async getBySalon(salonId: string) {
    return ok(await this.masters.getBySalonId(salonId));
  }

  async getById(id: string) {
    const master = await this.masters.getById(id);
    if (!master) return err("Мастер не найден");
    return ok(master);
  }

  async getMasterServices(masterId: string) {
    const master = await this.masters.getById(masterId);
    if (!master) return err("Мастер не найден");
    return ok(await this.masterServices.getServicesForMaster(masterId));
  }

  async featured(limit = 4) {
    const masters = await this.masters.listTopRated(limit);
    return ok(
      masters.map((master) => ({
        id: master.id,
        salonId: master.salonId,
        userName: master.userName,
        specialization: master.specialization,
        rating: master.rating,
        ratingCount: master.ratingCount,
        avatarUrl: master.avatarUrl ?? null,
      })),
    );
  }

  async createForSalon(
    adminUserId: string,
    salonId: string,
    input: {
      name: string;
      email: string;
      phone: string;
      password: string;
      bio?: string;
      specialization?: string;
    },
  ) {
    if (!(await this.salonAdmins.isAdminOfSalon(adminUserId, salonId))) {
      return err("Нет прав на добавление мастера");
    }
    if (!input.password || input.password.length < 8) {
      return err("Пароль должен содержать минимум 8 символов");
    }
    const email = input.email.trim().toLowerCase();
    if (await this.users.getByEmail(email)) {
      return err("Пользователь с таким email уже существует");
    }
    const now = this.clock.utcNow();
    const user: User = {
      id: randomUUID(),
      name: input.name.trim(),
      email,
      phone: input.phone.trim(),
      passwordHash: await this.hasher.hash(input.password),
      role: UserRole.Master,
      emailVerified: true,
      createdAt: now,
    };
    const profile: MasterProfile = {
      id: randomUUID(),
      userId: user.id,
      salonId,
      bio: input.bio?.trim() || null,
      specialization: input.specialization?.trim() || null,
      rating: 0,
      ratingCount: 0,
      userName: user.name,
    };
    await this.users.add(user);
    await this.masters.add(profile);
    return ok(profile);
  }

  async assignService(adminUserId: string, masterId: string, serviceId: string) {
    const master = await this.masters.getById(masterId);
    if (!master) return err("Мастер не найден");
    if (!(await this.salonAdmins.isAdminOfSalon(adminUserId, master.salonId))) {
      return err("Нет прав на назначение услуги");
    }
    const service = await this.services.getById(serviceId);
    if (!service || service.salonId !== master.salonId) {
      return err("Услуга не принадлежит салону мастера");
    }
    if (await this.masterServices.exists(masterId, serviceId)) {
      return err("Услуга уже назначена мастеру");
    }
    await this.masterServices.add({ id: randomUUID(), masterProfileId: masterId, serviceId });
    return ok(undefined);
  }

  async unassignService(adminUserId: string, masterId: string, serviceId: string) {
    const master = await this.masters.getById(masterId);
    if (!master) return err("Мастер не найден");
    if (!(await this.salonAdmins.isAdminOfSalon(adminUserId, master.salonId))) {
      return err("Нет прав на изменение услуг мастера");
    }
    if (!(await this.masterServices.exists(masterId, serviceId))) {
      return err("Услуга не назначена мастеру");
    }
    await this.masterServices.remove(masterId, serviceId);
    return ok(undefined);
  }
}

export class CatalogService {
  constructor(
    private readonly services: IServiceRepository,
    private readonly salonAdmins: ISalonAdminRepository,
  ) {}

  async getBySalon(salonId: string, activeOnly = true) {
    return ok(await this.services.getBySalonId(salonId, activeOnly));
  }

  async create(
    adminUserId: string,
    salonId: string,
    input: { name: string; description?: string; durationMinutes: number; price: number; photoUrl?: string | null },
  ) {
    if (!(await this.salonAdmins.isAdminOfSalon(adminUserId, salonId))) {
      return err("Нет прав на создание услуги");
    }
    if (!input.name.trim() || input.durationMinutes <= 0 || input.price < 0) {
      return err("Некорректные данные услуги");
    }
    const photoUrl = normalizeOptionalPhoto(input.photoUrl);
    if (!photoUrl.ok) return photoUrl;
    const service: Service = {
      id: randomUUID(),
      salonId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      durationMinutes: input.durationMinutes,
      price: input.price,
      isActive: true,
      photoUrl: photoUrl.value,
    };
    await this.services.add(service);
    return ok(service);
  }

  async update(
    adminUserId: string,
    serviceId: string,
    input: { name: string; description?: string; durationMinutes: number; price: number; isActive: boolean; photoUrl?: string | null },
  ) {
    const service = await this.services.getById(serviceId);
    if (!service) return err("Услуга не найдена");
    if (!(await this.salonAdmins.isAdminOfSalon(adminUserId, service.salonId))) {
      return err("Нет прав на изменение услуги");
    }
    const photoUrl = input.photoUrl === undefined ? ok(service.photoUrl ?? null) : normalizeOptionalPhoto(input.photoUrl);
    if (!photoUrl.ok) return photoUrl;
    const next = {
      ...service,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      durationMinutes: input.durationMinutes,
      price: input.price,
      isActive: input.isActive,
      photoUrl: photoUrl.value,
    };
    await this.services.update(next);
    return ok(next);
  }
}

function normalizeOptionalPhoto(url?: string | null) {
  if (url == null || url.trim() === "") return ok(null);
  const trimmed = url.trim();
  if (!isAllowedPhotoUrl(trimmed)) return err("Некорректный адрес фото");
  return ok(trimmed);
}
