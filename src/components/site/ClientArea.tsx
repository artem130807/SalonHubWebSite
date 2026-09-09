"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Салоны", match: "home" },
  { href: "/account", label: "Записи", match: "exact" },
  { href: "/account/favorites", label: "Избранное", match: "prefix" },
  { href: "/account/reviews", label: "Отзывы", match: "prefix" },
  { href: "/account/inbox", label: "Уведомления", match: "prefix" },
  { href: "/account/settings", label: "Профиль", match: "prefix" },
] as const;

export function ClientArea({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <nav className="hidden md:flex flex-wrap gap-2.5 mb-8">
        {links.map((link) => {
          const active =
            link.match === "home"
              ? pathname === "/"
              : link.match === "exact"
                ? pathname === link.href
                : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                active
                  ? "bg-primary text-onPrimary shadow-md"
                  : "bg-surface border border-outline text-onSurface hover:border-primary hover:text-primary"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="bg-surface/30 rounded-3xl border border-outline/50 p-6 sm:p-8 shadow-sm">
        {children}
      </div>
    </div>
  );
}
