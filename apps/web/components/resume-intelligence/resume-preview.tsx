"use client";

import type { MasterCareerProfile, ResumeProfile, ResumeVersion } from "@repo/types";
import { Download, Printer, FileText, User } from "lucide-react";
import React, { useRef } from "react";

interface ResumePreviewProps {
  masterProfile: MasterCareerProfile | null;
  selectedProfile?: ResumeProfile | null;
  selectedVersion?: ResumeVersion | null;
}

export function ResumePreview({
  masterProfile,
  selectedProfile,
  selectedVersion,
}: ResumePreviewProps) {
  const printRef = useRef<HTMLDivElement>(null);

  // If viewing a snapshot version, use its snapshot master profile
  const profileData = selectedVersion?.masterProfileSnapshot ?? masterProfile;

  const handlePrint = () => {
    window.print();
  };

  if (!profileData || !profileData.identity?.fullName) {
    return (
      <div className="glass-panel p-12 text-center rounded-xl border border-white/10 bg-slate-900/60 backdrop-blur-md">
        <User className="w-12 h-12 text-purple-400 mx-auto mb-3" />
        <h4 className="text-lg font-bold text-white">No Master Profile Data Found</h4>
        <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
          Please complete your identity and experience in the Master Career Profile tab to generate a live resume preview.
        </p>
      </div>
    );
  }

  const {
  identity,
  experiences,
  education,
  skills,
  projects,
  certifications,
  links,
  } = profileData;

// Targeted versions contain immutable evidence-selection metadata.
// We use it to prioritize relevant records without removing
// legitimate career evidence from the resume.
  const selectedRecordIds = selectedVersion?.selectedRecordIds;

  const priorityExperienceIds = new Set(
    selectedRecordIds?.experienceIds ?? selectedProfile?.priorityExperienceIds ?? [],
  );

  const priorityProjectIds = new Set(
    selectedRecordIds?.projectIds ?? selectedProfile?.priorityProjectIds ?? [],
  );

  const prioritySkillIds = new Set(
    selectedRecordIds?.skillIds ?? selectedProfile?.prioritySkillIds ?? [],
  );

  const priorityCertificationIds = new Set(
    selectedRecordIds?.certificationIds ??
      selectedProfile?.priorityCertificationIds ??
      [],
  );

  const prioritize = <T extends { id: string }>(
    records: T[] | undefined,
    priorityIds: Set<string>,
  ): T[] => {
    if (!records?.length || priorityIds.size === 0) {
      return records ?? [];
    }

    return [...records].sort(
      (a, b) =>
        Number(priorityIds.has(b.id)) - Number(priorityIds.has(a.id)),
    );
  };

  const orderedExperiences = prioritize(experiences, priorityExperienceIds);
  const orderedProjects = prioritize(projects, priorityProjectIds);
  const orderedSkills = prioritize(skills, prioritySkillIds);
  const orderedCertifications = prioritize(
    certifications,
    priorityCertificationIds,
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-xl border border-white/10 bg-slate-900/60 backdrop-blur-md gap-3 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-white text-base">Live Resume Studio</h3>
            {selectedVersion && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Snapshot: {selectedVersion.targetCompany || selectedVersion.targetRole || "Version"}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Deterministic HTML rendering from real profile data. Print or save as PDF directly.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors shadow-lg shadow-indigo-600/20"
          >
            <Printer className="w-4 h-4" />
            Print / Save as PDF
          </button>
        </div>
      </div>

      {/* Rendered Document Sheet */}
      <div className="w-full flex justify-center bg-slate-950/40 p-4 sm:p-8 rounded-xl border border-white/5 overflow-x-auto print:bg-white print:p-0 print:border-none">
        <div
          ref={printRef}
          className="w-full max-w-[800px] bg-white text-slate-900 shadow-2xl p-8 sm:p-12 rounded-sm text-sm leading-relaxed font-sans print:shadow-none print:max-w-none print:w-full print:p-0 print:rounded-none"
          style={{ minHeight: "1056px" }}
        >
          {/* Header / Identity */}
          <header className="border-b-2 border-slate-900 pb-4 mb-6">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight uppercase">
              {identity.fullName}
            </h1>
            {identity.headline && (
              <p className="text-base font-semibold text-slate-700 mt-1">
                {identity.headline}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 mt-2 font-medium">
              {identity.email && <span>{identity.email}</span>}
              {identity.location && (
                <>
                  <span>•</span>
                  <span>{identity.location}</span>
                </>
              )}
              {links && links.length > 0 && (
                <>
                  {links.map((link) => (
                    <React.Fragment key={link.id}>
                      <span>•</span>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-800 underline font-semibold"
                      >
                        {link.label || link.url}
                      </a>
                    </React.Fragment>
                  ))}
                </>
              )}
            </div>
          </header>

          {/* Role Summary Guidance (if specified in profile) */}
          {selectedProfile?.summaryGuidance && (
            <section className="mb-6">
              <h2 className="text-xs font-bold text-slate-900 tracking-wider uppercase border-b border-slate-300 pb-1 mb-2">
                Executive Summary
              </h2>
              <p className="text-slate-700 text-xs italic leading-relaxed">
                {selectedProfile.summaryGuidance}
              </p>
            </section>
          )}

          {/* Work Experience */}
          {experiences && experiences.length > 0 && (
            <section className="mb-6">
              <h2 className="text-xs font-bold text-slate-900 tracking-wider uppercase border-b border-slate-300 pb-1 mb-3">
                Experience
              </h2>
              <div className="space-y-4">
                {orderedExperiences.map((exp) => (
                  <div key={exp.id} className="space-y-1">
                    <div className="flex justify-between items-baseline">
                      <div className="font-bold text-slate-900">
                        {exp.title} <span className="font-normal text-slate-600">| {exp.company}</span>
                      </div>
                      <div className="text-xs text-slate-500 font-medium shrink-0">
                        {exp.startDate} {exp.startDate && (exp.endDate || exp.current) ? "–" : ""}{" "}
                        {exp.current ? "Present" : exp.endDate}
                      </div>
                    </div>
                    {exp.location && (
                      <div className="text-xs text-slate-500 font-medium italic">{exp.location}</div>
                    )}
                    {exp.bullets && exp.bullets.length > 0 && (
                      <ul className="list-disc list-inside text-xs text-slate-700 space-y-1 mt-1 pl-1">
                        {exp.bullets.filter(Boolean).map((bullet, idx) => (
                          <li key={idx} className="leading-snug">
                            {bullet}
                          </li>
                        ))}
                      </ul>
                    )}
                    {exp.technologies && exp.technologies.length > 0 && (
                      <div className="text-[11px] text-slate-500 font-medium mt-1">
                        <span className="font-semibold text-slate-700">Technologies:</span>{" "}
                        {exp.technologies.join(", ")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Projects */}
          {projects && projects.length > 0 && (
            <section className="mb-6">
              <h2 className="text-xs font-bold text-slate-900 tracking-wider uppercase border-b border-slate-300 pb-1 mb-3">
                Projects
              </h2>
              <div className="space-y-3">
                {orderedProjects.map((proj) => (
                  <div key={proj.id} className="space-y-1">
                    <div className="flex justify-between items-baseline">
                      <div className="font-bold text-slate-900">
                        {proj.name}
                        {proj.url && (
                          <a
                            href={proj.url}
                            target="_blank"
                            rel="noreferrer"
                            className="font-normal text-xs text-slate-600 underline ml-2"
                          >
                            [Link]
                          </a>
                        )}
                      </div>
                    </div>
                    {proj.description && (
                      <p className="text-xs text-slate-700 leading-snug">{proj.description}</p>
                    )}
                    {proj.bullets && proj.bullets.length > 0 && (
                      <ul className="list-disc list-inside text-xs text-slate-700 space-y-0.5 pl-1">
                        {proj.bullets.filter(Boolean).map((bullet, idx) => (
                          <li key={idx}>{bullet}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Education & Certifications */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
            {education && education.length > 0 && (
              <section>
                <h2 className="text-xs font-bold text-slate-900 tracking-wider uppercase border-b border-slate-300 pb-1 mb-2">
                  Education
                </h2>
                <div className="space-y-2">
                  {education.map((edu) => (
                    <div key={edu.id}>
                      <div className="font-bold text-slate-900 text-xs">
                        {edu.degree || edu.institution}
                      </div>
                      <div className="text-xs text-slate-600">
                        {edu.institution} {edu.endDate ? `(${edu.endDate})` : ""}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {certifications && certifications.length > 0 && (
              <section>
                <h2 className="text-xs font-bold text-slate-900 tracking-wider uppercase border-b border-slate-300 pb-1 mb-2">
                  Certifications
                </h2>
                <div className="space-y-2">
                  {orderedCertifications.map((cert) => (
                    <div key={cert.id}>
                      <div className="font-bold text-slate-900 text-xs">{cert.name}</div>
                      <div className="text-xs text-slate-600">
                        {cert.issuer} {cert.issueDate ? `(${cert.issueDate})` : ""}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Skills */}
          {skills && skills.length > 0 && (
            <section className="mb-4">
              <h2 className="text-xs font-bold text-slate-900 tracking-wider uppercase border-b border-slate-300 pb-1 mb-2">
                Technical Skills
              </h2>
              <div className="flex flex-wrap gap-1.5 text-xs text-slate-800">
                {orderedSkills.map((skill) => (
                  <span
                    key={skill.id}
                    className="px-2 py-0.5 bg-slate-100 border border-slate-300 rounded text-[11px] font-medium"
                  >
                    {skill.name} {skill.proficiency ? `(${skill.proficiency})` : ""}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
