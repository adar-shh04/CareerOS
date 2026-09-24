/**
 * Deterministic skill identity for CareerOS.
 *
 * Skills are compared by canonical identity, never by substring: "Java" and
 * "JavaScript" are different skills, as are "Go" and "MongoDB". Legitimate
 * alternate spellings are resolved through KNOWN_TECH_DICTIONARY, which is also
 * the dictionary the ingestion pipeline uses to canonicalize job skills.
 */
export const KNOWN_TECH_DICTIONARY: Record<string, string> = {
  typescript: 'TypeScript',
  ts: 'TypeScript',
  javascript: 'JavaScript',
  js: 'JavaScript',
  react: 'React',
  'react.js': 'React',
  reactjs: 'React',
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

/** Lowercase, trim, and collapse internal whitespace. */
function normalizeSkillText(skill: string): string {
  return skill.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Returns the comparison key for a skill name. Two skills are the same skill
 * if and only if their keys are equal.
 */
export function canonicalSkillKey(skill: string): string {
  const normalized = normalizeSkillText(skill);
  const canonical = KNOWN_TECH_DICTIONARY[normalized];
  return canonical ? normalizeSkillText(canonical) : normalized;
}
