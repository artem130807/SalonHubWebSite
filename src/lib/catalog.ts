export const SERVICE_CATEGORIES = [
  { id: "cut", label: "Стрижка", query: "Стрижка", icon: "scissors" },
  { id: "shave", label: "Бритьё", query: "Бритьё", icon: "shave" },
  { id: "beard", label: "Усы/борода", query: "борода", icon: "beard" },
  { id: "massage", label: "Массаж", query: "Массаж", icon: "massage" },
  { id: "kids", label: "Детская", query: "Детск", icon: "kids" },
  { id: "premium", label: "Премиум", query: "Премиум", icon: "premium" },
] as const;

export type SalonSort = "rating" | "popular" | "price";

export function salonsHref(params: {
  q?: string;
  category?: string;
  city?: string;
  sort?: string;
}) {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.category) search.set("category", params.category);
  if (params.city) search.set("city", params.city);
  if (params.sort) search.set("sort", params.sort);
  const query = search.toString();
  return query ? `/salons?${query}` : "/salons";
}
