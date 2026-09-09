import { randomUUID } from "node:crypto";
import { err, ok } from "@/server/domain/result";
import {
  availableSlotCalculator,
  dateOnly,
  SALON_CARD_PREVIEW_MINUTES,
} from "@/server/domain/scheduling";
import { TimeSlotStatus, UserRole, type Salon } from "@/server/domain/types";
import { bestDiscountPercent, isPromotionLive } from "@/server/domain/promotion-rules";
import type {
  IAppointmentRepository,
  ICityCatalog,
  IClock,
  IMasterTimeSlotRepository,
  IPromotionRepository,
  ISalonAdminRepository,
  ISalonPhotoRepository,
  ISalonRepository,
  IServiceRepository,
  IUserRepository,
} from "@/server/application/ports";

export type SalonCatalogSort = "rating" | "popular" | "price";

export type SalonCatalogQuery = {
  name?: string;
  category?: string;
  city?: string;
  sort?: SalonCatalogSort;
};

export class SalonService {
  constructor(
    private readonly salons: ISalonRepository,
    private readonly salonAdmins: ISalonAdminRepository,
    private readonly users: IUserRepository,
    private readonly timeSlots: IMasterTimeSlotRepository,
    private readonly appointments: IAppointmentRepository,
    private readonly clock: IClock,
    private readonly photos: ISalonPhotoRepository,
    private readonly services: IServiceRepository,
    private readonly cities: ICityCatalog,
    private readonly promotions: IPromotionRepository,
  ) {}

  async search(query: SalonCatalogQuery = {}) {
    const list = await this.salons.search({
      name: query.name,
      category: query.category,
      city: query.city,
    });
    const today = dateOnly(this.clock.utcNow());
    const allPromos = await this.promotions.listBySalonIds(list.map((salon) => salon.id));
    const livePromos = allPromos.filter((item) => isPromotionLive(item, this.clock.utcNow()));
    const cards = await Promise.all(
      list.map(async (salon) => {
        const [photos, services] = await Promise.all([
          this.photos.listBySalon(salon.id),
          this.services.getBySalonId(salon.id, true),
        ]);
        const prices = services.map((item) => item.price);
        return {
          id: salon.id,
          name: salon.name,
          city: salon.city,
          address: `${salon.city}, ${salon.street}, ${salon.building}`,
          description: salon.description,
          rating: salon.rating,
          ratingCount: salon.ratingCount,
          photoUrl: photos[0]?.url ?? null,
          minPrice: prices.length ? Math.min(...prices) : null,
          bestDiscountPercent: bestDiscountPercent(livePromos.filter((item) => item.salonId === salon.id)),
          availableStartsToday: await this.countStarts(salon.id, today),
        };
      }),
    );
    return sortSalonCards(cards, query.sort);
  }

  async getById(id: string) {
    const salon = await this.salons.getById(id);
    if (!salon) return err("Салон не найден");
    return ok(salon);
  }

  async create(
    adminUserId: string,
    input: {
      name: string;
      description?: string;
      city: string;
      street: string;
      building: string;
      phone?: string;
      openingTime?: string;
      closingTime?: string;
    },
  ) {
    const user = await this.users.getById(adminUserId);
    if (!user || user.role !== UserRole.SalonAdmin) {
      return err("Создавать салон может только администратор");
    }
    if (await this.salonAdmins.getByUserId(adminUserId)) {
      return err("У администратора уже есть салон");
    }
    if (!input.name.trim() || !input.city.trim() || !input.street.trim() || !input.building.trim()) {
      return err("Название и адрес обязательны");
    }
    const city = this.cities.canonical(input.city);
    if (!city) return err("Вы указали неверный город");
    const salon: Salon = {
      id: randomUUID(),
      name: input.name.trim(),
      description: input.description?.trim() || null,
      city,
      street: input.street.trim(),
      building: input.building.trim(),
      phone: input.phone?.trim() || null,
      openingTime: input.openingTime ?? null,
      closingTime: input.closingTime ?? null,
      isActive: true,
      rating: 0,
      ratingCount: 0,
      createdAt: this.clock.utcNow(),
    };
    await this.salons.add(salon);
    await this.salonAdmins.add({ id: randomUUID(), userId: adminUserId, salonId: salon.id });
    return ok(salon);
  }

  async update(adminUserId: string, salonId: string, input: Parameters<SalonService["create"]>[1]) {
    if (!(await this.salonAdmins.isAdminOfSalon(adminUserId, salonId))) {
      return err("Нет прав на изменение салона");
    }
    const salon = await this.salons.getById(salonId);
    if (!salon) return err("Салон не найден");
    const city = this.cities.canonical(input.city);
    if (!city) return err("Вы указали неверный город");
    const next = {
      ...salon,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      city,
      street: input.street.trim(),
      building: input.building.trim(),
      phone: input.phone?.trim() || null,
      openingTime: input.openingTime ?? null,
      closingTime: input.closingTime ?? null,
    };
    await this.salons.update(next);
    return ok(next);
  }

  private async countStarts(salonId: string, today: string) {
    const windows = (await this.timeSlots.getBySalonAndDate(salonId, today)).filter(
      (slot) => slot.status !== TimeSlotStatus.Cancelled,
    );
    if (windows.length === 0) return 0;
    const busy = new Map<string, { startTime: string; endTime: string }[]>();
    for (const window of windows) {
      const items = await this.appointments.getActiveByMasterAndDate(window.masterId, today);
      busy.set(
        window.id,
        items.filter((a) => a.timeSlotId === window.id).map((a) => ({ startTime: a.startTime, endTime: a.endTime })),
      );
    }
    return availableSlotCalculator.countStarts(windows, busy, SALON_CARD_PREVIEW_MINUTES, this.clock.utcNow());
  }
}

export function sortSalonCards<T extends { rating: number; ratingCount: number; minPrice: number | null }>(
  cards: T[],
  sort?: SalonCatalogSort,
) {
  const next = [...cards];
  if (sort === "rating") next.sort((a, b) => b.rating - a.rating || b.ratingCount - a.ratingCount);
  if (sort === "popular") next.sort((a, b) => b.ratingCount - a.ratingCount || b.rating - a.rating);
  if (sort === "price") {
    next.sort((a, b) => (a.minPrice ?? Number.POSITIVE_INFINITY) - (b.minPrice ?? Number.POSITIVE_INFINITY));
  }
  return next;
}
