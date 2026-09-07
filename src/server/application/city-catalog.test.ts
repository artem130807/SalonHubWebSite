import { describe, expect, it } from "vitest";
import { CityCatalog, loadCityCatalogFromFile } from "@/server/application/city-catalog";
import { createTestApp } from "@/server/test/harness";
import { UserRole } from "@/server/domain/types";

describe("CityCatalog", () => {
  it("validates and canonicalizes names like BarberBooking.API", () => {
    const cities = new CityCatalog(["Москва", "Казань", "Санкт-Петербург"]);
    expect(cities.isValid("москва")).toBe(true);
    expect(cities.isValid("Казань")).toBe(true);
    expect(cities.isValid("Неттакогогорода")).toBe(false);
    expect(cities.canonical(" москва ")).toBe("Москва");
    expect(cities.list("ка")).toEqual(["Казань"]);
    expect(cities.list()[0]).toBe("Казань");
  });

  it("loads the Russian cities json used by the API", () => {
    const cities = loadCityCatalogFromFile();
    expect(cities.isValid("Москва")).toBe(true);
    expect(cities.isValid("Казань")).toBe(true);
    expect(cities.list("моск")).toContain("Москва");
  });
});

describe("registration city rules", () => {
  it("rejects an unknown city and stores the official spelling", async () => {
    const app = createTestApp();
    const invalid = await app.auth.register(
      {
        name: "Иван",
        email: "bad-city@test.com",
        phone: "+79991112233",
        password: "password1",
        city: "ВымышленныйГородXYZ",
        role: UserRole.Client,
      },
      true,
    );
    expect(invalid.ok).toBe(false);
    if (invalid.ok) return;
    expect(invalid.error).toBe("Вы указали неверный город");

    const registered = await app.auth.register(
      {
        name: "Иван",
        email: "ok-city@test.com",
        phone: "+79991112236",
        password: "password1",
        city: "москва",
        role: UserRole.Client,
      },
      true,
    );
    expect(registered.ok).toBe(true);
    if (!registered.ok) return;
    const user = await app.repos.users.getById(registered.value.userId);
    expect(user?.city).toBe("Москва");
  });
});
