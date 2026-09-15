import { Suspense } from "react";
import { VerifyForm } from "@/components/auth/VerifyForm";
import { AuthScreen } from "@/components/auth/AuthScreen";

export default function VerifyPage() {
  return (
    <AuthScreen title="Подтверждение email">
      <Suspense>
        <VerifyForm />
      </Suspense>
    </AuthScreen>
  );
}
