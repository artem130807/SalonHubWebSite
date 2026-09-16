"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { BookingAuthGate } from "@/components/BookingAuthGate";
import { BookingModal } from "@/components/BookingModal";
import { bookingAccessFor, type BookingAccess } from "@/lib/booking-access";

type SalonOption = { id: string; name: string; address: string; availableStartsToday: number };

type BookingContextValue = {
  openBooking: (salonId?: string, masterId?: string, date?: string) => void;
  access: BookingAccess;
};

const BookingContext = createContext<BookingContextValue | null>(null);

export function BookingProvider({
  children,
  salons,
  viewerRole = null,
}: {
  children: ReactNode;
  salons: SalonOption[];
  viewerRole?: string | null;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selectedSalonId, setSelectedSalonId] = useState("");
  const [selectedMasterId, setSelectedMasterId] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [open, setOpen] = useState(false);
  const [instance, setInstance] = useState(0);
  const [intent, setIntent] = useState<"book" | "gate">("book");
  const access = useMemo(() => bookingAccessFor(viewerRole), [viewerRole]);

  const openBooking = useCallback(
    (salonId?: string, masterId?: string, date?: string) => {
      setSelectedSalonId(salonId ?? "");
      setSelectedMasterId(masterId ?? "");
      setSelectedDate(date ?? "");
      setIntent(access.status === "ready" ? "book" : "gate");
      setInstance((value) => value + 1);
      setOpen(true);
    },
    [access.status],
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    const onClose = () => setOpen(false);
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, [open, instance, intent]);

  const value = useMemo(() => ({ openBooking, access }), [openBooking, access]);

  return (
    <BookingContext.Provider value={value}>
      {children}
      {intent === "book" ? (
        <BookingModal
          key={instance}
          dialogRef={dialogRef}
          initialSalons={salons}
          selectedSalonId={selectedSalonId || undefined}
          selectedMasterId={selectedMasterId || undefined}
          selectedDate={selectedDate || undefined}
        />
      ) : (
        <BookingAuthGate key={instance} dialogRef={dialogRef} access={access} />
      )}
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const ctx = useContext(BookingContext);
  if (!ctx) {
    throw new Error("useBooking must be used within BookingProvider");
  }
  return ctx;
}
