export function wrapIndex(index: number, length: number) {
  if (length <= 0) return 0;
  return ((index % length) + length) % length;
}

export function stepIndex(index: number, length: number, direction: -1 | 1) {
  return wrapIndex(index + direction, length);
}

export function swipeDirection(deltaX: number, threshold = 40): -1 | 1 | 0 {
  if (deltaX <= -threshold) return 1;
  if (deltaX >= threshold) return -1;
  return 0;
}
