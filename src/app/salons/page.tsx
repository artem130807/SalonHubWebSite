import Link from "next/link";
import { SiteShell } from "@/components/site/SiteShell";
import { SalonCard } from "@/components/site/SalonCard";
import { SERVICE_CATEGORIES, salonsHref, type SalonSort } from "@/lib/catalog";
import { getApp } from "@/server/infrastructure/get-app";

export const dynamic = "force-dynamic";

function parseSort(value?: string): SalonSort | undefined {
  if (value === "rating" || value === "popular" || value === "price") return value;
  return undefined;
}

export default async function SalonsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; city?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() || undefined;
  const category = params.category?.trim() || undefined;
  const city = params.city?.trim() || undefined;
  const sort = parseSort(params.sort);
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
          <h1 className="text-4xl sm:text-5xl font-serif font-bold mb-3">Список салонов</h1>
          <p className="text-lg text-onSurfaceVariant">Поиск, категории и сортировка — как удобно выбрать место для записи</p>
        </div>

        <form className="flex flex-col sm:flex-row gap-4 bg-surface/50 p-4 rounded-3xl border border-outline/50 shadow-sm">
          <input
            name="q"
            defaultValue={q}
            placeholder="Название, улица или город..."
            className="flex-1 bg-background border border-outline rounded-2xl px-5 py-3.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all"
          />
          <input
            name="city"
            defaultValue={city}
            placeholder="Город..."
            className="sm:w-56 bg-background border border-outline rounded-2xl px-5 py-3.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all"
          />
          <button type="submit" className="bg-primary text-onPrimary px-8 py-3.5 rounded-2xl font-bold hover:bg-primaryVariant transition-colors shadow-sm hover:shadow-md">
            Искать
          </button>
        </form>

        <div className="flex flex-wrap gap-2.5">
          {SERVICE_CATEGORIES.map((item) => (
            <Link
              key={item.id}
              href={salonsHref({ q, city, sort, category: category === item.query ? undefined : item.query })}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${category === item.query ? "bg-primary text-onPrimary shadow-md" : "bg-surface border border-outline text-onSurface hover:border-primary hover:text-primary"}`}
            >
              {item.label}
            </Link>
          ))}
          <div className="w-px h-8 bg-outline mx-2 self-center hidden sm:block" />
          {sorts.map((item) => (
            <Link
              key={item.id}
              href={salonsHref({ q, city, category, sort: sort === item.id ? undefined : item.id })}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${sort === item.id ? "bg-primary text-onPrimary shadow-md" : "bg-surface border border-outline text-onSurface hover:border-primary hover:text-primary"}`}
            >
              {item.label}
            </Link>
          ))}
          {(q || category || city || sort) && (
            <Link href="/salons" className="px-4 py-2 rounded-full text-sm font-medium bg-error/10 text-error hover:bg-error/20 transition-colors ml-auto">
              Сбросить
            </Link>
          )}
        </div>

        {salons.length === 0 ? (
          <div className="py-20 text-center bg-surface/30 rounded-3xl border border-outline/50">
            <p className="text-xl text-onSurfaceVariant">Ничего не найдено</p>
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
