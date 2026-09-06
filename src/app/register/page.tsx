import Link from "next/link";
import { Scissors } from "lucide-react";
import { RegisterForm } from "@/components/auth/RegisterForm";

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-outline rounded-2xl p-8">
        <Link href="/" className="flex items-center justify-center gap-2 mb-6">
          <Scissors className="h-6 w-6 text-primary" />
          <span className="text-xl font-serif font-bold">SALONHUB</span>
        </Link>
        <h1 className="text-2xl font-serif font-bold mb-6 text-center">Регистрация</h1>
        <RegisterForm />
      </div>
    </div>
  );
}
