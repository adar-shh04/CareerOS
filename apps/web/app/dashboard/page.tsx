import { redirect } from "next/navigation";
import React from "react";

import { CareerDashboardView } from "../../components/dashboard/career-dashboard-view";
import { DashboardShell } from "../../components/dashboard/dashboard-shell";
import { getServerSession } from "../../lib/server-session";

export default async function DashboardPage() {
  const session = await getServerSession();

  // In production, enforce Better Auth session guard
  if (!session && process.env.NODE_ENV === "production") {
    redirect("/login");
  }

  const displayName = session?.user.name ?? "Adarsh";
  const profileName = session?.user.name ?? "Alex R.";

  return (
    <DashboardShell
      breadcrumb="Dashboard"
      userName={profileName}
      userRole="(Pro)"
    >
      <CareerDashboardView
        greeting={{
          name: displayName,
          timeOfDayGreeting: "Good morning",
          headlineSummary:
            "Your application to Vandelay is progressing well. Review 3 new matching roles and your profile health below.",
        }}
      />
    </DashboardShell>
  );
}
