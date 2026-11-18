import type { KeywordCoverageGroup } from '@repo/types';

import { canonicalSkillKey, KNOWN_TECH_DICTIONARY } from './skill-identity';

/**
 * Deterministic grouping of job terms for the keyword coverage report, keyed by
 * canonical skill identity. Terms outside this table are not guessed at: they
 * fall into "domain knowledge" (anything that is not a recognised language,
 * database, framework or tool).
 */
const TECHNICAL_SKILLS = [
  'TypeScript',
  'JavaScript',
  'Python',
  'Go',
  'Rust',
  'Ruby',
  'Java',
  'Kotlin',
  'Swift',
  'C++',
  'C#',
  'SQL',
  'PostgreSQL',
  'MySQL',
  'MongoDB',
  'Redis',
  'Elasticsearch',
  'Vector Databases',
];

const TOOLS_FRAMEWORKS = [
  'React',
  'Next.js',
  'Vue.js',
  'Angular',
  'Node.js',
  'Express',
  'NestJS',
  'Django',
  'Flask',
  'FastAPI',
  'Ruby on Rails',
  'GraphQL',
  'REST API',
  'Docker',
  'Kubernetes',
  'AWS',
  'GCP',
  'Azure',
  'Terraform',
  'Git',
  'CI/CD',
  'Kafka',
  'Triton',
  'WebGL',
  'WebAssembly',
  'PWA',
  'Electron',
  'Tailwind CSS',
];

const GROUP_BY_KEY: ReadonlyMap<string, KeywordCoverageGroup> = new Map([
  ...TECHNICAL_SKILLS.map(
    (skill) => [canonicalSkillKey(skill), 'technical_skills'] as const,
  ),
  ...TOOLS_FRAMEWORKS.map(
    (skill) => [canonicalSkillKey(skill), 'tools_frameworks'] as const,
  ),
]);

export function skillGroup(skill: string): KeywordCoverageGroup {
  return GROUP_BY_KEY.get(canonicalSkillKey(skill)) ?? 'domain_knowledge';
}

/**
 * Display spelling for a term: the canonical name when the term is a known
 * technology (so "node" shows as "Node.js"), otherwise the posting's own
 * trimmed spelling.
 */
export function skillDisplayName(skill: string): string {
  const trimmed = skill.trim().replace(/\s+/g, ' ');
  return KNOWN_TECH_DICTIONARY[trimmed.toLowerCase()] ?? trimmed;
}
