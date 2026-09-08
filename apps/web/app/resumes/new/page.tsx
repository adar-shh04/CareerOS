import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { CreateResumeProfileForm } from "@/components/resumes/create-resume-profile-form";
import { getServerSession } from "@/lib/server-session";

export default async function NewResumeProfilePage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  if (session.needsOnboarding) {
    redirect("/onboarding");
  }

  return (
    <DashboardShell>
      <CreateResumeProfileForm />
    </DashboardShell>
  );
}
