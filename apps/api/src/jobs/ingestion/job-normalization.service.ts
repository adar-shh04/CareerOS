import { Injectable } from '@nestjs/common';

import type { RawIngestedJob } from './job-source-adapter.interface';
import type { CreateJobInput } from '../jobs.types';

const KNOWN_TECH_DICTIONARY: Record<string, string> = {
  typescript: 'TypeScript',
  ts: 'TypeScript',
  javascript: 'JavaScript',
  js: 'JavaScript',
  react: 'React',
  'react.js': 'React',
  'reactjs': 'React',
  nextjs: 'Next.js',
  'next.js': 'Next.js',
  vue: 'Vue.js',
  'vue.js': 'Vue.js',
  angular: 'Angular',
  node: 'Node.js',
  'node.js': 'Node.js',
  nodejs: 'Node.js',
  express: 'Express',
  nestjs: 'NestJS',
  python: 'Python',
  django: 'Django',
  flask: 'Flask',
  fastapi: 'FastAPI',
  golang: 'Go',
  go: 'Go',
  rust: 'Rust',
  ruby: 'Ruby',
  rails: 'Ruby on Rails',
  java: 'Java',
  kotlin: 'Kotlin',
  swift: 'Swift',
  cpp: 'C++',
  'c++': 'C++',
  csharp: 'C#',
  'c#': 'C#',
  sql: 'SQL',
  postgresql: 'PostgreSQL',
  postgres: 'PostgreSQL',
  mysql: 'MySQL',
  mongodb: 'MongoDB',
  redis: 'Redis',
  graphql: 'GraphQL',
  rest: 'REST API',
  docker: 'Docker',
  kubernetes: 'Kubernetes',
  k8s: 'Kubernetes',
  aws: 'AWS',
  gcp: 'GCP',
  azure: 'Azure',
  terraform: 'Terraform',
  git: 'Git',
  ci: 'CI/CD',
  cd: 'CI/CD',
  'ci/cd': 'CI/CD',
  kafka: 'Kafka',
  elasticsearch: 'Elasticsearch',
  triton: 'Triton',
  llm: 'LLM',
  'vector databases': 'Vector Databases',
  webgl: 'WebGL',
  webassembly: 'WebAssembly',
  pwa: 'PWA',
  electron: 'Electron',
  tailwind: 'Tailwind CSS',
  'tailwind css': 'Tailwind CSS',
};

@Injectable()
export class JobNormalizationService {
  normalize(raw: RawIngestedJob): CreateJobInput {
    const title = this.normalizeTitle(raw.title);
    const company = this.normalizeCompany(raw.company);
    const location = this.normalizeLocation(raw.location);
    const description = raw.description?.trim() || '';

    const { isRemote, remotePolicy } = this.determineRemotePolicy(
      raw.isRemote,
      raw.location,
      description,
    );

    const { requiredSkills, preferredSkills } = this.extractSkills(
      description,
      raw.rawSkills,
    );

    const { salaryMin, salaryMax, salaryCurrency, salaryRange } =
      this.parseSalary(raw.salaryText, description);

    const postedAt = this.parsePostedDate(raw.postedAtText);

    return {
      externalId: raw.externalId,
      source: raw.source,
      sourceUrl: raw.sourceUrl,
      company,
      title,
      location,
      isRemote,
      remotePolicy,
      salaryMin,
      salaryMax,
      salaryCurrency,
      salaryRange,
      description,
      requiredSkills,
      preferredSkills,
      postedAt,
    };
  }

  private normalizeTitle(title: string): string {
    return title.trim().replace(/\s+/g, ' ');
  }

  private normalizeCompany(company: string): string {
    return company.trim().replace(/\s+/g, ' ');
  }

  private normalizeLocation(loc: string): string {
    return loc.trim().replace(/\s+/g, ' ');
  }

  private determineRemotePolicy(
    explicitRemote?: boolean,
    locationStr?: string,
    descriptionStr?: string,
  ): { isRemote: boolean; remotePolicy: 'REMOTE' | 'HYBRID' | 'ONSITE' } {
    const text = `${locationStr ?? ''} ${descriptionStr ?? ''}`.toLowerCase();

    if (explicitRemote || text.includes('remote') || text.includes('work from home')) {
      if (text.includes('hybrid')) {
        return { isRemote: false, remotePolicy: 'HYBRID' };
      }
      return { isRemote: true, remotePolicy: 'REMOTE' };
    }

    if (text.includes('hybrid')) {
      return { isRemote: false, remotePolicy: 'HYBRID' };
    }

    return { isRemote: false, remotePolicy: 'ONSITE' };
  }

