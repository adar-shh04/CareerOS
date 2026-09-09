"use client";

import type { ResumeVersion } from "@repo/types";
import {
  ArrowRight,
  CheckCircle,
  Diff,
  History,
  Minus,
  Plus,
} from "lucide-react";
import React, { useState } from "react";

interface ResumeVersionComparisonProps {
  versions: ResumeVersion[];
}

export function ResumeVersionComparison({ versions }: ResumeVersionComparisonProps) {
  const [versionAId, setVersionAId] = useState<string>(versions[0]?.id ?? "");
  const [versionBId, setVersionBId] = useState<string>(versions[1]?.id ?? versions[0]?.id ?? "");

  const versionA = versions.find((v) => v.id === versionAId) ?? null;
  const versionB = versions.find((v) => v.id === versionBId) ?? null;

  if (versions.length < 2) {
    return (
      <div className="p-8 text-center rounded-xl border border-slate-200/80 bg-white shadow-xs">
        <History className="w-10 h-10 text-[#1d68ed] mx-auto mb-3" />
        <h4 className="text-base font-bold text-slate-900">At Least Two Versions Required</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Create another version snapshot to perform side-by-side comparison of career records, target roles, and profile variations.
        </p>
      </div>
    );
  }

  // Calculate real differences between versionA and versionB masterProfileSnapshot
  const skillsA = new Set(
    (versionA ? versionA.masterProfileSnapshot.skills : []).map((s) => s.name),
  );
  const skillsB = new Set(
    (versionB ? versionB.masterProfileSnapshot.skills : []).map((s) => s.name),
  );

  const addedSkills = Array.from(skillsB).filter((s) => !skillsA.has(s));
  const removedSkills = Array.from(skillsA).filter((s) => !skillsB.has(s));
  const unchangedSkills = Array.from(skillsA).filter((s) => skillsB.has(s));

  const experiencesA = versionA ? versionA.masterProfileSnapshot.experiences : [];
  const experiencesB = versionB ? versionB.masterProfileSnapshot.experiences : [];

  const projectsA = versionA ? versionA.masterProfileSnapshot.projects : [];
  const projectsB = versionB ? versionB.masterProfileSnapshot.projects : [];

  return (
    <div className="flex flex-col gap-6">
      {/* Comparison Selector Bar */}
      <div className="p-4 rounded-xl border border-slate-200/80 bg-white shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Diff className="w-5 h-5 text-[#1d68ed]" />
          <div>
            <h3 className="font-bold text-slate-900 text-base">Resume Snapshot Comparison</h3>
            <p className="text-xs text-slate-500">
              Deterministic diff between immutable snapshot records.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Version A Selector */}
          <div className="flex-1 sm:flex-initial">
            <span className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Base Snapshot</span>
            <select
              value={versionAId}
              onChange={(e) => setVersionAId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-[#1d68ed] shadow-2xs"
            >
              {versions.map((v, idx) => (
                <option key={v.id} value={v.id}>
                  #{versions.length - idx}: {v.targetCompany ? `${v.targetCompany} — ` : ""}{v.targetRole ?? "General"}
                </option>
              ))}
            </select>
          </div>

          <ArrowRight className="w-4 h-4 text-slate-400 shrink-0 mt-4" />

          {/* Version B Selector */}
          <div className="flex-1 sm:flex-initial">
            <span className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Target Snapshot</span>
            <select
              value={versionBId}
              onChange={(e) => setVersionBId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-[#1d68ed] shadow-2xs"
            >
              {versions.map((v, idx) => (
                <option key={v.id} value={v.id}>
                  #{versions.length - idx}: {v.targetCompany ? `${v.targetCompany} — ` : ""}{v.targetRole ?? "General"}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Version A Card */}
        {versionA && (
          <div className="rounded-xl border border-slate-200/80 bg-white p-5 space-y-4 shadow-xs">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#1d68ed]">
                  Base Snapshot
                </span>
                <h4 className="text-base font-bold text-slate-900 mt-0.5">
                  {versionA.targetCompany ? `${versionA.targetCompany} — ` : ""}{versionA.targetRole ?? "General Application"}
                </h4>
                <div className="text-xs text-slate-500 mt-0.5">
                  Format: <span className="uppercase text-slate-900 font-semibold">{versionA.outputFormat}</span> • {new Date(versionA.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Experiences Summary */}
            <div>
              <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                Work Experiences ({experiencesA.length})
              </h5>
              <div className="space-y-2">
                {experiencesA.map((exp) => (
                  <div key={exp.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70 text-xs">
                    <div className="font-semibold text-slate-900">{exp.title}</div>
                    <div className="text-slate-500">{exp.company} • {exp.startDate} - {exp.current ? "Present" : exp.endDate}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Projects Summary */}
            <div>
              <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                Projects ({projectsA.length})
              </h5>
              <div className="space-y-2">
                {projectsA.map((proj) => (
                  <div key={proj.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70 text-xs">
                    <div className="font-semibold text-slate-900">{proj.name}</div>
                    <div className="text-slate-500 line-clamp-1">{proj.description}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Version B Card */}
        {versionB && (
          <div className="rounded-xl border border-slate-200/80 bg-white p-5 space-y-4 shadow-xs">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">
                  Target Snapshot
                </span>
                <h4 className="text-base font-bold text-slate-900 mt-0.5">
                  {versionB.targetCompany ? `${versionB.targetCompany} — ` : ""}{versionB.targetRole ?? "General Application"}
                </h4>
                <div className="text-xs text-slate-500 mt-0.5">
                  Format: <span className="uppercase text-slate-900 font-semibold">{versionB.outputFormat}</span> • {new Date(versionB.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Experiences Summary */}
            <div>
              <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                Work Experiences ({experiencesB.length})
              </h5>
              <div className="space-y-2">
                {experiencesB.map((exp) => (
                  <div key={exp.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70 text-xs">
                    <div className="font-semibold text-slate-900">{exp.title}</div>
                    <div className="text-slate-500">{exp.company} • {exp.startDate} - {exp.current ? "Present" : exp.endDate}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Projects Summary */}
            <div>
              <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                Projects ({projectsB.length})
              </h5>
              <div className="space-y-2">
                {projectsB.map((proj) => (
                  <div key={proj.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70 text-xs">
                    <div className="font-semibold text-slate-900">{proj.name}</div>
                    <div className="text-slate-500 line-clamp-1">{proj.description}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Skills Diff Section */}
      <div className="p-5 rounded-xl border border-slate-200/80 bg-white shadow-xs space-y-4">
        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Diff className="w-4 h-4 text-[#1d68ed]" />
          Technical Skill Differences
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Added Skills */}
          <div className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-200">
            <div className="text-xs font-bold text-emerald-800 flex items-center gap-1.5 mb-2">
              <Plus className="w-3.5 h-3.5" /> Added Skills ({addedSkills.length})
            </div>
            {addedSkills.length === 0 ? (
              <span className="text-xs text-slate-500 italic">No new skills added</span>
            ) : (
              <div className="flex flex-wrap gap-1">
                {addedSkills.map((sk) => (
                  <span key={sk} className="px-2 py-0.5 rounded bg-emerald-100/80 text-emerald-800 border border-emerald-200 text-xs font-medium">
                    + {sk}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Removed Skills */}
          <div className="p-3 rounded-lg bg-rose-50/50 border border-rose-200">
            <div className="text-xs font-bold text-rose-800 flex items-center gap-1.5 mb-2">
              <Minus className="w-3.5 h-3.5" /> Removed Skills ({removedSkills.length})
            </div>
            {removedSkills.length === 0 ? (
              <span className="text-xs text-slate-500 italic">No skills removed</span>
            ) : (
              <div className="flex flex-wrap gap-1">
                {removedSkills.map((sk) => (
                  <span key={sk} className="px-2 py-0.5 rounded bg-rose-100/80 text-rose-800 border border-rose-200 text-xs font-medium line-through">
                    - {sk}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Unchanged Skills */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70">
            <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5 mb-2">
              <CheckCircle className="w-3.5 h-3.5 text-slate-500" /> Unchanged Skills ({unchangedSkills.length})
            </div>
            {unchangedSkills.length === 0 ? (
              <span className="text-xs text-slate-500 italic">No common skills</span>
            ) : (
              <div className="flex flex-wrap gap-1">
                {unchangedSkills.map((sk) => (
                  <span key={sk} className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-800 text-xs font-medium">
                    {sk}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
