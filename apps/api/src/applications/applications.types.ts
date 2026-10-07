import type {
  ApplicationJobSummary as BaseApplicationJobSummary,
  ApplicationRecord as BaseApplicationRecord,
  ApplicationStatusHistoryRecord as BaseApplicationStatusHistoryRecord,
  CreateApplicationInput as BaseCreateApplicationInput,
  MarkAppliedInput as BaseMarkAppliedInput,
  UpdateApplicationInput as BaseUpdateApplicationInput,
} from '@repo/types';

export {
  APPLICATION_STATUSES,
  type ApplicationStats,
  type ApplicationStatus,
} from '@repo/types';

export type ApplicationJobSummary = BaseApplicationJobSummary<Date>;
export type ApplicationRecord = BaseApplicationRecord<Date>;
export type ApplicationStatusHistoryRecord =
  BaseApplicationStatusHistoryRecord<Date>;
export type CreateApplicationInput = BaseCreateApplicationInput<Date>;
export type UpdateApplicationInput = BaseUpdateApplicationInput<Date>;
export type MarkAppliedInput = BaseMarkAppliedInput<Date>;
