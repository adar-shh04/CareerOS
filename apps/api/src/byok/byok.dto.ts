import { IsIn, IsString, MinLength } from 'class-validator';

export const BYOK_PROVIDERS = [
  'openai',
  'anthropic',
  'google',
  'mistral',
] as const;
export type ByokProvider = (typeof BYOK_PROVIDERS)[number];

export class StoreByokCredentialDto {
  @IsIn(BYOK_PROVIDERS)
  provider!: ByokProvider;

  @IsString()
  @MinLength(8)
  apiKey!: string;
}
