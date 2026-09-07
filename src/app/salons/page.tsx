import Link from "next/link";
import { Search } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { SalonCard } from "@/components/site/SalonCard";
import { SERVICE_CATEGORIES, salonsHref, type SalonSort } from "@/lib/catalog";
import { getApp } from "@/server/infrastructure/get-app";
import { getOptionalSession } from "@/lib/session";

export const dynamic = "force-dynamic";

function parseSort(value?: string): SalonSort | undefined {
  if (value === "rating" || value === "popular" || value === "price") return value;
  return undefined;
}

export default async function SalonsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() || undefined;
  const category = params.category?.trim() || undefined;
  const sort = parseSort(params.sort);
  const session = await getOptionalSession();
  const city = session?.city || undefined;
  let salons: Awaited<ReturnType<ReturnType<typeof getApp>["salons"]["search"]>> = [];
  try {
    salons = await getApp().salons.search({ name: q, category, city, sort });
  } catch {
    salons = [];
  }

  const sorts: { id: SalonSort; label: string }[] = [
    { id: "rating", label: "По рейтингу" },
    { id: "popular", label: "Популярные" },
    { id: "price", label: "Дешевле" },
  ];

  return (
    <SiteShell>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div>
          <h1 className="text-4xl sm:text-5xl font-serif font-bold mb-3">
            {city ? `Салоны в городе ${city}` : "Список салонов"}
          </h1>
          <p className="text-lg text-onSurfaceVariant">Поиск, категории и сортировка — как удобно выбрать место для записи</p>
        </div>

        <form className="flex flex-col md:flex-row items-center gap-0 bg-surface/50 p-2 rounded-3xl border border-outline/50 shadow-sm relative z-10 w-full">
          <label className="flex items-center gap-4 flex-1 w-full px-6 py-4 group">
            <Search className="w-6 h-6 text-onSurfaceVariant group-focus-within:text-primary transition-colors" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Поиск салона, услуги или мастера..."
              className="w-full bg-transparent outline-none text-lg py-1 placeholder:text-onSurfaceVariant/70"
            />
          </label>
          <button type="submit" className="w-full md:w-auto bg-primary text-onPrimary px-10 py-4 rounded-2xl font-bold text-lg hover:bg-primaryVariant transition-colors shadow-sm hover:shadow-md mt-2 md:mt-0 md:ml-2">
            Искать
          </button>
        </form>

        <div className="flex flex-wrap gap-2.5">
          {SERVICE_CATEGORIES.map((item) => (
            <Link
              key={item.id}
              href={salonsHref({ q, sort, category: category === item.query ? undefined : item.query })}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${category === item.query ? "bg-primary text-onPrimary shadow-md" : "bg-surface border border-outline text-onSurface hover:border-primary hover:text-primary"}`}
            >
              {item.label}
            </Link>
          ))}
          <div className="w-px h-8 bg-outline mx-2 self-center hidden sm:block" />
          {sorts.map((item) => (
            <Link
              key={item.id}
              href={salonsHref({ q, category, sort: sort === item.id ? undefined : item.id })}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${sort === item.id ? "bg-primary text-onPrimary shadow-md" : "bg-surface border border-outline text-onSurface hover:border-primary hover:text-primary"}`}
            >
              {item.label}
            </Link>
          ))}
          {(q || category || sort) && (
            <Link href="/salons" className="px-4 py-2 rounded-full text-sm font-medium bg-error/10 text-error hover:bg-error/20 transition-colors ml-auto">
              Сбросить
            </Link>
          )}
        </div>

        {salons.length === 0 ? (
          <div className="py-20 text-center bg-surface/30 rounded-3xl border border-outline/50">
            <p className="text-xl text-onSurfaceVariant">
              {city ? "Салоны в вашем городе не найдены" : "Ничего не найдено"}
            </p>
            <p className="text-sm text-onSurfaceVariant mt-2">Попробуйте изменить параметры поиска</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {salons.map((salon) => (
              <SalonCard key={salon.id} salon={salon} />
            ))}
          </div>
        )}
      </main>
    </SiteShell>
  );
}
