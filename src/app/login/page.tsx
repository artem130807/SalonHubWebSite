import Link from "next/link";
import { Scissors } from "lucide-react";
import { LoginForm } from "@/components/auth/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ verified?: string; from?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-outline rounded-2xl p-8">
        <Link href="/" className="flex items-center justify-center gap-2 mb-6">
          <Scissors className="h-6 w-6 text-primary" />
          <span className="text-xl font-serif font-bold">SALONHUB</span>
        </Link>
        <h1 className="text-2xl font-serif font-bold mb-6 text-center">Вход</h1>
        <LoginForm verified={params.verified === "1"} from={params.from} />
      </div>
    </div>
  );
}
