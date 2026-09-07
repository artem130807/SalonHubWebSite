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
import { BookingModal } from "@/components/BookingModal";

type SalonOption = { id: string; name: string; address: string; availableStartsToday: number };

type BookingContextValue = {
  openBooking: (salonId?: string, masterId?: string) => void;
};

const BookingContext = createContext<BookingContextValue | null>(null);

export function BookingProvider({
  children,
  salons,
}: {
  children: ReactNode;
  salons: SalonOption[];
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selectedSalonId, setSelectedSalonId] = useState("");
  const [selectedMasterId, setSelectedMasterId] = useState("");
  const [open, setOpen] = useState(false);
  const [instance, setInstance] = useState(0);

  const openBooking = useCallback((salonId?: string, masterId?: string) => {
    setSelectedSalonId(salonId ?? "");
    setSelectedMasterId(masterId ?? "");
    setInstance((value) => value + 1);
    setOpen(true);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    const onClose = () => setOpen(false);
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, [open, instance]);

  const value = useMemo(() => ({ openBooking }), [openBooking]);

  return (
    <BookingContext.Provider value={value}>
      {children}
      <BookingModal
        key={instance}
        dialogRef={dialogRef}
        initialSalons={salons}
        selectedSalonId={selectedSalonId || undefined}
        selectedMasterId={selectedMasterId || undefined}
      />
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
