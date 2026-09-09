import { err, ok } from "@/server/domain/result";
import { isPromotionLive } from "@/server/domain/promotion-rules";
import type { MasterProfile, PortfolioPhoto, Review, Salon, SalonPromotion, Service } from "@/server/domain/types";
import type {
  IClock,
  IMasterProfileRepository,
  IMasterServiceRepository,
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

export type PublicMasterProfile = {
  master: MasterProfile;
  salon: PublicMasterWorkplace;
  services: Service[];
  portfolio: PortfolioPhoto[];
  reviews: Review[];
  promotions: SalonPromotion[];
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
    private readonly clock: IClock,
  ) {}

  async getById(masterId: string) {
    const master = await this.masters.getById(masterId);
    if (!master) return err("Мастер не найден");
    const salon = await this.salons.getById(master.salonId);
    if (!salon || !salon.isActive) return err("Мастер не найден");

    const [services, portfolio, reviews, promotions] = await Promise.all([
      this.masterServices.getServicesForMaster(master.id),
      this.portfolio.listByMaster(master.id),
      this.reviews.listByMaster(master.id),
      this.promotions.listBySalon(salon.id),
    ]);

    return ok({
      master,
      salon: toPublicMasterWorkplace(salon),
      services,
      portfolio,
      reviews,
      promotions: promotions.filter((item) => isPromotionLive(item, this.clock.utcNow())),
    } satisfies PublicMasterProfile);
  }
}
