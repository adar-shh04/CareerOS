"use client";

import { AlarmClock, CalendarClock } from "lucide-react";
import React from "react";

import type { TrackedApplication } from "@/lib/api";
import {
  getReminders,
  reminderBadgeClass,
  reminderLabel,
  useToday,
} from "@/lib/application-reminders";

/** Overdue / due-soon follow-up and deadline badges for one application. */
export function ReminderBadges({
  app,
}: {
  app: Pick<TrackedApplication, "status" | "followUpAt" | "deadlineAt">;
}) {
  const today = useToday();
  if (!today) return null;
  const reminders = getReminders(app, today);
  if (reminders.length === 0) return null;

  return (
    <>
      {reminders.map((r) => {
        const Icon = r.kind === "followUp" ? AlarmClock : CalendarClock;
        return (
          <span
            key={r.kind}
            className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${reminderBadgeClass(r.urgency)}`}
          >
            <Icon className="w-3 h-3" />
            {reminderLabel(r)}
          </span>
        );
      })}
    </>
  );
}
