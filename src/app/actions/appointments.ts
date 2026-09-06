"use server";

import { revalidatePath } from "next/cache";
import { UserRole } from "@/server/domain/types";
import { getApp } from "@/server/infrastructure/get-app";
import { requireRole } from "@/lib/session";

export async function cancelAppointmentAction(formData: FormData) {
  const appointmentId = String(formData.get("id") ?? "");
  if (!appointmentId) return;
  const session = await requireRole([UserRole.Client, UserRole.Master]);
  const result = await getApp().appointments.cancel(session.userId, appointmentId);
  if (!result.ok) return;
  revalidatePath("/account");
  revalidatePath("/barber");
  revalidatePath("/admin");
}
