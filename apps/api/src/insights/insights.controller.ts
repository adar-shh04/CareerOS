import { Controller, Get, Param, UseGuards } from '@nestjs/common';

import { WorkspaceMemberGuard } from '../common/guards/workspace-member.guard';
import { InsightsService } from './insights.service';

@Controller('workspaces/:workspaceId/insights')
@UseGuards(WorkspaceMemberGuard)
export class InsightsController {
  constructor(private readonly insightsService: InsightsService) {}

  /**
   * GET /workspaces/:workspaceId/insights/market
   * Section 1 — AI Market Intelligence.
   * Capability-dependent: Requires ingested job data AND configured AI capability.
   * Returns honest capability-unavailable status if either is missing. Does NOT fabricate numbers.
   */
  @Get('market')
  async getMarketIntelligence(@Param('workspaceId') workspaceId: string) {
    return this.insightsService.getMarketIntelligence(workspaceId);
  }

  /**
   * GET /workspaces/:workspaceId/insights/handbook
   * Section 2 — Career Handbook.
   * Educational reference material for career paths (Software Engineering, Analytics, PM, Design, Research, Healthcare, Finance).
   * Operates independently of AI, BYOK, or job ingestion.
   */
  @Get('handbook')
  getCareerHandbook() {
    return this.insightsService.getCareerHandbook();
  }
}
