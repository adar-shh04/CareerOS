"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  AuthButton,
  AuthField,
  AuthLink,
  AuthShell,
} from "../../components/auth/auth-shell";
import { signUp } from "../../lib/auth-client";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: signUpError } = await signUp.email({
        name,
        email,
        password,
      });

      if (signUpError) {
        throw new Error(signUpError.message ?? "Unable to create account.");
      }

      // The workspace (organization) is created automatically via the
      // databaseHooks.user.create.after hook on the API — see
      // apps/api/src/auth/better-auth.instance.ts.
      router.push("/onboarding");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to create account.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Start your career OS"
      subtitle="Create a secure workspace for AI-powered career intelligence."
      footer={
        <>
          Already have an account? <AuthLink href="/login">Sign in</AuthLink>
        </>
      }
    >
      <form
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
      >
        <AuthField
          label="Full name"
          id="name"
          value={name}
          autoComplete="name"
          placeholder="Alex Rivera"
          onChange={setName}
        />
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
          autoComplete="new-password"
          placeholder="Minimum 8 characters"
          onChange={setPassword}
        />

        {error ? <p style={errorStyle}>{error}</p> : null}

        <AuthButton loading={loading}>Create account</AuthButton>
      </form>
    </AuthShell>
  );
}

const errorStyle = {
  color: "#f87171",
  fontSize: "0.875rem",
  marginBottom: "0.75rem",
};
