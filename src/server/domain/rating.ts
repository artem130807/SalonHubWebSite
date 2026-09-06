export function isValidStarRating(value: number) {
  return Number.isInteger(value) && value >= 1 && value <= 5;
}

export function applyRating(current: number, count: number, next: number, previous?: number) {
  if (previous == null) {
    const ratingCount = count + 1;
    return { rating: (current * count + next) / ratingCount, ratingCount };
  }
  if (count <= 0) return { rating: next, ratingCount: 1 };
  return {
    rating: (current * count - previous + next) / count,
    ratingCount: count,
  };
}

export function removeRating(current: number, count: number, value: number) {
  if (count <= 1) return { rating: 0, ratingCount: 0 };
  const ratingCount = count - 1;
  return { rating: (current * count - value) / ratingCount, ratingCount };
}
