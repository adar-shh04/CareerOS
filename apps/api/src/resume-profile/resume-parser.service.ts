import { randomUUID } from 'node:crypto';

import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';

import { ByokService } from '../byok/byok.service';
import type { MasterCareerProfileInput } from '../career-profile/career-profile.types';

@Injectable()
export class ResumeParserService {
  private readonly logger = new Logger(ResumeParserService.name);

  constructor(private readonly byokService: ByokService) {}

  /**
   * Parse raw resume text into a normalized MasterCareerProfileInput.
   * If a BYOK provider is configured for the workspace, it uses AI;
   * otherwise it falls back to the deterministic heuristic parser.
   */
  async parse(
    workspaceId: string,
    resumeText: string,
  ): Promise<MasterCareerProfileInput> {
    this.logger.log(`Parsing resume for workspace: ${workspaceId}`);

    // Check if user has configured OpenAI or Anthropic keys via BYOK
    let apiKey: string | null = null;
    let provider: 'openai' | 'anthropic' | null = null;

    try {
      apiKey = await this.byokService.getDecryptedKey(workspaceId, 'openai');
      provider = 'openai';
    } catch {
      try {
        apiKey = await this.byokService.getDecryptedKey(
          workspaceId,
          'anthropic',
        );
        provider = 'anthropic';
      } catch {
        // No key configured
      }
    }

    if (apiKey && provider) {
      try {
        this.logger.log(
          `Using BYOK provider '${provider}' for resume parsing.`,
        );
        if (provider === 'openai') {
          return await this.parseWithOpenAI(apiKey, resumeText);
        } else {
          return await this.parseWithAnthropic(apiKey, resumeText);
        }
      } catch (err) {
        this.logger.error(
          `AI resume parsing failed: ${err instanceof Error ? err.message : String(err)}. Falling back to heuristics.`,
        );
      }
    }

    this.logger.log('Using fallback heuristic resume parser.');
    return this.parseWithHeuristics(resumeText);
  }

  /**
   * Extract text from a file buffer (.pdf, .docx, .txt, .md, .json) and parse into MasterCareerProfileInput.
   */
  async parseFile(
    workspaceId: string,
    buffer: Buffer,
    mimeType?: string,
    fileName?: string,
  ): Promise<MasterCareerProfileInput> {
    const text = await this.extractTextFromFile(buffer, mimeType, fileName);

    // If JSON file, check if it's already a structured MasterCareerProfileInput
    if (
      fileName?.toLowerCase().endsWith('.json') ||
      mimeType?.includes('json')
    ) {
      try {
        const parsed = JSON.parse(text) as unknown;
        if (
          typeof parsed === 'object' &&
          parsed !== null &&
          ('identity' in parsed ||
            'skills' in parsed ||
            'experiences' in parsed)
        ) {
          return this.normalizeParsedJson(
            parsed as Partial<MasterCareerProfileInput>,
          );
        }
      } catch {
        // Fallback to regular text parsing
      }
    }

    return this.parse(workspaceId, text);
  }

