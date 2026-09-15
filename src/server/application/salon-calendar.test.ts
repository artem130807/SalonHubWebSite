import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { TimeSlotStatus, UserRole } from "@/server/domain/types";
import { seedSalon } from "@/server/test/harness";

describe("public salon calendar", () => {
  it("aggregates free and busy windows across salon masters", async () => {
    const { app, adminReg, clientReg, salon, master, service, window } = await seedSalon();
    const second = await app.masters.createForSalon(adminReg.value.userId, salon.value.id, {
      name: "Второй",
      email: "master2@test.com",
      phone: "+79991112235",
      password: "password1",
      specialization: "Борода",
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    await app.masters.assignService(adminReg.value.userId, second.value.id, service.value.id);
    const secondWindow = await app.timeSlots.create(second.value.userId, {
      scheduleDate: "2026-09-03",
      startTime: "12:00",
      endTime: "16:00",
    });
    expect(secondWindow.ok).toBe(true);
    await app.repos.timeSlots.add({
      id: randomUUID(),
      masterId: master.value.id,
      scheduleDate: "2026-09-04",
      startTime: "09:00",
      endTime: "11:00",
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

    const calendar = await app.salonSchedule.getCalendar(salon.value.id, "2026-09");
    expect(calendar.ok).toBe(true);
    if (!calendar.ok) return;
    expect(calendar.value.masters.map((item) => item.userName).sort()).toEqual(["Второй", "Мастер"]);
    expect(calendar.value.days.map((day) => day.date)).toEqual(["2026-09-03"]);
    const day = calendar.value.days[0];
    expect(day?.workingMasterCount).toBe(2);
    expect(day?.freeMasterCount).toBe(2);
    expect(day?.masters).toHaveLength(2);
    const first = day?.masters.find((item) => item.masterId === master.value.id);
    const other = day?.masters.find((item) => item.masterId === second.value.id);
    expect(first?.windows).toEqual([{ startTime: "10:00", endTime: "18:00" }]);
    expect(first?.busy).toEqual([{ startTime: "10:00", endTime: "10:30" }]);
    expect(other?.windows).toEqual([{ startTime: "12:00", endTime: "16:00" }]);
    expect(other?.busy).toEqual([]);
    expect(JSON.stringify(calendar.value)).not.toContain("Клиент");
    expect(JSON.stringify(calendar.value)).not.toContain(clientReg.value.email);
    expect(JSON.stringify(calendar.value)).not.toContain("master2@test.com");
  });

  it("does not count a fully booked master as free", async () => {
    const { app, adminReg, clientReg, salon, master, service } = await seedSalon();
    const second = await app.masters.createForSalon(adminReg.value.userId, salon.value.id, {
      name: "Второй",
      email: "master2@test.com",
      phone: "+79991112235",
      password: "password1",
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    await app.masters.assignService(adminReg.value.userId, second.value.id, service.value.id);
    const short = await app.timeSlots.create(second.value.userId, {
      scheduleDate: "2026-09-03",
      startTime: "12:00",
      endTime: "12:30",
    });
    expect(short.ok).toBe(true);
    if (!short.ok) return;
    const booked = await app.appointments.create(clientReg.value.userId, {
      salonId: salon.value.id,
      masterId: second.value.id,
      serviceId: service.value.id,
      timeSlotId: short.value.id,
      startTime: "12:00",
      appointmentDate: "2026-09-03",
    });
    expect(booked.ok).toBe(true);

    const calendar = await app.salonSchedule.getCalendar(salon.value.id, "2026-09");
    expect(calendar.ok).toBe(true);
    if (!calendar.ok) return;
    const day = calendar.value.days.find((item) => item.date === "2026-09-03");
    const full = day?.masters.find((item) => item.masterId === second.value.id);
    const open = day?.masters.find((item) => item.masterId === master.value.id);
    expect(full?.freeStartCount).toBe(0);
    expect(open?.freeStartCount).toBeGreaterThan(0);
    expect(day?.workingMasterCount).toBe(2);
    expect(day?.freeMasterCount).toBe(1);
  });

  it("does not include another salon's masters", async () => {
    const { app, salon, master } = await seedSalon();
    const extraAdmin = await app.auth.register(
      {
        name: "Админ2",
        email: "admin2@test.com",
        phone: "+79991112236",
        password: "password1",
        city: "Москва",
        role: UserRole.SalonAdmin,
      },
      true,
    );
    expect(extraAdmin.ok).toBe(true);
    if (!extraAdmin.ok) return;
    await app.auth.verifyEmail("admin2@test.com", "123456");
    const extraSalon = await app.salons.create(extraAdmin.value.userId, {
      name: "Другой салон",
      city: "Москва",
      street: "Арбат",
      building: "2",
    });
    expect(extraSalon.ok).toBe(true);
    if (!extraSalon.ok) return;
    const extraMaster = await app.masters.createForSalon(extraAdmin.value.userId, extraSalon.value.id, {
      name: "Чужой",
      email: "other-master@test.com",
      phone: "+79991112237",
      password: "password1",
    });
    expect(extraMaster.ok).toBe(true);
    if (!extraMaster.ok) return;
    await app.timeSlots.create(extraMaster.value.userId, {
      scheduleDate: "2026-09-03",
      startTime: "09:00",
      endTime: "10:00",
    });

    const calendar = await app.salonSchedule.getCalendar(salon.value.id);
    expect(calendar.ok).toBe(true);
    if (!calendar.ok) return;
    expect(calendar.value.masters.map((item) => item.id)).toEqual([master.value.id]);
    expect(calendar.value.days[0]?.masters.map((item) => item.masterId)).toEqual([master.value.id]);
  });

  it("returns not found for an unknown salon and rejects a far month", async () => {
    const { app, salon } = await seedSalon();
    const missing = await app.salonSchedule.getCalendar("00000000-0000-0000-0000-000000000000");
    expect(missing.ok).toBe(false);
    const far = await app.salonSchedule.getCalendar(salon.value.id, "2028-01");
    expect(far.ok).toBe(false);
  });
});
