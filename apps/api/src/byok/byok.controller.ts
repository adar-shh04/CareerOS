import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { WorkspaceMemberGuard } from '../common/guards/workspace-member.guard';
import { type ByokProvider, StoreByokCredentialDto } from './byok.dto';
import { ByokService } from './byok.service';

@Controller('workspaces/:workspaceId/byok')
@UseGuards(WorkspaceMemberGuard)
export class ByokController {
  constructor(private readonly byokService: ByokService) {}

  @Get()
  list(@Param('workspaceId') workspaceId: string) {
    return this.byokService.listForWorkspace(workspaceId);
  }

  @Post()
  store(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: StoreByokCredentialDto,
  ) {
    return this.byokService.storeCredential(
      workspaceId,
      dto.provider,
      dto.apiKey,
    );
  }

  @Delete(':provider')
  remove(
    @Param('workspaceId') workspaceId: string,
    @Param('provider') provider: ByokProvider,
  ) {
    return this.byokService.deleteCredential(workspaceId, provider);
  }
}
