import { IsOptional, IsString, MinLength } from 'class-validator';

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
}
