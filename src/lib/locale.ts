export function ratingCountLabel(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} отзыв`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} отзыва`;
  return `${count} отзывов`;
}

export const WEEKDAYS_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export const MONTHS_NOMINATIVE = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

export const MONTHS_GENITIVE = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

export function monthTitle(yearMonth: string) {
  const year = Number(yearMonth.slice(0, 4));
  const month = Number(yearMonth.slice(5, 7));
  return `${MONTHS_NOMINATIVE[month - 1] ?? yearMonth} ${year}`;
}

export function humanDate(date: string) {
  const day = Number(date.slice(8, 10));
  const month = Number(date.slice(5, 7));
  return `${day} ${MONTHS_GENITIVE[month - 1] ?? date}`;
}
