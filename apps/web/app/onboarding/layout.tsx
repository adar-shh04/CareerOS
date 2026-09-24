import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { getServerSession } from "@/lib/server-session";

/**
 * Onboarding is gated on the server from the persisted workspace onboarding
 * state: finished workspaces go to the dashboard; unfinished (new or
 * abandoned) ones stay here and resume onboarding.
 */
export default async function OnboardingLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerSession();

  if (!session) {
    redirect("/login?next=/onboarding");
  }

  if (!session.needsOnboarding) {
    redirect("/dashboard");
  }

  return children;
}
