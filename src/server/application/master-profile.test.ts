import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { seedSalon } from "@/server/test/harness";
import { TimeSlotStatus } from "@/server/domain/types";

describe("public master profile", () => {
  it("assembles workplace, services, portfolio and reviews for clients", async () => {
    const { app, clientReg, salon, master, service, window } = await seedSalon();
    const photo = await app.portfolio.add(master.value.userId, {
      url: "/uploads/fade.jpg",
      caption: "Fade",
    });
    expect(photo.ok).toBe(true);

    const booked = await app.appointments.create(clientReg.value.userId, {
      salonId: salon.value.id,
      masterId: master.value.id,
      serviceId: service.value.id,
      timeSlotId: window.value.id,
      startTime: "10:00",
      appointmentDate: "2026-09-03",
    });
    expect(booked.ok).toBe(true);
    if (!booked.ok) return;
    await app.appointments.complete(master.value.userId, booked.value.id);
    const review = await app.reviews.create(clientReg.value.userId, {
      appointmentId: booked.value.id,
      salonRating: 5,
      masterRating: 5,
      comment: "Отличная стрижка",
    });
    expect(review.ok).toBe(true);

    const profile = await app.publicMasters.getById(master.value.id);
    expect(profile.ok).toBe(true);
    if (!profile.ok) return;
    expect(profile.value.master.userName).toBe("Мастер");
    expect(profile.value.salon).toMatchObject({
      id: salon.value.id,
      name: "Салон",
      city: "Москва",
      street: "Тверская",
      building: "1",
    });
    expect(profile.value.services.map((item) => item.id)).toEqual([service.value.id]);
    expect(profile.value.portfolio).toHaveLength(1);
    expect(profile.value.reviews).toHaveLength(1);
    expect(profile.value.reviews[0]?.clientName).toBe("Клиент");
    expect(profile.value.reviews[0]?.masterRating).toBe(5);
    expect(profile.value.master.rating).toBe(5);
    expect(profile.value.master.ratingCount).toBe(1);
  });

  it("does not expose a master of an inactive salon", async () => {
    const { app, salon, master } = await seedSalon();
    await app.repos.salons.update({ ...salon.value, isActive: false });
    const missing = await app.publicMasters.getById(master.value.id);
    expect(missing.ok).toBe(false);
  });

  it("returns not found for an unknown master", async () => {
    const { app } = await seedSalon();
    const missing = await app.publicMasters.getById("00000000-0000-0000-0000-000000000000");
    expect(missing.ok).toBe(false);
  });

  it("lets a master set and clear a profile photo", async () => {
    const { app, master } = await seedSalon();
    const unsafe = await app.masters.updateOwnAvatar(master.value.userId, "javascript:alert(1)");
    expect(unsafe.ok).toBe(false);
    const set = await app.masters.updateOwnAvatar(master.value.userId, "/uploads/face.jpg");
    expect(set.ok && set.value.avatarUrl).toBe("/uploads/face.jpg");
    const profile = await app.publicMasters.getById(master.value.id);
    expect(profile.ok && profile.value.master.avatarUrl).toBe("/uploads/face.jpg");
    const cleared = await app.masters.updateOwnAvatar(master.value.userId, null);
    expect(cleared.ok && (cleared.value.avatarUrl ?? null)).toBe(null);
  });

  it("embeds a public month calendar without leaking client names", async () => {
    const { app, clientReg, salon, master, service, window } = await seedSalon();
    await app.repos.timeSlots.add({
      id: randomUUID(),
      masterId: master.value.id,
      scheduleDate: "2026-09-04",
      startTime: "12:00",
      endTime: "16:00",
      status: TimeSlotStatus.Cancelled,
    });
    const booked = await app.appointments.create(clientReg.value.userId, {
      salonId: salon.value.id,
      masterId: master.value.id,
      serviceId: service.value.id,
      timeSlotId: window.value.id,
      startTime: "10:00",
      appointmentDate: "2026-09-03",
    });
    expect(booked.ok).toBe(true);

    const profile = await app.publicMasters.getById(master.value.id);
    expect(profile.ok).toBe(true);
    if (!profile.ok) return;
    expect(profile.value.calendar.month).toBe("2026-09");
    expect(profile.value.calendar.from).toBe("2026-08-31");
    expect(profile.value.calendar.days.map((day) => day.date)).toEqual(["2026-09-03"]);
    const day = profile.value.calendar.days[0];
    const workplace = day?.workplaces[0];
    expect(profile.value.calendar.workplaces).toEqual([
      expect.objectContaining({
        id: salon.value.id,
        name: "Салон",
        city: "Москва",
        street: "Тверская",
        building: "1",
      }),
    ]);
    expect(day?.workingSalonCount).toBe(1);
    expect(day?.freeSalonCount).toBe(1);
    expect(workplace?.salonId).toBe(salon.value.id);
    expect(workplace?.windows).toEqual([{ startTime: "10:00", endTime: "18:00" }]);
    expect(workplace?.busy).toEqual([{ startTime: "10:00", endTime: "10:30" }]);
    expect(workplace?.freeStartCount).toBeGreaterThan(0);
    expect(JSON.stringify(profile.value.calendar)).not.toContain("Клиент");
    expect(JSON.stringify(profile.value.calendar)).not.toContain(clientReg.value.email);
  });

  it("rejects a month outside the public horizon", async () => {
    const { app, master } = await seedSalon();
    const far = await app.publicMasters.getCalendar(master.value.id, "2028-01");
    expect(far.ok).toBe(false);
    const invalid = await app.publicMasters.getCalendar(master.value.id, "09-2026");
    expect(invalid.ok).toBe(false);
    const impossible = await app.publicMasters.getCalendar(master.value.id, "2026-13");
    expect(impossible.ok).toBe(false);
  });
});
