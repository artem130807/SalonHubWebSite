import { randomUUID } from "node:crypto";
import { err, ok } from "@/server/domain/result";
import { isAllowedPhotoUrl } from "@/server/domain/media";
import {
  PORTFOLIO_LIMITS,
  normalizePortfolioCaption,
  validatePortfolioCaption,
} from "@/server/domain/portfolio-rules";
import {
  PROMOTION_LIMITS,
  isPromotionLive,
  parsePromotionBoundary,
  validatePromotionDraft,
} from "@/server/domain/promotion-rules";
import type { PortfolioPhoto, SalonPromotion } from "@/server/domain/types";
import type {
  IClock,
  IMasterProfileRepository,
  IPortfolioRepository,
  IPromotionRepository,
  ISalonAdminRepository,
  IServiceRepository,
} from "@/server/application/ports";

export type PromotionDraft = {
  title: string;
  description?: string | null;
  discountPercent: number;
  serviceId?: string | null;
  imageUrl?: string | null;
  startsOn?: string | null;
  endsOn?: string | null;
  isActive?: boolean;
};

export class PromotionService {
  constructor(
    private readonly promotions: IPromotionRepository,
    private readonly salonAdmins: ISalonAdminRepository,
    private readonly services: IServiceRepository,
    private readonly clock: IClock,
  ) {}

  async listPublic(salonId: string) {
    const items = await this.promotions.listBySalon(salonId);
    const now = this.clock.utcNow();
    return ok(items.filter((item) => isPromotionLive(item, now)));
  }

  async listForAdmin(adminUserId: string, salonId: string) {
    if (!(await this.salonAdmins.isAdminOfSalon(adminUserId, salonId))) {
      return err("Нет прав на акции салона");
    }
    return ok(await this.promotions.listBySalon(salonId));
  }

  async create(adminUserId: string, salonId: string, input: PromotionDraft) {
    if (!(await this.salonAdmins.isAdminOfSalon(adminUserId, salonId))) {
      return err("Нет прав на создание акции");
    }
    const existing = await this.promotions.listBySalon(salonId);
    if (existing.length >= PROMOTION_LIMITS.maxPerSalon) {
      return err(`Можно создать не больше ${PROMOTION_LIMITS.maxPerSalon} акций`);
    }
    const built = await this.build(salonId, input);
    if (!built.ok) return built;
    await this.promotions.add(built.value);
    return ok(built.value);
  }

  async update(adminUserId: string, id: string, input: PromotionDraft) {
    const current = await this.promotions.getById(id);
    if (!current) return err("Акция не найдена");
    if (!(await this.salonAdmins.isAdminOfSalon(adminUserId, current.salonId))) {
      return err("Нет прав на изменение акции");
    }
    const built = await this.build(current.salonId, input, current);
    if (!built.ok) return built;
    await this.promotions.update(built.value);
    return ok(built.value);
  }

  async remove(adminUserId: string, id: string) {
    const current = await this.promotions.getById(id);
    if (!current) return err("Акция не найдена");
    if (!(await this.salonAdmins.isAdminOfSalon(adminUserId, current.salonId))) {
      return err("Нет прав на удаление акции");
    }
    await this.promotions.delete(id);
    return ok(undefined);
  }

  private async build(
    salonId: string,
    input: PromotionDraft,
    current?: SalonPromotion,
  ) {
    const startsAt = parsePromotionBoundary(input.startsOn, false);
    const endsAt = parsePromotionBoundary(input.endsOn, true);
    if (input.startsOn?.trim() && !startsAt) return err("Некорректная дата начала акции");
    if (input.endsOn?.trim() && !endsAt) return err("Некорректная дата окончания акции");
    const error = validatePromotionDraft({
      title: input.title,
      description: input.description,
      discountPercent: Number(input.discountPercent),
      startsAt,
      endsAt,
    });
    if (error) return err(error);
    const serviceId = input.serviceId?.trim() || null;
    let serviceName: string | null = null;
    if (serviceId) {
      const service = await this.services.getById(serviceId);
      if (!service || service.salonId !== salonId) return err("Услуга не принадлежит салону");
      serviceName = service.name;
    }
    const imageUrl = input.imageUrl?.trim() || null;
    if (imageUrl && !isAllowedPhotoUrl(imageUrl)) return err("Некорректный адрес фото");
    const promotion: SalonPromotion = {
      id: current?.id ?? randomUUID(),
      salonId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      discountPercent: Number(input.discountPercent),
      serviceId,
      serviceName,
      imageUrl,
      startsAt,
      endsAt,
      isActive: input.isActive ?? current?.isActive ?? true,
      createdAt: current?.createdAt ?? this.clock.utcNow(),
    };
    return ok(promotion);
  }
}

export class PortfolioService {
  constructor(
    private readonly portfolio: IPortfolioRepository,
    private readonly masters: IMasterProfileRepository,
  ) {}

  async listByMaster(masterId: string) {
    return ok(await this.portfolio.listByMaster(masterId));
  }

  async listForSalon(salonId: string) {
    const masters = await this.masters.getBySalonId(salonId);
    const photos = await this.portfolio.listByMasterIds(masters.map((item) => item.id));
    const grouped: Record<string, PortfolioPhoto[]> = {};
    for (const master of masters) grouped[master.id] = [];
    for (const photo of photos) {
      grouped[photo.masterId] ??= [];
      grouped[photo.masterId]!.push(photo);
    }
    return ok(grouped);
  }

  async add(masterUserId: string, input: { url: string; caption?: string | null }) {
    const master = await this.masters.getByUserId(masterUserId);
    if (!master) return err("Профиль мастера не найден");
    const url = input.url.trim();
    if (!isAllowedPhotoUrl(url)) return err("Некорректный адрес фото");
    const captionError = validatePortfolioCaption(input.caption);
    if (captionError) return err(captionError);
    const existing = await this.portfolio.listByMaster(master.id);
    if (existing.length >= PORTFOLIO_LIMITS.maxPhotos) {
      return err(`Можно загрузить не больше ${PORTFOLIO_LIMITS.maxPhotos} фото в портфолио`);
    }
    const photo: PortfolioPhoto = {
      id: randomUUID(),
      masterId: master.id,
      url,
      caption: normalizePortfolioCaption(input.caption),
      sortOrder: existing.length,
      createdAt: new Date(),
    };
    await this.portfolio.add(photo);
    return ok(photo);
  }

  async remove(masterUserId: string, id: string) {
    const master = await this.masters.getByUserId(masterUserId);
    if (!master) return err("Профиль мастера не найден");
    const photo = await this.portfolio.getById(id);
    if (!photo || photo.masterId !== master.id) return err("Фото не найдено");
    await this.portfolio.delete(id);
    return ok(undefined);
  }
}
