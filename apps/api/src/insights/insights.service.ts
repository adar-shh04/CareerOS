import { Injectable, Logger } from '@nestjs/common';

import { AiCapabilityService } from '../byok/ai-capability.service';
import { PrismaService } from '../database/prisma.service';
import type {
  CareerHandbookResponse,
  HandbookCareerPath,
  MarketIntelligenceResponse,
} from './insights.types';

@Injectable()
export class InsightsService {
  private readonly logger = new Logger(InsightsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiCapabilityService: AiCapabilityService,
  ) {}

  /**
   * Section 1 — AI Market Intelligence.
   * Capability-dependent:
   * 1. Checks if usable ingested market/job data exists in DB.
   * 2. Checks if AI capability is available.
   * Returns honest capability-unavailable response if either is missing. Never fabricates stats.
   */
  async getMarketIntelligence(
    workspaceId: string,
  ): Promise<MarketIntelligenceResponse> {
    // 1. Check job data count
    const jobDataCount = await this.prisma.client.job.count();
    if (jobDataCount === 0) {
      return {
        available: false,
        reason:
          'Market data has not been ingested yet. Ingest jobs via Job Radar first to generate market intelligence.',
        jobDataCount: 0,
      };
    }

    // 2. Check AI capability
    const cap = await this.aiCapabilityService.resolveCapability(workspaceId);
    if (!cap.available) {
      return {
        available: false,
        reason:
          cap.reason ??
          'AI capability is not configured. Connect BYOK or enable a platform AI plan to analyze market intelligence.',
        jobDataCount,
      };
    }

    // 3. Both market data & AI capability exist -> perform real analysis on ingested jobs
    const sampleJobs = await this.prisma.client.job.findMany({
      take: 20,
      select: {
        title: true,
        company: true,
        requiredSkills: true,
        isRemote: true,
      },
    });

    const skillCounts: Record<string, number> = {};
    const remoteRoles: string[] = [];

    for (const job of sampleJobs) {
      if (job.isRemote && !remoteRoles.includes(job.title)) {
        remoteRoles.push(job.title);
      }
      for (const skill of job.requiredSkills) {
        const key = skill.trim();
        if (key) {
          skillCounts[key] = (skillCounts[key] ?? 0) + 1;
        }
      }
    }

    const topRequiredSkills = Object.entries(skillCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([skill]) => skill);

    const systemPrompt = `You are a labor market analyst for CareerOS.
Synthesize market insights based ONLY on the provided ingested job data.
Do NOT invent fake market growth numbers or statistics outside the sample.`;

    const userPrompt = `Ingested Jobs Count: ${String(jobDataCount)}
Sample Skills Observed: ${topRequiredSkills.join(', ')}
Sample Remote Positions: ${remoteRoles.join(', ')}`;

    const completion = await this.aiCapabilityService.generateCompletion(
      workspaceId,
      { systemPrompt, userPrompt, temperature: 0.2 },
    );

    return {
      available: true,
      jobDataCount,
      topRequiredSkills,
      topRemoteRoles: remoteRoles.slice(0, 5),
      insightsSummary:
        completion.text ?? 'Market analysis synthesized from ingested jobs.',
    };
  }

