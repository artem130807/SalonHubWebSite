import { UserRole } from "@/server/domain/types";

export type BookingAccess = { status: "ready" } | { status: "guest" } | { status: "wrong-role" };

export function bookingAccessFor(role?: string | null): BookingAccess {
  if (!role) return { status: "guest" };
  if (role !== UserRole.Client) return { status: "wrong-role" };
  return { status: "ready" };
}

export function bookingCallToAction(access: BookingAccess, readyLabel: string) {
  if (access.status === "guest") return "Войти, чтобы записаться";
  if (access.status === "wrong-role") return "Нужен аккаунт клиента";
  return readyLabel;
}
