import { BadRequestException } from '@nestjs/common';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';

import type { ByokService } from '../byok/byok.service';
import { ResumeParserService } from './resume-parser.service';

jest.mock('pdf-parse', () => jest.fn());
jest.mock('mammoth', () => ({
  extractRawText: jest.fn(),
}));

describe('ResumeParserService', () => {
  let service: ResumeParserService;
  let mockByokService: {
    getDecryptedKey: jest.Mock;
  };

  const workspaceId = 'ws-test-123';

  beforeEach(() => {
    jest.clearAllMocks();
    mockByokService = {
      getDecryptedKey: jest.fn().mockRejectedValue(new Error('No key')),
    };
    service = new ResumeParserService(
      mockByokService as unknown as ByokService,
    );
  });

  describe('extractTextFromFile', () => {
    it('extracts text from plain text buffer (.txt)', async () => {
      const buffer = Buffer.from(
        'John Doe\njohn@example.com\nSkills: TypeScript, React',
      );
      const text = await service.extractTextFromFile(
        buffer,
        'text/plain',
        'resume.txt',
      );
      expect(text).toContain('John Doe');
      expect(text).toContain('TypeScript');
    });

    it('extracts text from Markdown buffer (.md)', async () => {
      const buffer = Buffer.from(
        '# Jane Smith\n\n## Experience\n- Software Engineer at Acme',
      );
      const text = await service.extractTextFromFile(
        buffer,
        'text/markdown',
        'resume.md',
      );
      expect(text).toContain('Jane Smith');
      expect(text).toContain('Software Engineer');
    });

    it('extracts text from JSON buffer (.json)', async () => {
      const jsonContent = JSON.stringify({
        identity: { fullName: 'Alex Rivera' },
        skills: [{ name: 'NestJS' }],
      });
      const buffer = Buffer.from(jsonContent);
      const text = await service.extractTextFromFile(
        buffer,
        'application/json',
        'resume.json',
      );
      expect(text).toContain('Alex Rivera');
    });

    it('extracts text from PDF buffer (.pdf) via pdf-parse', async () => {
      const mockPdfText = 'Alice Wong\nSenior Developer\nSkills: Python, Go';
      (pdfParse as unknown as jest.Mock).mockResolvedValue({
        text: mockPdfText,
      });

      const buffer = Buffer.from('%PDF-1.4 mock pdf content');
      const text = await service.extractTextFromFile(
        buffer,
        'application/pdf',
        'resume.pdf',
      );
      expect(pdfParse).toHaveBeenCalledWith(buffer);
      expect(text).toBe(mockPdfText);
    });

    it('extracts text from DOCX buffer (.docx) via mammoth', async () => {
      const mockDocxText =
        'Bob Taylor\nTech Lead\nExperience: Lead Architect at Globex';
      (mammoth.extractRawText as unknown as jest.Mock).mockResolvedValue({
        value: mockDocxText,
      });

      const buffer = Buffer.from('PK mock docx zip binary');
      const text = await service.extractTextFromFile(
        buffer,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'resume.docx',
      );
      expect(mammoth.extractRawText).toHaveBeenCalledWith({ buffer });
      expect(text).toBe(mockDocxText);
    });

    it('rejects files larger than 10MB', async () => {
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024);
      await expect(
        service.extractTextFromFile(largeBuffer, 'text/plain', 'large.txt'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects unsupported binary files', async () => {
      const binaryBuffer = Buffer.from([0x00, 0x01, 0x02, 0x03, 0xff, 0xfe]);
      await expect(
        service.extractTextFromFile(
          binaryBuffer,
          'application/octet-stream',
          'unknown.bin',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('parseFile', () => {
    it('parses structured JSON resume directly', async () => {
      const profileJson = JSON.stringify({
        identity: {
          fullName: 'David Miller',
          headline: 'Full Stack Engineer',
          email: 'david@example.com',
        },
        skills: [{ name: 'TypeScript' }, { name: 'Node.js' }],
        experiences: [
          {
            company: 'TechCorp',
            title: 'Staff Engineer',
            bullets: ['Built scalable microservices'],
          },
        ],
      });

      const buffer = Buffer.from(profileJson);
      const result = await service.parseFile(
        workspaceId,
        buffer,
        'application/json',
        'resume.json',
      );

      expect(result.identity.fullName).toBe('David Miller');
      expect(result.identity.email).toBe('david@example.com');
      expect(result.skills).toBeDefined();
      expect(result.skills?.[0]?.name).toBe('TypeScript');
      expect(result.experiences).toHaveLength(1);
    });

    it('parses plain text resume through heuristic pipeline when BYOK is absent', async () => {
      const rawResume = `John Doe
johndoe@example.com

SKILLS
TypeScript, React, PostgreSQL

EXPERIENCE
Senior Engineer at Acme Corp
- Led frontend redesign
`;
      const buffer = Buffer.from(rawResume);
      const result = await service.parseFile(
        workspaceId,
        buffer,
        'text/plain',
        'resume.txt',
      );

      expect(result.identity.fullName).toBe('John Doe');
      expect(result.identity.email).toBe('johndoe@example.com');
      expect(result.skills).toBeDefined();
      expect(result.skills?.length).toBeGreaterThan(0);
    });
  });
});
