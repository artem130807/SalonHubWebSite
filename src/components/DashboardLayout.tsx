"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Scissors,
  Calendar,
  Users,
  Settings,
  LogOut,
  LayoutDashboard,
  Clock,
  User,
} from "lucide-react";
import type { ReactNode } from "react";

type DashboardLayoutProps = {
  children: ReactNode;
  role: "barber" | "admin";
};

export function DashboardLayout({ children, role }: DashboardLayoutProps) {
  const pathname = usePathname();

  const adminLinks = [
    { to: "/admin", icon: LayoutDashboard, label: "Сводка" },
    { to: "/admin/appointments", icon: Calendar, label: "Записи" },
    { to: "/admin/staff", icon: Users, label: "Персонал" },
    { to: "/admin/services", icon: Scissors, label: "Услуги" },
    { to: "/admin/settings", icon: Settings, label: "Настройки" },
  ];

  const barberLinks = [
    { to: "/barber", icon: Calendar, label: "Мое расписание" },
    { to: "/barber/history", icon: Clock, label: "История" },
    { to: "/barber/profile", icon: Settings, label: "Профиль" },
  ];

  const links = role === "admin" ? adminLinks : barberLinks;

  return (
    <div className="min-h-screen bg-background text-onBackground font-sans flex">
      <aside className="w-64 bg-surface border-r border-outline flex-col hidden md:flex">
        <div className="h-20 flex items-center px-6 border-b border-outline">
          <Link href="/" className="flex items-center gap-2">
            <Scissors className="h-6 w-6 text-primary" />
            <span className="text-xl font-serif font-bold tracking-wide">
              SALON<span className="text-primary">HUB</span>
            </span>
          </Link>
        </div>

        <div className="p-4 flex-1">
          <p className="text-xs font-semibold text-onSurfaceVariant uppercase tracking-wider mb-4 px-2">
            {role === "admin" ? "Панель салона-партнера" : "Кабинет специалиста"}
          </p>
          <nav className="space-y-1">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.to;
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
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-error hover:bg-error/10 transition-colors font-medium"
          >
            <LogOut className="w-5 h-5" />
            Выход
          </Link>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-20 bg-surface border-b border-outline flex items-center px-4 sm:px-8 justify-between md:justify-end">
          <div className="md:hidden flex items-center gap-2">
            <Scissors className="h-6 w-6 text-primary" />
            <span className="font-serif font-bold">SALONHUB</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-onBackground">
                {role === "admin" ? "Администратор" : "Александр (Топ-стилист)"}
              </p>
              <p className="text-xs text-onSurfaceVariant">В сети</p>
            </div>
            <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center border border-primary/50">
              <User className="w-5 h-5 text-primary" />
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 md:p-8 overflow-y-auto">{children}</div>
      </main>
    </div>
  );
}
