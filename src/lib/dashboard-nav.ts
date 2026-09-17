import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bell,
  Calendar,
  Camera,
  ClipboardList,
  Heart,
  Home,
  Images,
  LayoutDashboard,
  Percent,
  Scissors,
  Settings,
  Star,
  User,
  Users,
} from "lucide-react";

export type DashboardRole = "admin" | "barber" | "client";

export type DashboardLink = {
  to: string;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
};

export function dashboardLinks(role: DashboardRole): DashboardLink[] {
  if (role === "admin") {
    return [
      { to: "/admin", label: "Сводка", icon: LayoutDashboard },
      { to: "/admin/appointments", label: "Записи", icon: Calendar },
      { to: "/admin/services", label: "Услуги", icon: Scissors },
      { to: "/admin/masters", label: "Мастера", icon: Users },
      { to: "/admin/photos", label: "Фото", icon: Camera },
      { to: "/admin/promotions", label: "Акции", icon: Percent },
      { to: "/admin/reviews", label: "Отзывы", icon: Star },
      { to: "/admin/stats", label: "Статистика", icon: BarChart3 },
      { to: "/admin/inbox", label: "Уведомления", icon: Bell },
    ];
  }
  if (role === "barber") {
    return [
      { to: "/barber", label: "Расписание", icon: Calendar },
      { to: "/barber/walk-in", label: "Запись гостя", shortLabel: "Гость", icon: ClipboardList },
      { to: "/barber/templates", label: "Шаблоны", icon: Calendar },
      { to: "/barber/portfolio", label: "Портфолио", icon: Images },
      { to: "/barber/profile", label: "Профиль", icon: User },
      { to: "/barber/stats", label: "Статистика", icon: BarChart3 },
      { to: "/barber/reviews", label: "Отзывы", icon: Star },
      { to: "/barber/inbox", label: "Уведомления", icon: Bell },
    ];
  }
  return [
    { to: "/", label: "Салоны", icon: Home },
    { to: "/account", label: "Записи", icon: Calendar },
    { to: "/account/reviews", label: "Отзывы", icon: Star },
    { to: "/account/favorites", label: "Избранное", icon: Heart },
    { to: "/account/inbox", label: "Уведомления", icon: Bell },
    { to: "/account/settings", label: "Настройки", icon: Settings },
  ];
}

export function dashboardHome(role: DashboardRole) {
  if (role === "admin") return "/admin";
  if (role === "barber") return "/barber";
  return "/";
}

export function dashboardPrimaryLinks(role: DashboardRole): DashboardLink[] {
  const links = dashboardLinks(role);
  const ids =
    role === "admin"
      ? ["/admin", "/admin/appointments", "/admin/stats", "/admin/masters"]
      : role === "barber"
        ? ["/barber", "/barber/walk-in", "/barber/stats", "/barber/profile"]
        : ["/", "/account", "/account/inbox", "/account/settings"];
  return ids.map((to) => links.find((link) => link.to === to)).filter((link): link is DashboardLink => Boolean(link));
}

export function isDashboardLinkActive(pathname: string, to: string, home: string) {
  if (to === home) return pathname === to;
  return pathname === to || pathname.startsWith(`${to}/`);
}
