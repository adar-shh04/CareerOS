import { IsArray, IsOptional, IsString, MinLength } from 'class-validator';

export class CompleteOnboardingDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  workspaceName!: string;

  @IsOptional()
  @IsString()
  targetRole?: string;

  @IsOptional()
  @IsString()
  field?: string;

  @IsOptional()
  @IsString()
  careerDirection?: string;

  @IsOptional()
  @IsString()
  experienceLevel?: string;

  @IsOptional()
  @IsString()
  locationPreference?: string;

  @IsOptional()
  @IsString()
  workArrangement?: string;

  @IsOptional()
  @IsArray()
  skills?: string[];

  @IsOptional()
  jobSearchPreferences?: Record<string, unknown>;
}
