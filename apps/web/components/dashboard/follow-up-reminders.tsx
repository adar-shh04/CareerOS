"use client";

import { AlarmClock, CalendarClock, ChevronRight } from "lucide-react";
import Link from "next/link";
import React, { useMemo } from "react";

import type { TrackedApplication } from "@/lib/api";
import {
  getReminders,
  reminderBadgeClass,
  reminderLabel,
  useToday,
} from "@/lib/application-reminders";

/** Due-soon deadlines and overdue follow-ups. Renders nothing when clear. */
export function FollowUpReminders({
  applications,
}: {
  applications: TrackedApplication[];
}) {
  const today = useToday();

  const items = useMemo(() => {
    if (!today) return [];
    return applications
      .flatMap((app) =>
        getReminders(app, today).map((reminder) => ({ app, reminder })),
      )
      .sort((a, b) => a.reminder.daysFromToday - b.reminder.daysFromToday);
  }, [applications, today]);

  if (items.length === 0) return null;

  return (
    <section
      aria-label="Follow-up reminders"
      className="rounded-xl border border-amber-200/80 bg-white p-5 shadow-xs"
    >
      <h3 className="mb-3 text-sm font-semibold text-slate-900">
        Needs your attention
      </h3>
      <ul className="flex flex-col gap-2">
        {items.slice(0, 6).map(({ app, reminder }) => {
          const Icon = reminder.kind === "followUp" ? AlarmClock : CalendarClock;
          return (
            <li key={`${app.id}-${reminder.kind}`}>
              <Link
                href={`/applications/${app.id}`}
                className="flex items-center gap-3 rounded-lg border border-slate-200/70 p-2.5 transition-colors hover:bg-slate-50"
              >
                <span
                  className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${reminderBadgeClass(reminder.urgency)}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-slate-900">
                    {app.job?.title ?? "Tracked opportunity"}
                    {app.job?.company ? ` · ${app.job.company}` : ""}
                  </span>
                  <span className="block text-[11px] text-slate-500">
                    {reminderLabel(reminder)}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </Link>
            </li>
          );
        })}
      </ul>
      {items.length > 6 && (
        <Link
          href="/applications"
          className="mt-2 inline-block text-xs font-medium text-[#1d68ed] hover:underline"
        >
          View all {String(items.length)} reminders
        </Link>
      )}
    </section>
  );
}
