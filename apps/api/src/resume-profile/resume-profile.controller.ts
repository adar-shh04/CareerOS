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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

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
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  )
  async parseResume(
    @Param('workspaceId') workspaceId: string,
    @UploadedFile() file?: Express.Multer.File,
    @Body()
    body?: {
      resumeText?: string;
      fileBase64?: string;
      fileName?: string;
      mimeType?: string;
    },
  ) {
    if (file) {
      return this.resumeParserService.parseFile(
        workspaceId,
        file.buffer,
        file.mimetype,
        file.originalname,
      );
    }

    if (body?.fileBase64) {
      const buffer = Buffer.from(body.fileBase64, 'base64');
      return this.resumeParserService.parseFile(
        workspaceId,
        buffer,
        body.mimeType,
        body.fileName,
      );
    }

    if (!body?.resumeText) {
      throw new BadRequestException(
        'Either a resume file or resumeText must be provided.',
      );
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
