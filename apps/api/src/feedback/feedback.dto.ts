import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ContactDto {
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsEmail() email!: string;
  @IsString() @MinLength(2) @MaxLength(160) subject!: string;
  @IsString() @MinLength(10) @MaxLength(5000) message!: string;
  @IsOptional() @IsString() @MaxLength(100) website?: string;
}

export class FeedbackDto {
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsEmail() email!: string;
  @IsIn(['Feature Request', 'Bug', 'Improvement', 'General Feedback'])
  type!: string;
  @IsString() @MinLength(10) @MaxLength(5000) message!: string;
  @IsOptional() @IsString() @MaxLength(100) website?: string;
}
