import { RegisterForm } from "@/components/auth/RegisterForm";
import { AuthScreen } from "@/components/auth/AuthScreen";

export default function RegisterPage() {
  return (
    <AuthScreen title="Регистрация">
      <RegisterForm />
    </AuthScreen>
  );
}
