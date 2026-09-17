"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, MoreHorizontal, Scissors, User, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { logoutAction } from "@/app/actions/auth";
import { NotificationListener } from "@/components/NotificationListener";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  dashboardHome,
  dashboardLinks,
  dashboardPrimaryLinks,
  isDashboardLinkActive,
  type DashboardRole,
} from "@/lib/dashboard-nav";

type DashboardLayoutProps = {
  children: ReactNode;
  role: DashboardRole;
  name?: string;
};

export function DashboardLayout({ children, role, name }: DashboardLayoutProps) {
  const pathname = usePathname();
  const links = dashboardLinks(role);
  const home = dashboardHome(role);
  const title = role === "admin" ? "Панель салона" : role === "barber" ? "Кабинет мастера" : "Личный кабинет";
  const displayName = name ?? (role === "admin" ? "Администратор" : role === "barber" ? "Мастер" : "Клиент");

  return (
    <div className="min-h-dvh bg-background text-onBackground font-sans flex">
      <NotificationListener />
      <aside className="w-64 bg-surface border-r border-outline flex-col hidden md:flex">
        <div className="h-20 flex items-center px-6 border-b border-outline">
          <Link href="/" className="flex items-center gap-2">
            <Scissors className="h-6 w-6 text-primary" />
            <span className="text-xl font-serif font-bold tracking-wide">
              SALON<span className="text-primary">HUB</span>
            </span>
          </Link>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          <p className="text-xs font-semibold text-onSurfaceVariant uppercase tracking-wider mb-4 px-2">{title}</p>
          <nav className="space-y-1">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = isDashboardLinkActive(pathname, link.to, home);
              return (
                <Link
                  key={link.to}
                  href={link.to}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors font-medium ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-onSurface hover:bg-surfaceVariant hover:text-onBackground"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-4 border-t border-outline">
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-error hover:bg-error/10 transition-colors font-medium w-full"
            >
              <LogOut className="w-5 h-5" />
              Выход
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-40 min-h-14 md:h-20 bg-surface/95 backdrop-blur-xl border-b border-outline flex items-center px-4 sm:px-8 justify-between gap-3 pt-[env(safe-area-inset-top)]">
          <Link href={home} className="md:hidden flex items-center gap-2 min-w-0">
            <Scissors className="h-5 w-5 text-primary shrink-0" />
            <span className="font-serif font-bold truncate">SALONHUB</span>
          </Link>
          <p className="hidden md:block text-sm text-onSurfaceVariant">{title}</p>
          <div className="flex items-center gap-3 sm:gap-4">
            <ThemeToggle />
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-onBackground">{displayName}</p>
              <p className="text-xs text-onSurfaceVariant">В сети</p>
            </div>
            <div className="w-9 h-9 md:w-10 md:h-10 bg-primary/20 rounded-full flex items-center justify-center border border-primary/50">
              <User className="w-5 h-5 text-primary" />
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 md:p-8 overflow-y-auto pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-8">
          {children}
        </div>
      </main>
      <DashboardBottomNav role={role} />
    </div>
  );
}

function DashboardBottomNav({ role }: { role: DashboardRole }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const home = dashboardHome(role);
  const primary = dashboardPrimaryLinks(role);
  const extra = dashboardLinks(role).filter((link) => !primary.some((item) => item.to === link.to));
  const moreActive = extra.some((link) => isDashboardLinkActive(pathname, link.to, home));

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  return (
    <>
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <button type="button" className="absolute inset-0 bg-black/50" aria-label="Закрыть меню" onClick={() => setMoreOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-surface border-t border-outline p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between mb-3">
              <p className="font-serif font-bold text-lg">Ещё</p>
              <button type="button" onClick={() => setMoreOpen(false)} className="p-2 rounded-full border border-outline" aria-label="Закрыть">
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav className="grid grid-cols-3 gap-2">
              {extra.map((link) => {
                const Icon = link.icon;
                const active = isDashboardLinkActive(pathname, link.to, home);
                return (
                  <Link
                    key={link.to}
                    href={link.to}
                    className={`flex flex-col items-center justify-center gap-1 min-h-16 rounded-2xl border text-xs font-medium ${
                      active ? "border-primary bg-primary/10 text-primary" : "border-outline text-onSurfaceVariant"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {link.label}
                  </Link>
                );
              })}
            </nav>
            <form action={logoutAction} className="mt-3">
              <button type="submit" className="w-full min-h-12 rounded-2xl border border-error/30 text-error font-semibold">
                Выход
              </button>
            </form>
          </div>
        </div>
      )}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur-xl border-t border-outline pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5">
          {primary.map((link) => {
            const Icon = link.icon;
            const active = isDashboardLinkActive(pathname, link.to, home);
            return (
              <Link
                key={link.to}
                href={link.to}
                className={`flex flex-col items-center justify-center min-h-14 text-[10px] ${
                  active ? "text-primary font-semibold" : "text-onSurfaceVariant"
                }`}
              >
                <Icon className="w-5 h-5 mb-0.5" />
                {link.shortLabel ?? link.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={`flex flex-col items-center justify-center min-h-14 text-[10px] ${
              moreActive ? "text-primary font-semibold" : "text-onSurfaceVariant"
            }`}
          >
            <MoreHorizontal className="w-5 h-5 mb-0.5" />
            Ещё
          </button>
        </div>
      </nav>
    </>
  );
}
