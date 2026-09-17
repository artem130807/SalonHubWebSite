import Link from "next/link";
import type { ReactNode } from "react";
import { Scissors } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export function AuthScreen({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-dvh flex items-center justify-center p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] relative">
      <ThemeToggle className="absolute top-4 right-4" />
      <div className="w-full max-w-md bg-card border border-outline rounded-2xl p-5 sm:p-8 shadow-sm">
        <Link href="/" className="flex items-center justify-center gap-2 mb-6">
          <Scissors className="h-6 w-6 text-primary" />
          <span className="text-xl font-serif font-bold">SALONHUB</span>
        </Link>
        <h1 className="text-2xl font-serif font-bold mb-6 text-center">{title}</h1>
        {children}
      </div>
    </div>
  );
}
