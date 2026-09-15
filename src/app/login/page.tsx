import { LoginForm } from "@/components/auth/LoginForm";
import { AuthScreen } from "@/components/auth/AuthScreen";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ verified?: string; from?: string }>;
}) {
  const params = await searchParams;
  return (
    <AuthScreen title="Вход">
      <LoginForm verified={params.verified === "1"} from={params.from} />
    </AuthScreen>
  );
}
