import { Transform } from 'class-transformer';
import { IsString, IsUrl, MaxLength } from 'class-validator';

/** Body of POST /workspaces/:workspaceId/jobs/import-url. */
export class ImportJobUrlDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { message: 'url must be a valid http or https URL.' },
  )
  @MaxLength(2000)
  url!: string;
}
