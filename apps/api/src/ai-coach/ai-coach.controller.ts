import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { WorkspaceMemberGuard } from '../common/guards/workspace-member.guard';
import { AiCoachService } from './ai-coach.service';
import type {
  ApplySectionRecommendationRequest,
  SectionCoachingRequest,
} from './ai-coach.types';

@Controller('workspaces/:workspaceId/ai-coach')
@UseGuards(WorkspaceMemberGuard)
export class AiCoachController {
  constructor(private readonly aiCoachService: AiCoachService) {}

  /**
   * POST /workspaces/:workspaceId/ai-coach/analyze
   * Capability-aware role match analysis using AI Coach.
   */
  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  async analyzeRole(
    @Param('workspaceId') workspaceId: string,
    @Body()
    body?: { jobId?: string; targetRole?: string; resumeProfileId?: string },
  ) {
    return this.aiCoachService.analyzeRole(workspaceId, body ?? {});
  }

  /**
   * POST /workspaces/:workspaceId/ai-coach/section
   * Granular section-level coaching (summary, experience, projects, skills, education).
   */
  @Post('section')
  @HttpCode(HttpStatus.OK)
  async coachSection(
    @Param('workspaceId') workspaceId: string,
    @Body() body: SectionCoachingRequest,
  ) {
    return this.aiCoachService.coachSection(workspaceId, body);
  }

  /**
   * POST /workspaces/:workspaceId/ai-coach/apply-section
   * Applies accepted AI Coach section modifications ONLY to the target Resume Profile.
   * Leaves Master Career Profile evidence intact.
   */
  @Post('apply-section')
  @HttpCode(HttpStatus.OK)
  async applySection(
    @Param('workspaceId') workspaceId: string,
    @Body() body: ApplySectionRecommendationRequest,
  ) {
    return this.aiCoachService.applySectionRecommendation(workspaceId, body);
  }
}
