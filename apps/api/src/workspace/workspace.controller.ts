import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';

import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { WorkspaceMemberGuard } from '../common/guards/workspace-member.guard';
import { CompleteOnboardingDto } from './workspace.dto';
import { WorkspaceService } from './workspace.service';

@Controller('workspaces')
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Post('onboarding/complete')
  completeOnboarding(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CompleteOnboardingDto,
  ) {
    return this.workspaceService.completeOnboarding(
      user.id,
      user.workspaceId,
      dto,
    );
  }

  @Get(':workspaceId')
  @UseGuards(WorkspaceMemberGuard)
  getWorkspace(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workspaceService.getWorkspace(workspaceId, user.id);
  }
}
