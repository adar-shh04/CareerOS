import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';

import { WorkspaceMemberGuard } from '../common/guards/workspace-member.guard';
import { ResumeParserService } from './resume-parser.service';
import {
  ResumeProfileService,
  ResumeProfileValidationError,
} from './resume-profile.service';
import type {
  CreateResumeVersionInput,
  ResumeProfile,
  ResumeProfileInput,
  ResumeVersion,
} from './resume-profile.types';

@Controller('workspaces/:workspaceId/resume-profiles')
@UseGuards(WorkspaceMemberGuard)
export class ResumeProfileController {
  constructor(
    private readonly resumeProfileService: ResumeProfileService,
    private readonly resumeParserService: ResumeParserService,
  ) {}

  @Post('parse')
  async parseResume(
    @Param('workspaceId') workspaceId: string,
    @Body() body: { resumeText: string },
  ) {
    if (!body.resumeText) {
      throw new BadRequestException('resumeText is required.');
    }
    return this.resumeParserService.parse(workspaceId, body.resumeText);
  }

  @Get()
  async listProfiles(
    @Param('workspaceId') workspaceId: string,
  ): Promise<ResumeProfile[]> {
    try {
      return await this.resumeProfileService.listByWorkspace(workspaceId);
    } catch (error) {
      this.rethrowValidationError(error);
    }
  }

  @Post()
  async createProfile(
    @Param('workspaceId') workspaceId: string,
    @Body() input: ResumeProfileInput,
  ): Promise<ResumeProfile> {
    try {
      return await this.resumeProfileService.create(workspaceId, input);
    } catch (error) {
      this.rethrowValidationError(error);
    }
  }

  @Get(':profileId')
  async getProfile(
    @Param('workspaceId') workspaceId: string,
    @Param('profileId') profileId: string,
  ): Promise<ResumeProfile> {
    try {
      const profile = await this.resumeProfileService.findById(
        workspaceId,
        profileId,
      );

      if (!profile) {
        throw new NotFoundException('Resume profile not found.');
      }

      return profile;
    } catch (error) {
      this.rethrowValidationError(error);
    }
  }

  @Put(':profileId')
  async updateProfile(
    @Param('workspaceId') workspaceId: string,
    @Param('profileId') profileId: string,
    @Body() input: ResumeProfileInput,
  ): Promise<ResumeProfile> {
    try {
      return await this.resumeProfileService.update(
        workspaceId,
        profileId,
        input,
      );
    } catch (error) {
      this.rethrowValidationError(error);
    }
  }

  @Delete(':profileId')
  async deleteProfile(
    @Param('workspaceId') workspaceId: string,
    @Param('profileId') profileId: string,
  ): Promise<{ deleted: true }> {
    try {
      await this.resumeProfileService.delete(workspaceId, profileId);

      return { deleted: true };
    } catch (error) {
      this.rethrowValidationError(error);
    }
  }

  @Get(':profileId/versions')
  async listVersions(
    @Param('workspaceId') workspaceId: string,
    @Param('profileId') profileId: string,
  ): Promise<ResumeVersion[]> {
    try {
      return await this.resumeProfileService.listVersions(
        workspaceId,
        profileId,
      );
    } catch (error) {
      this.rethrowValidationError(error);
    }
  }

  @Post(':profileId/versions')
  async createVersion(
    @Param('workspaceId') workspaceId: string,
    @Param('profileId') profileId: string,
    @Body() input: CreateResumeVersionInput,
  ): Promise<ResumeVersion> {
    try {
      return await this.resumeProfileService.createVersion(
        workspaceId,
        profileId,
        input,
      );
    } catch (error) {
      this.rethrowValidationError(error);
    }
  }

  @Get(':profileId/versions/:versionId')
  async getVersion(
    @Param('workspaceId') workspaceId: string,
    @Param('profileId') profileId: string,
    @Param('versionId') versionId: string,
  ): Promise<ResumeVersion> {
    try {
      const version = await this.resumeProfileService.findVersionById(
        workspaceId,
        profileId,
        versionId,
      );

      if (!version) {
        throw new NotFoundException('Resume version not found.');
      }

      return version;
    } catch (error) {
      this.rethrowValidationError(error);
    }
  }

  private rethrowValidationError(error: unknown): never {
    if (error instanceof ResumeProfileValidationError) {
      throw new BadRequestException(error.message);
    }

    throw error;
  }
}
