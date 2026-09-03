import { Readable } from 'node:stream';

import { BadRequestException } from '@nestjs/common';

import type { ResumeParserService } from './resume-parser.service';
import { ResumeProfileController } from './resume-profile.controller';
import type { ResumeProfileService } from './resume-profile.service';

describe('ResumeProfileController', () => {
  let controller: ResumeProfileController;
  let mockResumeProfileService: {
    listByWorkspace: jest.Mock;
    create: jest.Mock;
    findById: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    listVersions: jest.Mock;
    createVersion: jest.Mock;
    findVersionById: jest.Mock;
  };
  let mockResumeParserService: {
    parse: jest.Mock;
    parseFile: jest.Mock;
  };

  const workspaceId = 'ws-test-123';

  beforeEach(() => {
    mockResumeProfileService = {
      listByWorkspace: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      listVersions: jest.fn(),
      createVersion: jest.fn(),
      findVersionById: jest.fn(),
    };

    mockResumeParserService = {
      parse: jest.fn(),
      parseFile: jest.fn(),
    };

    controller = new ResumeProfileController(
      mockResumeProfileService as unknown as ResumeProfileService,
      mockResumeParserService as unknown as ResumeParserService,
    );
  });

  describe('parseResume', () => {
    it('handles multipart uploaded file via Multer', async () => {
      const mockFile: Express.Multer.File = {
        buffer: Buffer.from('%PDF-1.4 dummy pdf'),
        originalname: 'my-resume.pdf',
        mimetype: 'application/pdf',
        fieldname: 'file',
        encoding: '7bit',
        size: 100,
        destination: '',
        filename: '',
        path: '',
        stream: new Readable(),
      };

      mockResumeParserService.parseFile.mockResolvedValue({
        identity: { fullName: 'Jane Doe' },
      });

      const result = await controller.parseResume(workspaceId, mockFile);

      expect(mockResumeParserService.parseFile).toHaveBeenCalledWith(
        workspaceId,
        mockFile.buffer,
        mockFile.mimetype,
        mockFile.originalname,
      );
      expect(result).toEqual({ identity: { fullName: 'Jane Doe' } });
    });

    it('handles pasted raw resume text in JSON body', async () => {
      mockResumeParserService.parse.mockResolvedValue({
        identity: { fullName: 'John Smith' },
      });

      const result = await controller.parseResume(workspaceId, undefined, {
        resumeText: 'John Smith\nSoftware Engineer',
      });

      expect(mockResumeParserService.parse).toHaveBeenCalledWith(
        workspaceId,
        'John Smith\nSoftware Engineer',
      );
      expect(result).toEqual({ identity: { fullName: 'John Smith' } });
    });

    it('handles base64 file payload as fallback', async () => {
      const base64Content = Buffer.from('mock txt content').toString('base64');
      mockResumeParserService.parseFile.mockResolvedValue({
        identity: { fullName: 'Bob Taylor' },
      });

      const result = await controller.parseResume(workspaceId, undefined, {
        fileBase64: base64Content,
        fileName: 'resume.txt',
        mimeType: 'text/plain',
      });

      expect(mockResumeParserService.parseFile).toHaveBeenCalledWith(
        workspaceId,
        expect.any(Buffer),
        'text/plain',
        'resume.txt',
      );
      expect(result).toEqual({ identity: { fullName: 'Bob Taylor' } });
    });

    it('throws BadRequestException when neither file nor text is provided', async () => {
      await expect(
        controller.parseResume(workspaceId, undefined, {}),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('CRUD operations', () => {
    it('lists profiles by workspace', async () => {
      mockResumeProfileService.listByWorkspace.mockResolvedValue([
        { id: 'rp-1', title: 'Default' },
      ]);

      const res = await controller.listProfiles(workspaceId);
      expect(mockResumeProfileService.listByWorkspace).toHaveBeenCalledWith(
        workspaceId,
      );
      expect(res).toHaveLength(1);
    });
  });
});
