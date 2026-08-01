"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useState } from "react";

import {
  AuthButton,
  AuthField,
  AuthLink,
  AuthShell,
} from "../../components/auth/auth-shell";
import { signIn } from "../../lib/auth-client";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: signInError } = await signIn.email({
        email,
        password,
      });

      if (signInError) {
        throw new Error(signInError.message ?? "Unable to sign in.");
      }

      const next = searchParams.get("next");
      const needsOnboarding = !data?.user?.name;

      if (needsOnboarding) {
        router.push("/onboarding");
      } else if (next) {
        router.push(next);
      } else {
        router.push("/dashboard");
      }
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to sign in.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your career intelligence command center."
      footer={
        <>
          New to CareerOS? <AuthLink href="/register">Create account</AuthLink>
        </>
      }
    >
      <form
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
      >
        <AuthField
          label="Email"
          id="email"
          type="email"
          value={email}
          autoComplete="email"
          placeholder="you@company.com"
          onChange={setEmail}
        />
        <AuthField
          label="Password"
          id="password"
          type="password"
          value={password}
          autoComplete="current-password"
          placeholder="••••••••"
          onChange={setPassword}
        />

        {error ? <p style={errorStyle}>{error}</p> : null}

        <AuthButton loading={loading}>Sign in</AuthButton>
      </form>
    </AuthShell>
  );
}

const errorStyle = {
  color: "#f87171",
  fontSize: "0.875rem",
  marginBottom: "0.75rem",
};
