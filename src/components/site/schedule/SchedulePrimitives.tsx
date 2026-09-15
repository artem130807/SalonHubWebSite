export type ScheduleInterval = { startTime: string; endTime: string };

export function formatClock(value: string) {
  const parts = value.split(":");
  if (parts.length >= 2) return `${parts[0]?.padStart(2, "0")}:${parts[1]?.padStart(2, "0")}`;
  return value;
}

function toMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function fromMinutes(total: number) {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${className}`} />
      {label}
    </span>
  );
}

export function DayTimeline({
  windows,
  busy,
  compact = false,
}: {
  windows: ScheduleInterval[];
  busy: ScheduleInterval[];
  compact?: boolean;
}) {
  if (windows.length === 0) return null;
  const spanStart = Math.min(...windows.map((item) => toMinutes(item.startTime)));
  const spanEnd = Math.max(...windows.map((item) => toMinutes(item.endTime)));
  const span = Math.max(spanEnd - spanStart, 1);
  const segments = buildSegments(windows, busy);

  return (
    <div className={compact ? "mt-2" : "mt-4"}>
      <div
        className={`relative rounded-2xl bg-outline/30 overflow-hidden border border-outline/40 ${compact ? "h-8" : "h-12"}`}
      >
        {segments.map((segment, index) => (
          <div
            key={`${segment.start}-${segment.end}-${index}`}
            title={`${fromMinutes(segment.start)}–${fromMinutes(segment.end)} · ${segment.kind === "busy" ? "занято" : segment.kind === "free" ? "свободно" : "перерыв"}`}
            className={`absolute top-1 bottom-1 rounded-xl ${
              segment.kind === "free" ? "bg-primary/85" : segment.kind === "busy" ? "bg-onSurface/25" : "bg-transparent"
            }`}
            style={{
              left: `${((segment.start - spanStart) / span) * 100}%`,
              width: `${((segment.end - segment.start) / span) * 100}%`,
            }}
          />
        ))}
      </div>
      <div className="flex justify-between text-[11px] text-onSurfaceVariant mt-1.5 px-0.5">
        <span>{fromMinutes(spanStart)}</span>
        <span>{fromMinutes(spanEnd)}</span>
      </div>
    </div>
  );
}

function buildSegments(windows: ScheduleInterval[], busy: ScheduleInterval[]) {
  const ordered = [...windows].sort((left, right) => left.startTime.localeCompare(right.startTime));
  const segments: { start: number; end: number; kind: "free" | "busy" | "gap" }[] = [];
  ordered.forEach((window, index) => {
    const start = toMinutes(window.startTime);
    const end = toMinutes(window.endTime);
    if (index > 0) {
      const prevEnd = toMinutes(ordered[index - 1]!.endTime);
      if (start > prevEnd) segments.push({ start: prevEnd, end: start, kind: "gap" });
    }
    const inside = busy
      .map((item) => ({
        start: Math.max(start, toMinutes(item.startTime)),
        end: Math.min(end, toMinutes(item.endTime)),
      }))
      .filter((item) => item.end > item.start)
      .sort((left, right) => left.start - right.start);
    let cursor = start;
    for (const block of inside) {
      if (block.start > cursor) segments.push({ start: cursor, end: block.start, kind: "free" });
      segments.push({ start: block.start, end: block.end, kind: "busy" });
      cursor = Math.max(cursor, block.end);
    }
    if (cursor < end) segments.push({ start: cursor, end, kind: "free" });
  });
  return segments;
}
