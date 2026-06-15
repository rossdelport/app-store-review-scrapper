import { Suspense } from "react";
import LoginForm from "@/components/auth/LoginForm";

export const metadata = { title: "Sign in — Review Scout" };

export default function LoginPage() {
  return (
    <main className="min-h-screen px-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
