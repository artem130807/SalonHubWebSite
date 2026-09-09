"use client";

import type { PointerEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { stepIndex, swipeDirection } from "@/lib/carousel";

export type CarouselPhoto = {
  id: string;
  url: string;
  caption?: string | null;
};

export function PhotoCarousel({
  photos,
  alt,
  className = "h-64",
  emptyLabel = "Пока нет фото",
  showThumbs = false,
}: {
  photos: CarouselPhoto[];
  alt: string;
  className?: string;
  emptyLabel?: string;
  showThumbs?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const startX = useRef<number | null>(null);

  useEffect(() => {
    setIndex((value) => (photos.length === 0 ? 0 : Math.min(value, photos.length - 1)));
  }, [photos.length]);

  if (photos.length === 0) {
    return (
      <div className={`rounded-3xl border border-outline bg-surface/40 grid place-items-center text-onSurfaceVariant px-6 text-center ${className}`}>
        {emptyLabel}
      </div>
    );
  }

  const current = photos[index] ?? photos[0]!;

  function go(direction: -1 | 1) {
    setIndex((value) => stepIndex(value, photos.length, direction));
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    startX.current = event.clientX;
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (startX.current == null) return;
    const direction = swipeDirection(event.clientX - startX.current);
    startX.current = null;
    if (direction) go(direction);
  }

  return (
    <div className="space-y-3">
      <div
        className={`relative overflow-hidden rounded-3xl border border-outline bg-surface ${className} touch-pan-y select-none`}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          startX.current = null;
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={current.url} alt={current.caption || alt} className="w-full h-full object-cover pointer-events-none" />
        {photos.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Предыдущее фото"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 border border-outline text-onBackground hover:border-primary"
              onClick={() => go(-1)}
            >
              <ChevronLeft className="w-5 h-5 mx-auto" />
            </button>
            <button
              type="button"
              aria-label="Следующее фото"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 border border-outline text-onBackground hover:border-primary"
              onClick={() => go(1)}
            >
              <ChevronRight className="w-5 h-5 mx-auto" />
            </button>
            <span className="absolute top-3 right-3 text-xs font-bold bg-background/80 border border-outline rounded-full px-2.5 py-1">
              {index + 1} / {photos.length}
            </span>
          </>
        )}
        <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5">
          {photos.map((photo, photoIndex) => (
            <button
              key={photo.id}
              type="button"
              aria-label={`Фото ${photoIndex + 1}`}
              className={`h-1.5 rounded-full transition-all ${photoIndex === index ? "w-6 bg-primary" : "w-1.5 bg-white/50"}`}
              onClick={() => setIndex(photoIndex)}
            />
          ))}
        </div>
      </div>
      {showThumbs && photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          {photos.map((photo, photoIndex) => (
            <button
              key={photo.id}
              type="button"
              aria-label={`Открыть фото ${photoIndex + 1}`}
              onClick={() => setIndex(photoIndex)}
              className={`shrink-0 w-20 h-16 rounded-2xl overflow-hidden border ${photoIndex === index ? "border-primary" : "border-outline opacity-70 hover:opacity-100"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
      {current.caption && <p className="text-sm text-onSurfaceVariant text-center">{current.caption}</p>}
    </div>
  );
}
