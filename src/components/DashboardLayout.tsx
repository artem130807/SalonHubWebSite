"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Scissors,
  Calendar,
  LogOut,
  LayoutDashboard,
  User,
  Bell,
  MessageCircle,
  Star,
  Heart,
  Settings,
  Camera,
  BarChart3,
  Users,
  ClipboardList,
  Home,
} from "lucide-react";
import type { ReactNode } from "react";
import { logoutAction } from "@/app/actions/auth";
import { NotificationListener } from "@/components/NotificationListener";

type DashboardLayoutProps = {
  children: ReactNode;
  role: "barber" | "admin" | "client";
  name?: string;
};

export function DashboardLayout({ children, role, name }: DashboardLayoutProps) {
  const pathname = usePathname();

  const adminLinks = [
    { to: "/admin", icon: LayoutDashboard, label: "Сводка" },
    { to: "/admin/appointments", icon: Calendar, label: "Записи" },
    { to: "/admin/services", icon: Scissors, label: "Услуги" },
    { to: "/admin/masters", icon: Users, label: "Мастера" },
    { to: "/admin/photos", icon: Camera, label: "Фото" },
    { to: "/admin/reviews", icon: Star, label: "Отзывы" },
    { to: "/admin/stats", icon: BarChart3, label: "Статистика" },
    { to: "/admin/inbox", icon: Bell, label: "Уведомления" },
    { to: "/admin/chat", icon: MessageCircle, label: "Чат" },
  ];

  const barberLinks = [
    { to: "/barber", icon: Calendar, label: "Расписание" },
    { to: "/barber/walk-in", icon: ClipboardList, label: "Запись гостя" },
    { to: "/barber/templates", icon: Calendar, label: "Шаблоны" },
    { to: "/barber/stats", icon: BarChart3, label: "Статистика" },
    { to: "/barber/reviews", icon: Star, label: "Отзывы" },
    { to: "/barber/inbox", icon: Bell, label: "Уведомления" },
    { to: "/barber/chat", icon: MessageCircle, label: "Чат" },
  ];

  const clientLinks = [
    { to: "/", icon: Home, label: "Салоны" },
    { to: "/account", icon: Calendar, label: "Мои записи" },
    { to: "/account/reviews", icon: Star, label: "Отзывы" },
    { to: "/account/favorites", icon: Heart, label: "Избранное" },
    { to: "/account/inbox", icon: Bell, label: "Уведомления" },
    { to: "/account/chat", icon: MessageCircle, label: "Чат" },
    { to: "/account/settings", icon: Settings, label: "Настройки" },
  ];

  const links = role === "admin" ? adminLinks : role === "barber" ? barberLinks : clientLinks;
  const home = role === "admin" ? "/admin" : role === "barber" ? "/barber" : "/";

  return (
    <div className="min-h-screen bg-background text-onBackground font-sans flex">
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
          <p className="text-xs font-semibold text-onSurfaceVariant uppercase tracking-wider mb-4 px-2">
            {role === "admin" ? "Панель салона" : role === "barber" ? "Кабинет мастера" : "Личный кабинет"}
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
        <header className="h-20 bg-surface border-b border-outline flex items-center px-4 sm:px-8 justify-between">
          <div className="md:hidden flex items-center gap-2">
            <Link href={home} className="flex items-center gap-2">
              <Scissors className="h-6 w-6 text-primary" />
              <span className="font-serif font-bold">SALONHUB</span>
            </Link>
          </div>
          <nav className="md:hidden flex gap-2 overflow-x-auto text-sm">
            {links.slice(0, 4).map((link) => (
              <Link key={link.to} href={link.to} className="whitespace-nowrap text-onSurfaceVariant">
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-onBackground">
                {name ?? (role === "admin" ? "Администратор" : role === "barber" ? "Мастер" : "Клиент")}
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