  /**
   * Safe text extractor for PDF, DOCX, Markdown, Text, and JSON.
   */
  async extractTextFromFile(
    buffer: Buffer,
    mimeType?: string,
    fileName?: string,
  ): Promise<string> {
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (buffer.length > MAX_SIZE) {
      throw new BadRequestException('File size exceeds the 10MB limit.');
    }

    const lowerName = fileName?.toLowerCase() ?? '';
    const lowerMime = mimeType?.toLowerCase() ?? '';

    // PDF
    if (lowerName.endsWith('.pdf') || lowerMime === 'application/pdf') {
      try {
        const parseFn = (
          typeof pdfParse === 'function'
            ? pdfParse
            : (
                pdfParse as unknown as {
                  default: (b: Buffer) => Promise<{ text: string }>;
                }
              ).default
        ) as (b: Buffer) => Promise<{ text: string }>;
        const result = await parseFn(buffer);
        if (!result.text || result.text.trim().length === 0) {
          throw new BadRequestException(
            'Could not extract text from the PDF file.',
          );
        }
        return result.text;
      } catch (err) {
        if (err instanceof BadRequestException) throw err;
        throw new BadRequestException(
          `Failed to parse PDF document: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    // DOCX
    if (
      lowerName.endsWith('.docx') ||
      lowerMime ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      try {
        const result = await mammoth.extractRawText({ buffer });
        if (!result.value || result.value.trim().length === 0) {
          throw new BadRequestException(
            'Could not extract text from the DOCX file.',
          );
        }
        return result.value;
      } catch (err) {
        if (err instanceof BadRequestException) throw err;
        throw new BadRequestException(
          `Failed to parse DOCX document: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    // Plain text / Markdown / JSON
    if (
      lowerName.endsWith('.txt') ||
      lowerName.endsWith('.md') ||
      lowerName.endsWith('.json') ||
      lowerMime.includes('text') ||
      lowerMime.includes('json')
    ) {
      const text = buffer.toString('utf-8');
      if (!text.trim()) {
        throw new BadRequestException('File is empty.');
      }
      return text;
    }

    // Fallback: try UTF-8 decoding if not binary
    try {
      const text = buffer.toString('utf-8');
      if (
        text &&
        text.trim().length > 0 &&
        // eslint-disable-next-line no-control-regex
        !/[\x00-\x08\x0E-\x1F]/.test(text.slice(0, 100))
      ) {
        return text;
      }
    } catch {
      // ignore
    }

    throw new BadRequestException(
      'Unsupported file format. Please upload a PDF (.pdf), Word document (.docx), Text (.txt), Markdown (.md), or JSON (.json) file.',
    );
  }

  private normalizeParsedJson(
    input: Partial<MasterCareerProfileInput>,
  ): MasterCareerProfileInput {
    return {
      identity: {
        fullName: input.identity?.fullName ?? 'Candidate',
        headline: input.identity?.headline,
        email: input.identity?.email,
        location: input.identity?.location,
      },
      skills: (input.skills ?? []).map((s) => ({
        id: s.id || randomUUID(),
        name: s.name,
      })),
      experiences: (input.experiences ?? []).map((e) => ({
        id: e.id || randomUUID(),
        company: e.company,
        title: e.title,
        startDate: e.startDate,
        endDate: e.endDate,
        current: e.current ?? false,
        bullets: e.bullets ?? [],
      })),
      education: (input.education ?? []).map((ed) => ({
        id: ed.id || randomUUID(),
        institution: ed.institution,
        degree: ed.degree,
        fieldOfStudy: ed.fieldOfStudy,
        startDate: ed.startDate,
        endDate: ed.endDate,
      })),
      projects: (input.projects ?? []).map((p) => ({
        id: p.id || randomUUID(),
        name: p.name,
        description: p.description,
        url: p.url,
        bullets: p.bullets ?? [],
      })),
      certifications: (input.certifications ?? []).map((c) => ({
        id: c.id || randomUUID(),
        name: c.name,
        issuer: c.issuer,
        issueDate: c.issueDate,
      })),
    };
  }

  private async parseWithOpenAI(
    apiKey: string,
    text: string,
  ): Promise<MasterCareerProfileInput> {
    const prompt = this.getSystemPrompt();
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: `Parse this resume text:\n\n${text}` },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `OpenAI API responded with status ${String(response.status)}`,
      );
    }

    interface OpenAIResponse {
      choices: { message: { content: string } }[];
    }
    const data = (await response.json()) as OpenAIResponse;
    const jsonText = data.choices[0]?.message?.content;
    if (!jsonText) throw new Error('Empty response from OpenAI');

    return JSON.parse(jsonText) as MasterCareerProfileInput;
  }

