import { describe, expect, it } from "vitest";
import { sortSalonCards } from "@/server/application/salon-service";
import { createInMemoryRepos } from "@/server/infrastructure/memory-repositories";
import { seedSalon } from "@/server/test/harness";

describe("salon catalog search and sort", () => {
  it("sorts by rating, popularity and min price", () => {
    const cards = [
      { rating: 4, ratingCount: 10, minPrice: 1500 },
      { rating: 5, ratingCount: 2, minPrice: 800 },
      { rating: 4.5, ratingCount: 8, minPrice: null },
    ];
    expect(sortSalonCards(cards, "rating")[0]?.rating).toBe(5);
    expect(sortSalonCards(cards, "popular")[0]?.ratingCount).toBe(10);
    expect(sortSalonCards(cards, "price")[0]?.minPrice).toBe(800);
  });

  it("filters in-memory salons by city, name and service category", async () => {
    const repos = createInMemoryRepos();
    const base = {
      description: null,
      street: "Тверская",
      building: "1",
      phone: null,
      openingTime: null,
      closingTime: null,
      isActive: true,
      rating: 0,
      ratingCount: 0,
      createdAt: new Date("2026-09-03T08:00:00.000Z"),
    };
    repos.db.salons.push(
      { id: "s1", name: "Alpha Barbers", city: "Москва", ...base, rating: 4, ratingCount: 3 },
      { id: "s2", name: "Beta Beauty", city: "Казань", ...base, rating: 5, ratingCount: 12 },
    );
    repos.db.services.push({
      id: "svc",
      salonId: "s1",
      name: "Стрижка",
      description: null,
      durationMinutes: 30,
      price: 1000,
      isActive: true,
    });
    expect((await repos.salons.search({ city: "казань" })).map((s) => s.id)).toEqual(["s2"]);
    expect((await repos.salons.search({ city: "каз" })).map((s) => s.id)).toEqual([]);
    expect((await repos.salons.search({ city: "Москва", name: "beta" })).map((s) => s.id)).toEqual([]);
    expect((await repos.salons.search({ name: "alpha" })).map((s) => s.id)).toEqual(["s1"]);
    expect((await repos.salons.search({ category: "стрижка" })).map((s) => s.id)).toEqual(["s1"]);
  });

  it("returns catalog cards with min price and featured masters", async () => {
    const { app, salon, master, adminReg } = await seedSalon();
    await app.catalog.create(adminReg.value.userId, salon.value.id, {
      name: "Борода",
      durationMinutes: 20,
      price: 500,
    });
    const cards = await app.salons.search({ sort: "price" });
    expect(cards[0]?.id).toBe(salon.value.id);
    expect(cards[0]?.minPrice).toBe(500);
    await app.repos.masters.updateRating(master.value.id, 4.8, 7);
    const featured = await app.masters.featured(4);
    expect(featured.ok && featured.value[0]?.id).toBe(master.value.id);
    const otherCity = await app.masters.featured(4, "Казань");
    expect(otherCity.ok && otherCity.value).toEqual([]);
    const sameCity = await app.masters.featured(4, "Москва");
    expect(sameCity.ok && sameCity.value[0]?.id).toBe(master.value.id);
  });
});
