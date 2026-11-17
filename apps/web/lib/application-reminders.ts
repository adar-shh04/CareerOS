import { useEffect, useState } from "react";

import type { TrackedApplication } from "@/lib/api";

/**
 * Follow-up and deadline dates are calendar days. The API stores them as UTC
 * midnight of the chosen day, so the day is read back from the UTC date part
 * of the stored value and compared with the viewer's LOCAL calendar day.
 * Nothing shifts with the viewer's timezone.
 */
export const DUE_SOON_DAYS = 3;

export type ReminderKind = "followUp" | "deadline";
export type ReminderUrgency = "overdue" | "today" | "soon";

export interface Reminder {
  kind: ReminderKind;
  urgency: ReminderUrgency;
  /** Negative = overdue by N days, 0 = today, positive = in N days. */
  daysFromToday: number;
  /** YYYY-MM-DD */
  date: string;
}

const MS_PER_DAY = 86_400_000;

/** Local calendar day as YYYY-MM-DD. */
export function localDayKey(now: Date = new Date()): string {
  const y = String(now.getFullYear());
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** The stored calendar day (UTC date part) as YYYY-MM-DD, or "" when unset. */
export function storedDayKey(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

export function daysBetween(fromKey: string, toKey: string): number {
  return Math.round(
    (Date.parse(`${toKey}T00:00:00Z`) - Date.parse(`${fromKey}T00:00:00Z`)) /
      MS_PER_DAY,
  );
}

function classify(
  kind: ReminderKind,
  value: string | null | undefined,
  today: string,
): Reminder | null {
  const date = storedDayKey(value);
  if (!date) return null;
  const daysFromToday = daysBetween(today, date);
  if (daysFromToday > DUE_SOON_DAYS) return null;
  const urgency: ReminderUrgency =
    daysFromToday < 0 ? "overdue" : daysFromToday === 0 ? "today" : "soon";
  return { kind, urgency, daysFromToday, date };
}

/**
 * Reminders that need attention. Finished applications (rejected / withdrawn)
 * never nag; a deadline only matters while the job is still just saved.
 */
export function getReminders(
  app: Pick<TrackedApplication, "status" | "followUpAt" | "deadlineAt">,
  today: string,
): Reminder[] {
  if (app.status === "rejected" || app.status === "withdrawn") return [];
  const out: Reminder[] = [];
  const followUp = classify("followUp", app.followUpAt, today);
  if (followUp) out.push(followUp);
  if (app.status === "saved") {
    const deadline = classify("deadline", app.deadlineAt, today);
    if (deadline) out.push(deadline);
  }
  return out;
}

export function reminderLabel(reminder: Reminder): string {
  const noun = reminder.kind === "followUp" ? "Follow-up" : "Deadline";
  const n = Math.abs(reminder.daysFromToday);
  const unit = n === 1 ? "day" : "days";
  if (reminder.urgency === "overdue") {
    return `${noun} overdue by ${String(n)} ${unit}`;
  }
  if (reminder.urgency === "today") return `${noun} due today`;
  return `${noun} in ${String(n)} ${unit}`;
}

export function reminderBadgeClass(urgency: ReminderUrgency): string {
  return urgency === "overdue"
    ? "bg-rose-50 text-rose-700 border-rose-200"
    : urgency === "today"
      ? "bg-amber-50 text-amber-800 border-amber-300"
      : "bg-amber-50 text-amber-700 border-amber-200";
}

/** Today's local day key; null until mounted so SSR and hydration agree. */
export function useToday(): string | null {
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => {
    setToday(localDayKey());
  }, []);
  return today;
}
