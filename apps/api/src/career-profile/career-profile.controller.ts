import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';

import { WorkspaceMemberGuard } from '../common/guards/workspace-member.guard';
import {
  CareerProfileService,
  CareerProfileValidationError,
} from './career-profile.service';
import type {
  MasterCareerProfile,
  MasterCareerProfileInput,
} from './career-profile.types';

@Controller('workspaces/:workspaceId/career-profile')
@UseGuards(WorkspaceMemberGuard)
export class CareerProfileController {
  constructor(private readonly careerProfileService: CareerProfileService) {}

  @Get()
  async getProfile(
    @Param('workspaceId') workspaceId: string,
  ): Promise<MasterCareerProfile> {
    try {
      const profile =
        await this.careerProfileService.findByWorkspace(workspaceId);

      if (!profile) {
        throw new NotFoundException('Career profile not found.');
      }

      return profile;
    } catch (error) {
      this.rethrowValidationError(error);
    }
  }

  @Put()
  async saveProfile(
    @Param('workspaceId') workspaceId: string,
    @Body() input: MasterCareerProfileInput,
  ): Promise<MasterCareerProfile> {
    try {
      return await this.careerProfileService.save(workspaceId, input);
    } catch (error) {
      this.rethrowValidationError(error);
    }
  }

  private rethrowValidationError(error: unknown): never {
    if (error instanceof CareerProfileValidationError) {
      throw new BadRequestException(error.message);
    }

    throw error;
  }
}
