/**
 * Onboarding completion is persisted on the workspace (organization) metadata
 * as `completedAt` by POST /workspaces/onboarding/complete. It is the only
 * signal for "has this workspace finished onboarding" — not the user's name.
 *
 * Accepts metadata as stored (JSON string) or as returned by Better Auth
 * (parsed object).
 */
export function isOnboardingComplete(metadata: unknown): boolean {
  let value: unknown = metadata;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return false;
    }
  }
  if (typeof value !== "object" || value === null) return false;
  const completedAt = (value as { completedAt?: unknown }).completedAt;
  return typeof completedAt === "string" && !Number.isNaN(Date.parse(completedAt));
}
