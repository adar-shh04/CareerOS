import type { WorkspaceJobStatus } from '@repo/types';

/**
 * Job Radar state invariant.
 *
 * - `isSaved` / `isDismissed` are independent user-controlled Job Radar flags
 *   (bookmark / hide).
 * - Whether the workspace applied, and every pipeline stage after that, is
 *   owned by the Application (ApplicationsService). Job state only mirrors it.
 * - `status` is never set directly; it is derived from the above so the stored
 *   value can never contradict the flags or the Application.
 * - `appliedAt` mirrors the applied-stage Application's appliedAt, else null.
 */
export function deriveJobStateStatus(input: {
  applied: boolean;
  isSaved: boolean;
  isDismissed: boolean;
}): WorkspaceJobStatus {
  if (input.applied) return 'applied';
  if (input.isDismissed) return 'dismissed';
  if (input.isSaved) return 'saved';
  return 'discovered';
}
