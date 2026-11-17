import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export const MANUAL_JOB_MAX_DESCRIPTION = 50_000;

/** Body of POST /workspaces/:workspaceId/jobs — a job the user pasted in. */
export class CreateManualJobDto {
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title!: string;

  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  company!: string;

  @Transform(trim)
  @IsString()
  @MinLength(50, {
    message:
      'description must be at least 50 characters (paste the full job description).',
  })
  @MaxLength(MANUAL_JOB_MAX_DESCRIPTION)
  description!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  location?: string;

  @IsOptional()
  @IsBoolean()
  isRemote?: boolean;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  salaryRange?: string;

  /** http(s) only: the drawer renders this as a link target. */
  @IsOptional()
  @Transform(trim)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2000)
  sourceUrl?: string;
}

export const MANUAL_JOB_SOURCE = 'manual';
