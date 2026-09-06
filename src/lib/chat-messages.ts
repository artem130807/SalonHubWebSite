export function upsertById<T extends { id: string }>(items: T[], incoming: T) {
  const index = items.findIndex((item) => item.id === incoming.id);
  if (index < 0) return [...items, incoming];
  const next = [...items];
  next[index] = incoming;
  return next;
}

export function removeById<T extends { id: string }>(items: T[], id: string) {
  return items.filter((item) => item.id !== id);
}
