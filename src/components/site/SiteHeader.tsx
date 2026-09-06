"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import {
  Bell,
  Calendar,
  Heart,
  Home,
  LogIn,
  LogOut,
  MessageCircle,
  Scissors,
  Search,
  User,
} from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { UserRole } from "@/server/domain/types";
import { salonsHref } from "@/lib/catalog";

export type SiteViewer = {
  name: string;
  role: string;
} | null;

export function SiteHeader({ viewer }: { viewer: SiteViewer }) {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const isClient = viewer?.role === UserRole.Client;
  const cabinet =
    viewer?.role === UserRole.SalonAdmin ? "/admin" : viewer?.role === UserRole.Master ? "/barber" : "/account";

  function onSearch(event: FormEvent) {
    event.preventDefault();
    router.push(salonsHref({ q: query.trim() || undefined }));
  }

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-outline/50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-6 h-20">
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="bg-primary/10 p-2 rounded-xl group-hover:bg-primary/20 transition-colors">
              <Scissors className="h-6 w-6 text-primary" />
            </div>
            <span className="text-2xl font-serif font-bold tracking-wide">
              SALON<span className="text-primary">HUB</span>
            </span>
          </Link>

          <form onSubmit={onSearch} className="hidden md:flex flex-1 max-w-xl">
            <label className="flex items-center gap-3 w-full bg-surface/50 border border-outline rounded-2xl px-4 py-2.5 focus-within:border-primary focus-within:bg-surface transition-all">
              <Search className="w-4 h-4 text-onSurfaceVariant" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Поиск салона..."
                className="w-full bg-transparent outline-none text-sm placeholder:text-onSurfaceVariant"
              />
            </label>
          </form>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link href="/salons" className={navClass(pathname.startsWith("/salons"))}>
              Салоны
            </Link>
            {isClient && (
              <>
                <Link href="/account" className={navClass(pathname === "/account")}>
                  Записи
                </Link>
                <Link href="/account/favorites" className={navClass(pathname.startsWith("/account/favorites"))}>
                  <span className="inline-flex items-center gap-1.5">
                    <Heart className="w-4 h-4" /> Избранное
                  </span>
                </Link>
                <Link href="/account/inbox" className={navClass(pathname.startsWith("/account/inbox"))} aria-label="Уведомления">
                  <Bell className="w-5 h-5" />
                </Link>
              </>
            )}
            {viewer ? (
              <>
                <Link href={cabinet} className="text-onSurface hover:text-primary transition-colors">
                  {isClient ? viewer.name.split(" ")[0] : "Кабинет"}
                </Link>
                <form action={logoutAction}>
                  <button type="submit" className="text-onSurfaceVariant hover:text-error inline-flex items-center gap-1.5 transition-colors">
                    <LogOut className="w-4 h-4" />
                    Выход
                  </button>
                </form>
              </>
            ) : (
              <Link
                href="/login"
                className="bg-primary text-onPrimary px-6 py-2.5 rounded-xl font-bold hover:bg-primaryVariant transition-colors shadow-sm hover:shadow-md"
              >
                Войти
              </Link>
            )}
          </nav>

          <Link
            href={viewer ? cabinet : "/login"}
            className="md:hidden text-onSurfaceVariant"
            aria-label={viewer ? "Профиль" : "Войти"}
          >
            <User className="w-6 h-6" />
          </Link>
        </div>
        <form onSubmit={onSearch} className="md:hidden pb-4">
          <label className="flex items-center gap-3 w-full bg-surface/50 border border-outline rounded-2xl px-4 py-3 focus-within:border-primary focus-within:bg-surface transition-all">
            <Search className="w-5 h-5 text-onSurfaceVariant" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск салона..."
              className="w-full bg-transparent outline-none text-base placeholder:text-onSurfaceVariant"
            />
          </label>
        </form>
      </div>
    </header>
  );
}

function navClass(active: boolean) {
  return active ? "text-primary font-bold" : "text-onSurface hover:text-primary transition-colors";
}

export function ClientBottomNav({ viewer }: { viewer: SiteViewer }) {
  const pathname = usePathname();
  const isClient = !viewer || viewer.role === UserRole.Client;
  if (!isClient) return null;
  const items = viewer
    ? [
        { href: "/", label: "Главная", icon: Home, match: "home" as const },
        { href: "/salons", label: "Поиск", icon: Search, match: "prefix" as const },
        { href: "/account", label: "Записи", icon: Calendar, match: "exact" as const },
        { href: "/account/chat", label: "Чат", icon: MessageCircle, match: "prefix" as const },
        { href: "/account/favorites", label: "Избранное", icon: Heart, match: "prefix" as const },
        { href: "/account/settings", label: "Профиль", icon: User, match: "prefix" as const },
      ]
    : [
        { href: "/", label: "Главная", icon: Home, match: "home" as const },
        { href: "/salons", label: "Поиск", icon: Search, match: "prefix" as const },
        { href: "/login", label: "Войти", icon: LogIn, match: "prefix" as const },
      ];
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-surface border-t border-outline">
      <div className={`grid ${items.length > 3 ? "grid-cols-6" : "grid-cols-3"}`}>
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            item.match === "home"
              ? pathname === "/"
              : item.match === "exact"
                ? pathname === item.href
                : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-2 text-[10px] ${active ? "text-primary font-semibold" : "text-onSurfaceVariant"}`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