  private extractSkills(
    description: string,
    rawSkills?: string[],
  ): { requiredSkills: string[]; preferredSkills: string[] } {
    const foundSkills = new Set<string>();

    // 1. Add any raw skills provided by source adapter if in dictionary
    if (rawSkills && Array.isArray(rawSkills)) {
      for (const skill of rawSkills) {
        const normKey = skill.toLowerCase().trim();
        if (KNOWN_TECH_DICTIONARY[normKey]) {
          foundSkills.add(KNOWN_TECH_DICTIONARY[normKey]);
        } else if (skill.length >= 2 && skill.length <= 30) {
          foundSkills.add(skill.trim());
        }
      }
    }

    // 2. Scan description using tech dictionary tokens
    const descLower = description.toLowerCase();
    for (const [key, canonicalName] of Object.entries(KNOWN_TECH_DICTIONARY)) {
      // Word boundary regex check
      const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?:^|\\W)${escaped}(?:$|\\W)`, 'i');
      if (regex.test(descLower)) {
        foundSkills.add(canonicalName);
      }
    }

    const allSkills = Array.from(foundSkills);

    // Split required vs preferred if description contains a "preferred/bonus" section
    const preferredIndex = Math.max(
      descLower.indexOf('preferred'),
      descLower.indexOf('nice to have'),
      descLower.indexOf('bonus'),
    );

    if (preferredIndex > -1) {
      const requiredSkills: string[] = [];
      const preferredSkills: string[] = [];
      const descBefore = descLower.substring(0, preferredIndex);

      for (const skill of allSkills) {
        const normKey = skill.toLowerCase();
        if (descBefore.includes(normKey)) {
          requiredSkills.push(skill);
        } else {
          preferredSkills.push(skill);
        }
      }
      return {
        requiredSkills: requiredSkills.length > 0 ? requiredSkills : allSkills,
        preferredSkills,
      };
    }

    return {
      requiredSkills: allSkills,
      preferredSkills: [],
    };
  }

  private parseSalary(
    salaryText?: string,
    description?: string,
  ): {
    salaryMin?: number;
    salaryMax?: number;
    salaryCurrency?: string;
    salaryRange?: string;
  } {
    const targetText = salaryText || description || '';
    if (!targetText) return {};

    const match = targetText.match(/\$([0-9,]{2,7})\s*(?:-|to)\s*\$([0-9,]{2,7})/i);
    if (match && match[1] && match[2]) {
      const min = parseInt(match[1].replace(/,/g, ''), 10);
      const max = parseInt(match[2].replace(/,/g, ''), 10);
      if (!isNaN(min) && !isNaN(max)) {
        return {
          salaryMin: min,
          salaryMax: max,
          salaryCurrency: 'USD',
          salaryRange: `$${min.toLocaleString('en-US')} - $${max.toLocaleString('en-US')}`,
        };
      }
    }

    if (salaryText?.trim()) {
      return { salaryRange: salaryText.trim() };
    }

    return {};
  }

  private parsePostedDate(postedText?: string): Date | undefined {
    if (!postedText) return new Date();

    const lower = postedText.toLowerCase().trim();
    if (lower.includes('just') || lower.includes('today')) {
      return new Date();
    }

    const daysMatch = lower.match(/([0-9]+)\s*day/);
    if (daysMatch && daysMatch[1]) {
      const days = parseInt(daysMatch[1], 10);
      const d = new Date();
      d.setDate(d.getDate() - days);
      return d;
    }

    const hoursMatch = lower.match(/([0-9]+)\s*hour/);
    if (hoursMatch && hoursMatch[1]) {
      const hours = parseInt(hoursMatch[1], 10);
      const d = new Date();
      d.setHours(d.getHours() - hours);
      return d;
    }

    const parsed = Date.parse(postedText);
    if (!isNaN(parsed)) {
      return new Date(parsed);
    }

    return new Date();
  }
}
