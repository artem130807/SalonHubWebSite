export const PROMOTION_LIMITS = {
  maxPerSalon: 10,
  minDiscount: 1,
  maxDiscount: 90,
  titleMax: 80,
  descriptionMax: 400,
} as const;

export type PromotionWindow = {
  isActive: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
};

export type DiscountOffer = {
  discountPercent: number;
  serviceId: string | null;
};

export function isPromotionLive(promo: PromotionWindow, now: Date) {
  if (!promo.isActive) return false;
  if (promo.startsAt && now < promo.startsAt) return false;
  if (promo.endsAt && now > promo.endsAt) return false;
  return true;
}

export function startOfUtcDay(dateOnly: string) {
  return new Date(`${dateOnly}T00:00:00.000Z`);
}

export function endOfUtcDay(dateOnly: string) {
  return new Date(`${dateOnly}T23:59:59.999Z`);
}

export function parsePromotionBoundary(value: string | null | undefined, endOfDay: boolean): Date | null {
  const raw = value?.trim() ?? "";
  if (!raw) return null;
  const dateOnly = raw.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return null;
  return endOfDay ? endOfUtcDay(dateOnly) : startOfUtcDay(dateOnly);
}

export function validatePromotionDraft(input: {
  title: string;
  description?: string | null;
  discountPercent: number;
  startsAt: Date | null;
  endsAt: Date | null;
}) {
  const title = input.title.trim();
  if (!title) return "Укажите название акции";
  if (title.length > PROMOTION_LIMITS.titleMax) return "Название акции слишком длинное";
  const description = input.description?.trim() ?? "";
  if (description.length > PROMOTION_LIMITS.descriptionMax) return "Описание акции слишком длинное";
  if (
    !Number.isInteger(input.discountPercent) ||
    input.discountPercent < PROMOTION_LIMITS.minDiscount ||
    input.discountPercent > PROMOTION_LIMITS.maxDiscount
  ) {
    return `Скидка должна быть от ${PROMOTION_LIMITS.minDiscount} до ${PROMOTION_LIMITS.maxDiscount} процентов`;
  }
  if (input.startsAt && input.endsAt && input.endsAt < input.startsAt) {
    return "Дата окончания акции не может быть раньше даты начала";
  }
  return null;
}

export function discountedPrice(price: number, discountPercent: number) {
  if (discountPercent <= 0) return Math.round(price);
  return Math.max(0, Math.round((price * (100 - discountPercent)) / 100));
}

export function bestDiscountForService(offers: DiscountOffer[], serviceId: string) {
  const applicable = offers.filter((offer) => !offer.serviceId || offer.serviceId === serviceId);
  if (applicable.length === 0) return 0;
  return Math.max(...applicable.map((offer) => offer.discountPercent));
}

export function bestDiscountPercent(offers: DiscountOffer[]) {
  if (offers.length === 0) return 0;
  return Math.max(...offers.map((offer) => offer.discountPercent));
}
