import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

const MAX_IDS = 500;

class SelectedRecordIdsDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_IDS)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  experienceIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_IDS)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  projectIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_IDS)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  skillIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_IDS)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  certificationIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_IDS)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  achievementIds?: string[];
}

/**
 * Body of POST .../versions/:versionId/revisions. Unknown fields are rejected
 * by the global ValidationPipe (whitelist + forbidNonWhitelisted); whether the
 * ids exist is checked by the service against the base version's snapshot.
 */
export class CreateVersionRevisionDto {
  @ValidateNested()
  @Type(() => SelectedRecordIdsDto)
  selectedRecordIds!: SelectedRecordIdsDto;

  @IsOptional()
  @IsIn(['auto', 'generate'])
  documentMode?: 'auto' | 'generate';
}
