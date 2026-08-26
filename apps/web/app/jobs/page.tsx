import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { JobBoard } from "@/components/jobs/job-board";

export default function JobsPage() {
  return (
    <DashboardShell>
      <JobBoard />
    </DashboardShell>
  );
}