  /**
   * Section 2 — Career Handbook.
   * Works independently of AI, BYOK, or job ingestion.
   * Provides stable static educational reference knowledge for diverse career paths.
   */
  getCareerHandbook(): CareerHandbookResponse {
    const careerPaths: HandbookCareerPath[] = [
      {
        fieldId: 'software-engineering',
        title: 'Software Engineering',
        description:
          'Building, maintaining, and scaling software applications, infrastructure, and web systems.',
        commonRoles: [
          'Frontend Engineer',
          'Backend Engineer',
          'Full Stack Developer',
          'DevOps Engineer',
          'Site Reliability Engineer',
        ],
        coreSkills: [
          'Data Structures & Algorithms',
          'System Design',
          'API Development',
          'Version Control (Git)',
          'Testing & CI/CD',
        ],
        technologies: [
          'TypeScript',
          'Node.js',
          'React',
          'PostgreSQL',
          'Docker',
          'Python',
          'Go',
        ],
        keywords: [
          'Distributed Systems',
          'Microservices',
          'RESTful APIs',
          'Cloud Architecture',
          'Agile/Scrum',
        ],
        learningPath: [
          'Master modern programming syntax & core data structures',
          'Build full-stack applications with database persistence',
          'Learn containerization (Docker) and deployment basics',
          'Study system design fundamentals and API security',
        ],
        studyResources: [
          {
            title: 'Roadmap.sh — Web Developer Roadmap',
            url: 'https://roadmap.sh',
            description:
              'Step-by-step learning path for modern developer roles.',
          },
          {
            title: 'MDN Web Docs',
            url: 'https://developer.mozilla.org',
            description:
              'Definitive documentation for HTML, CSS, and JavaScript.',
          },
        ],
      },
      {
        fieldId: 'data-analytics',
        title: 'Data Analysis & Business Intelligence',
        description:
          'Transforming raw business data into actionable strategic insights, metrics, and visual dashboards.',
        commonRoles: [
          'Data Analyst',
          'BI Developer',
          'Product Analyst',
          'Business Analyst',
          'Analytics Engineer',
        ],
        coreSkills: [
          'SQL Querying & Optimization',
          'Data Visualization',
          'Statistical Analysis',
          'ETL Pipelines',
          'A/B Testing',
        ],
        technologies: [
          'SQL (PostgreSQL / Snowflake / BigQuery)',
          'Python (Pandas / NumPy)',
          'Tableau',
          'Power BI',
          'dbt',
        ],
        keywords: [
          'Data Warehousing',
          'Cohort Analysis',
          'KPI Dashboards',
          'Statistical Significance',
          'Data Modeling',
        ],
        learningPath: [
          'Master advanced SQL queries (JOINs, Window Functions, Aggregations)',
          'Learn Python data manipulation with Pandas',
          'Build interactive dashboards using Tableau or Power BI',
          'Understand business metrics, conversion funnels, and retention modeling',
        ],
        studyResources: [
          {
            title: 'SQLZoo',
            url: 'https://sqlzoo.net',
            description: 'Interactive SQL learning exercises.',
          },
          {
            title: 'Kaggle Datasets & Notebooks',
            url: 'https://www.kaggle.com',
            description: 'Hands-on practice datasets and community tutorials.',
          },
        ],
      },
      {
        fieldId: 'product-management',
        title: 'Product Management',
        description:
          'Driving product strategy, defining feature roadmaps, and cross-functionally executing product vision.',
        commonRoles: [
          'Associate Product Manager',
          'Product Manager',
          'Senior PM',
          'Technical PM',
          'Group PM',
        ],
        coreSkills: [
          'Product Strategy & Vision',
          'User Research',
          'PRD Authoring',
          'Agile Execution',
          'Data-Informed Prioritization',
        ],
        technologies: [
          'Jira / Linear',
          'Mixpanel / Amplitude',
          'Figma',
          'Notion',
          'SQL',
        ],
        keywords: [
          'User Stories',
          'Roadmap Prioritization',
          'Feature Validation',
          'Go-To-Market Strategy',
          'Product-Market Fit',
        ],
        learningPath: [
          'Understand product lifecycles and customer interview frameworks',
          'Learn to write clear Product Requirement Documents (PRDs)',
          'Master product metrics (DAU/MAU, Churn, LTV, Retention)',
          'Partner effectively with engineering and design teams',
        ],
        studyResources: [
          {
            title: 'Product School Resources',
            url: 'https://productschool.com',
            description: 'Guides and templates for product leaders.',
          },
        ],
      },
      {
        fieldId: 'design',
        title: 'UI/UX & Product Design',
        description:
          'Designing intuitive, accessible, and delighting user interfaces and end-to-end product experiences.',
        commonRoles: [
          'UI/UX Designer',
          'Product Designer',
          'Interaction Designer',
          'UX Researcher',
          'Design Systems Specialist',
        ],
        coreSkills: [
          'User Experience (UX) Research',
          'Wireframing & Prototyping',
          'Design Systems',
          'Visual Hierarchy & Typography',
          'Usability Testing',
        ],
        technologies: ['Figma', 'Framer', 'Adobe CC', 'Storybook'],
        keywords: [
          'User Journeys',
          'Component Libraries',
          'Accessibility (WCAG)',
          'Micro-interactions',
          'Design Tokens',
        ],
        learningPath: [
          'Learn UI fundamentals: spacing, typography, contrast, layout grids',
          'Master Figma auto-layout, variants, and interactive components',
          'Conduct usability tests and iterate based on user feedback',
          'Build scalable design systems aligned with frontend UI frameworks',
        ],
        studyResources: [
          {
            title: 'Figma Community & Learning',
            url: 'https://help.figma.com',
            description: 'Official tutorials and UI kits.',
          },
        ],
      },
      {
        fieldId: 'research',
        title: 'Academic & Applied Research',
        description:
          'Formulating hypotheses, carrying out quantitative and qualitative experiments, and publishing scientific findings.',
        commonRoles: [
          'Research Scientist',
          'Lab Manager',
          'Postdoctoral Fellow',
          'Clinical Researcher',
          'Policy Researcher',
        ],
        coreSkills: [
          'Experimental Design',
          'Literature Review',
          'Statistical Hypothesis Testing',
          'Scientific Writing & Publishing',
          'Grant Writing',
        ],
        technologies: [
          'R',
          'Python (SciPy / Statsmodels)',
          'LaTeX',
          'Zotero',
          'SPSS / Stata',
        ],
        keywords: [
          'Peer Review',
          'Methodology',
          'Data Integrity',
          'Citation Analysis',
          'Reproducibility',
        ],
        learningPath: [
          'Master research methodology and statistical sampling',
          'Conduct comprehensive literature reviews using modern reference tools',
          'Publish papers using canonical LaTeX templates',
          'Present findings at scientific conferences and peer forums',
        ],
        studyResources: [
          {
            title: 'arXiv Open Access Archive',
            url: 'https://arxiv.org',
            description: 'Open-access research paper preprints.',
          },
        ],
      },
      {
        fieldId: 'healthcare',
        title: 'Healthcare & Medical Informatics',
        description:
          'Clinical care, medical research, healthcare management, and medical informatics technology.',
        commonRoles: [
          'Clinical Specialist',
          'Healthcare Administrator',
          'Medical Informatics Officer',
          'Public Health Analyst',
        ],
        coreSkills: [
          'Clinical Data Management',
          'Regulatory Compliance (HIPAA / GDPR)',
          'Medical Records Systems',
          'Patient Workflow Analysis',
        ],
        technologies: [
          'Epic / Cerner EHR',
          'HL7 / FHIR Standards',
          'Python',
          'SQL',
        ],
        keywords: [
          'Electronic Health Records',
          'Patient Care',
          'Clinical Trials',
          'Informatics',
          'Health Outcomes',
        ],
        learningPath: [
          'Understand healthcare privacy regulations and data security',
          'Learn HL7 / FHIR clinical data exchange standards',
          'Study clinical workflow optimization and health outcomes analytics',
        ],
        studyResources: [
          {
            title: 'HL7 International',
            url: 'https://www.hl7.org',
            description:
              'Global standards for health information interoperability.',
          },
        ],
      },
      {
        fieldId: 'finance',
        title: 'Finance & Financial Analysis',
        description:
          'Financial modeling, valuation, corporate financial planning, investment research, and risk management.',
        commonRoles: [
          'Financial Analyst',
          'FP&A Manager',
          'Investment Banking Analyst',
          'Quantitative Analyst',
          'Risk Manager',
        ],
        coreSkills: [
          'Financial Modeling',
          'DCF Valuation',
          'Corporate Accounting',
          'Budgeting & Forecasting',
          'Financial Reporting',
        ],
        technologies: [
          'Excel (Advanced / VBA)',
          'Bloomberg Terminal',
          'Python',
          'SQL',
        ],
        keywords: [
          'Financial Statements',
          'Discounted Cash Flow',
          'Variance Analysis',
          'Capital Budgeting',
          'Asset Allocation',
        ],
        learningPath: [
          'Master financial statement analysis (Income Statement, Balance Sheet, Cash Flow)',
          'Build dynamic financial forecast models in Excel/Python',
          'Understand valuation metrics (P/E, EV/EBITDA, DCF)',
        ],
        studyResources: [
          {
            title: 'Corporate Finance Institute (CFI)',
            url: 'https://corporatefinanceinstitute.com',
            description: 'Guides on financial modeling and valuation.',
          },
        ],
      },
    ];

    return { careerPaths };
  }
}