  private async parseWithAnthropic(
    apiKey: string,
    text: string,
  ): Promise<MasterCareerProfileInput> {
    const prompt = this.getSystemPrompt();
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 4000,
        system:
          prompt +
          '\nReturn ONLY a raw, minified JSON object matching the requested schema. Do not wrap in markdown blocks.',
        messages: [
          { role: 'user', content: `Parse this resume text:\n\n${text}` },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Anthropic API responded with status ${String(response.status)}`,
      );
    }

    interface AnthropicResponse {
      content: { text: string }[];
    }
    const data = (await response.json()) as AnthropicResponse;
    const contentText = data.content[0]?.text;
    if (!contentText) throw new Error('Empty response from Anthropic');

    return JSON.parse(contentText) as MasterCareerProfileInput;
  }

  private getSystemPrompt(): string {
    return `You are an expert resume parser. Parse raw resume text and return a JSON object that strictly adheres to the following MasterCareerProfileInput TypeScript interface:

interface MasterCareerProfileInput {
  identity: {
    fullName: string;
    headline?: string;
    location?: string;
    email?: string;
  };
  education?: Array<{
    id: string; // generate a random UUID
    institution: string;
    degree?: string;
    fieldOfStudy?: string;
    startDate?: string;
    endDate?: string;
    highlights?: string[];
  }>;
  experiences?: Array<{
    id: string; // generate a random UUID
    company: string;
    title: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    current?: boolean;
    bullets?: string[];
    technologies?: string[];
  }>;
  projects?: Array<{
    id: string; // generate a random UUID
    name: string;
    description?: string;
    url?: string;
    repositoryUrl?: string;
    bullets?: string[];
    technologies?: string[];
  }>;
  skills?: Array<{
    id: string; // generate a random UUID
    name: string;
    category?: string;
    proficiency?: "foundational" | "working" | "advanced" | "expert";
  }>;
  certifications?: Array<{
    id: string; // generate a random UUID
    name: string;
    issuer?: string;
    issueDate?: string;
    expirationDate?: string;
    credentialUrl?: string;
  }>;
  links?: Array<{
    id: string; // generate a random UUID
    label: string;
    url: string;
  }>;
}

IMPORTANT:
1. For every element in education, experiences, projects, skills, certifications, links, you MUST generate and provide a valid random UUID for the "id" field.
2. Return ONLY valid JSON, no explanations.`;
  }

  private parseWithHeuristics(text: string): MasterCareerProfileInput {
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const result: MasterCareerProfileInput = {
      identity: {
        fullName: 'Extracted Candidate',
        headline: 'Software Professional',
      },
      education: [],
      experiences: [],
      projects: [],
      skills: [],
      certifications: [],
      links: [],
    };

    // Find basic contact details in the first few lines
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i];
      if (line.includes('@') && !result.identity.email) {
        const emailMatch =
          /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.exec(line);
        if (emailMatch) result.identity.email = emailMatch[0];
      }
      if (i === 0) {
        result.identity.fullName = line;
      } else if (i === 1 && !line.includes('@')) {
        result.identity.headline = line;
      }
    }

    let currentSection = '';
    for (const line of lines) {
      const upperLine = line.toUpperCase();
      if (
        upperLine.includes('EXPERIENCE') ||
        upperLine.includes('WORK HISTORY') ||
        upperLine.includes('EMPLOYMENT')
      ) {
        currentSection = 'experience';
        continue;
      }
      if (upperLine.includes('EDUCATION') || upperLine.includes('ACADEMIC')) {
        currentSection = 'education';
        continue;
      }
      if (upperLine.includes('PROJECT')) {
        currentSection = 'projects';
        continue;
      }
      if (upperLine.includes('SKILL') || upperLine.includes('TECHNOLOG')) {
        currentSection = 'skills';
        continue;
      }
      if (
        upperLine.includes('CERTIFICATION') ||
        upperLine.includes('CREDENTIAL')
      ) {
        currentSection = 'certifications';
        continue;
      }

      if (currentSection === 'skills') {
        const parts = line
          .split(/[,;|•]/)
          .map((s) => s.trim())
          .filter(Boolean);
        for (const part of parts) {
          if (part.length > 1 && part.length < 30) {
            result.skills ??= [];
            result.skills.push({
              id: randomUUID(),
              name: part,
            });
          }
        }
      } else if (currentSection === 'experience' && line.length > 5) {
        // Try to identify company and title
        if (
          line.includes(' at ') ||
          line.includes(' @ ') ||
          line.includes('|') ||
          line.includes('-')
        ) {
          const parts = line.split(/[|@-]| at /).map((s) => s.trim());
          if (parts[0] && parts[1]) {
            result.experiences ??= [];
            result.experiences.push({
              id: randomUUID(),
              company: parts[1],
              title: parts[0],
              bullets: [],
            });
          }
        } else if (
          ((result.experiences?.length ?? 0) > 0 && line.startsWith('•')) ||
          line.startsWith('-')
        ) {
          const exps = result.experiences;
          if (exps && exps.length > 0) {
            const last = exps[exps.length - 1];
            last.bullets ??= [];
            last.bullets.push(line.replace(/^[•-]\s*/, ''));
          }
        }
      } else if (currentSection === 'education' && line.length > 5) {
        if (
          line.includes('Degree') ||
          line.includes('BS') ||
          line.includes('MS') ||
          line.includes('University') ||
          line.includes('College')
        ) {
          result.education ??= [];
          result.education.push({
            id: randomUUID(),
            institution: line,
          });
        }
      } else if (currentSection === 'projects' && line.length > 5) {
        if (line.startsWith('•') || line.startsWith('-')) {
          const projs = result.projects;
          if (projs && projs.length > 0) {
            const last = projs[projs.length - 1];
            last.bullets ??= [];
            last.bullets.push(line.replace(/^[•-]\s*/, ''));
          }
        } else {
          result.projects ??= [];
          result.projects.push({
            id: randomUUID(),
            name: line,
            bullets: [],
          });
        }
      }
    }

    return result;
  }
}
