export const PORTFOLIO_LIMITS = {
  maxPhotos: 20,
  captionMax: 140,
} as const;

export function validatePortfolioCaption(caption: string | null | undefined) {
  const value = caption?.trim() ?? "";
  if (value.length > PORTFOLIO_LIMITS.captionMax) return "Подпись слишком длинная";
  return null;
}

export function normalizePortfolioCaption(caption: string | null | undefined) {
  const value = caption?.trim() ?? "";
  return value ? value : null;
}
