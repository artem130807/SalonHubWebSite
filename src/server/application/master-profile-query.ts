import { err, ok } from "@/server/domain/result";
import { isPromotionLive } from "@/server/domain/promotion-rules";
import { dateOnly } from "@/server/domain/scheduling";
import type { MasterProfile, PortfolioPhoto, Review, Salon, SalonPromotion, Service } from "@/server/domain/types";
import { yearMonthOf } from "@/lib/date-only";
import {
  activeAppointments,
  activeWindows,
  attachWorkplaceDays,
  buildPublicDaysForMaster,
  previewDurationMinutes,
  resolvePublicCalendarMonth,
  utcRangeForCalendar,
  type PublicCalendarWorkplaceMonthDay,
} from "@/server/application/public-calendar";
import type {
  IAppointmentRepository,
  IClock,
  IMasterProfileRepository,
  IMasterServiceRepository,
  IMasterTimeSlotRepository,
  IPortfolioRepository,
  IPromotionRepository,
  IReviewRepository,
  ISalonRepository,
} from "@/server/application/ports";

export type PublicMasterWorkplace = {
  id: string;
  name: string;
  city: string;
  street: string;
  building: string;
  phone: string | null;
  openingTime: string | null;
  closingTime: string | null;
};

export type { PublicCalendarDay, PublicCalendarInterval, PublicCalendarWorkplaceDay } from "@/server/application/public-calendar";

export type PublicMasterCalendar = {
  month: string;
  from: string;
  to: string;
  today: string;
  previewDurationMinutes: number;
  minMonth: string;
  maxMonth: string;
  workplaces: PublicMasterWorkplace[];
  days: PublicCalendarWorkplaceMonthDay[];
};

export type PublicMasterProfile = {
  master: MasterProfile;
  salon: PublicMasterWorkplace;
  services: Service[];
  portfolio: PortfolioPhoto[];
  reviews: Review[];
  promotions: SalonPromotion[];
  calendar: PublicMasterCalendar;
};

export function toPublicMasterWorkplace(salon: Salon): PublicMasterWorkplace {
  return {
    id: salon.id,
    name: salon.name,
    city: salon.city,
    street: salon.street,
    building: salon.building,
    phone: salon.phone,
    openingTime: salon.openingTime,
    closingTime: salon.closingTime,
  };
}

export class PublicMasterProfileService {
  constructor(
    private readonly masters: IMasterProfileRepository,
    private readonly salons: ISalonRepository,
    private readonly masterServices: IMasterServiceRepository,
    private readonly portfolio: IPortfolioRepository,
    private readonly reviews: IReviewRepository,
    private readonly promotions: IPromotionRepository,
    private readonly timeSlots: IMasterTimeSlotRepository,
    private readonly appointments: IAppointmentRepository,
    private readonly clock: IClock,
  ) {}

  async getById(masterId: string) {
    const loaded = await this.loadWorkplace(masterId);
    if (!loaded.ok) return loaded;
    const { master, salon } = loaded.value;

    const [services, portfolio, reviews, promotions] = await Promise.all([
      this.masterServices.getServicesForMaster(master.id),
      this.portfolio.listByMaster(master.id),
      this.reviews.listByMaster(master.id),
      this.promotions.listBySalon(salon.id),
    ]);
    const calendar = await this.buildMonth(master, salon, services, yearMonthOf(dateOnly(this.clock.utcNow())));
    if (!calendar.ok) return calendar;

    return ok({
      master,
      salon: toPublicMasterWorkplace(salon),
      services,
      portfolio,
      reviews,
      promotions: promotions.filter((item) => isPromotionLive(item, this.clock.utcNow())),
      calendar: calendar.value,
    } satisfies PublicMasterProfile);
  }

  async getCalendar(masterId: string, month?: string | null) {
    const loaded = await this.loadWorkplace(masterId);
    if (!loaded.ok) return loaded;
    const services = await this.masterServices.getServicesForMaster(loaded.value.master.id);
    return this.buildMonth(loaded.value.master, loaded.value.salon, services, month);
  }

  private async loadWorkplace(masterId: string) {
    const master = await this.masters.getById(masterId);
    if (!master) return err("Мастер не найден");
    const salon = await this.salons.getById(master.salonId);
    if (!salon || !salon.isActive) return err("Мастер не найден");
    return ok({ master, salon });
  }

  private async buildMonth(master: MasterProfile, salon: Salon, services: Service[], month?: string | null) {
    const meta = resolvePublicCalendarMonth(dateOnly(this.clock.utcNow()), month);
    if (!meta.ok) return meta;
    const range = utcRangeForCalendar(meta.value.from, meta.value.to);
    const [slots, appointments] = await Promise.all([
      this.timeSlots.getByMasterAndDateRange(master.id, meta.value.from, meta.value.to),
      this.appointments.list({ masterId: master.id, from: range.from, to: range.to }),
    ]);
    const duration = previewDurationMinutes(services);
    const workplace = toPublicMasterWorkplace(salon);
    return ok({
      ...meta.value,
      previewDurationMinutes: duration,
      workplaces: [workplace],
      days: attachWorkplaceDays(
        salon.id,
        buildPublicDaysForMaster(activeWindows(slots), activeAppointments(appointments), duration, this.clock.utcNow()),
      ),
    } satisfies PublicMasterCalendar);
  }
}
