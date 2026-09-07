import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ICityCatalog } from "@/server/application/ports";

export class CityCatalog implements ICityCatalog {
  private readonly originals: string[];
  private readonly byLower = new Map<string, string>();

  constructor(names: string[]) {
    const unique = new Map<string, string>();
    for (const name of names) {
      const trimmed = name.trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (!unique.has(key)) unique.set(key, trimmed);
    }
    this.byLower = unique;
    this.originals = [...unique.values()];
  }

  isValid(cityName: string) {
    if (!cityName.trim()) return false;
    return this.byLower.has(cityName.trim().toLowerCase());
  }

  canonical(cityName: string) {
    return this.byLower.get(cityName.trim().toLowerCase()) ?? null;
  }

  list(prefix?: string) {
    const term = prefix?.trim().toLowerCase() ?? "";
    const filtered = term
      ? this.originals.filter((city) => city.toLowerCase().startsWith(term))
      : this.originals;
    return [...filtered].sort((a, b) => {
      const groupA = a.charAt(0).toLocaleUpperCase("ru-RU");
      const groupB = b.charAt(0).toLocaleUpperCase("ru-RU");
      return groupA.localeCompare(groupB, "ru") || a.localeCompare(b, "ru");
    });
  }
}

type CitiesFile = {
  lists?: {
    cities?: Array<{ city?: string }>;
  };
};

export function loadCityCatalogFromFile(filePath = join(process.cwd(), "data", "cities.json")) {
  const json = JSON.parse(readFileSync(filePath, "utf8")) as CitiesFile;
  const names =
    json.lists?.cities
      ?.map((item) => item.city)
      .filter((name): name is string => Boolean(name?.trim())) ?? [];
  return new CityCatalog(names);
}

let cached: ICityCatalog | undefined;

export function getCityCatalog() {
  cached ??= loadCityCatalogFromFile();
  return cached;
}
