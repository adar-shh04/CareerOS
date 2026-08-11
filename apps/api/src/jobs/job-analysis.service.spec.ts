import type { CanonicalJob } from '@repo/types';

import type { MasterCareerProfile } from '../career-profile/career-profile.types';
import { JobAnalysisService } from './job-analysis.service';

describe('JobAnalysisService', () => {
  let service: JobAnalysisService;

  beforeEach(() => {
    service = new JobAnalysisService();
  });

  it('should generate detailed structured job analysis evidence', () => {
    const job: CanonicalJob = {
      id: 'job-100',
      source: 'manual',
      company: 'Linear',
      title: 'Senior Frontend Engineer',
      location: 'Remote',
      isRemote: true,
      remotePolicy: 'REMOTE',
      seniority: 'Senior',
      experienceRequirements: { minYears: 5, text: '5+ years' },
      requiredSkills: ['React', 'TypeScript', 'GraphQL'],
      preferredSkills: ['Next.js', 'Tailwind CSS'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const match = {
      matchedSkills: ['React', 'TypeScript'],
      missingSkills: ['GraphQL'],
      dimensionScores: {
        skill: 0.67,
        role: 0.8,
        experience: 1.0,
        location: 1.0,
        seniority: 1.0,
      },
      confidence: 0.9,
      explanation: '67% skill match.',
    };

    const masterProfile: MasterCareerProfile = {
      id: 'prof-1',
      workspaceId: 'ws-1',
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      identity: { fullName: 'Jane Doe', headline: 'Full Stack Engineer' },
      experiences: [
        {
          id: 'exp-1',
          company: 'Acme Corp',
          title: 'Frontend Engineer',
          startDate: '2019-01',
          endDate: '2024-01',
          bullets: ['Built React apps'],
          technologies: ['React', 'TypeScript'],
        },
      ],
      education: [],
      projects: [],
      achievements: [],
      skills: [
        { id: 'sk-1', name: 'React' },
        { id: 'sk-2', name: 'TypeScript' },
      ],
      technologies: [],
      publications: [],
      hackathons: [],
      certifications: [],
      links: [],
    };

    const analysis = service.analyze(job, match, masterProfile);

    expect(analysis.jobId).toBe('job-100');
    expect(analysis.role).toBe('Senior Frontend Engineer');
    expect(analysis.seniority).toBe('Senior');
    expect(analysis.skills.matchedSkills).toEqual(['React', 'TypeScript']);
    expect(analysis.gaps.missingRequiredSkills).toEqual(['GraphQL']);
    expect(analysis.gaps.missingPreferredSkills).toEqual([
      'Next.js',
      'Tailwind CSS',
    ]);
    expect(analysis.targetingRecommendations.prioritySkillNames).toContain(
      'React',
    );
  });
});
