import { RegisterForm } from "@/components/auth/RegisterForm";
import { AuthScreen } from "@/components/auth/AuthScreen";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const params = await searchParams;
  return (
    <AuthScreen title="Регистрация">
      <RegisterForm from={params.from} />
    </AuthScreen>
  );
}
