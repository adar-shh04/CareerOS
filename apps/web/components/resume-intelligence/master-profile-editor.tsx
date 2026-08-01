"use client";

import type {
  AchievementEntry,
  CareerIdentity,
  CareerLink,
  CertificationEntry,
  EducationEntry,
  ExperienceEntry,
  MasterCareerProfile,
  MasterCareerProfileInput,
  ProjectEntry,
  SkillEntry,
  TechnologyEntry,
} from "@repo/types";
import {
  BadgeCheck,
  Briefcase,
  Code2,
  FolderGit2,
  GraduationCap,
  Link2,
  Plus,
  Save,
  Trash2,
  Trophy,
  User,
} from "lucide-react";
import type { CSSProperties, FormEvent, ReactNode } from "react";
import { useEffect, useState } from "react";

interface Props {
  profile: MasterCareerProfile | null;
  onSave: (updated: MasterCareerProfileInput) => Promise<void>;
  saving: boolean;
}

type SectionId =
  | "identity"
  | "experience"
  | "education"
  | "skills"
  | "projects";

export function MasterProfileEditor({ profile, onSave, saving }: Props) {
  const [activeSection, setActiveSection] = useState<SectionId>("identity");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [identity, setIdentity] = useState<CareerIdentity>({
    fullName: "",
    headline: "",
    location: "",
    email: "",
  });
  const [links, setLinks] = useState<CareerLink[]>([]);
  const [experiences, setExperiences] = useState<ExperienceEntry[]>([]);
  const [education, setEducation] = useState<EducationEntry[]>([]);
  const [certifications, setCertifications] = useState<CertificationEntry[]>(
    [],
  );
  const [skills, setSkills] = useState<SkillEntry[]>([]);
  const [technologies, setTechnologies] = useState<TechnologyEntry[]>([]);
  const [projects, setProjects] = useState<ProjectEntry[]>([]);
  const [achievements, setAchievements] = useState<AchievementEntry[]>([]);

  /* ── Sync form state when the server profile arrives / updates ─────── */
  useEffect(() => {
    if (!profile) return;

    setIdentity({
      fullName: profile.identity.fullName,
      headline: profile.identity.headline ?? "",
      location: profile.identity.location ?? "",
      email: profile.identity.email ?? "",
    });
    setLinks(profile.links);
    setExperiences(profile.experiences);
    setEducation(profile.education);
    setCertifications(profile.certifications);
    setSkills(profile.skills);
    setTechnologies(profile.technologies);
    setProjects(profile.projects);
    setAchievements(profile.achievements);
  }, [profile]);

  /* ── Save handler ──────────────────────────────────────────────────── */
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);

    const payload: MasterCareerProfileInput = {
      identity,
      links,
      experiences,
      education,
      certifications,
      skills,
      technologies,
      projects,
      achievements,
    };

    try {
      await onSave(payload);
      setMessage({
        type: "success",
        text: "Master Career Profile saved successfully!",
      });
    } catch (err) {
      setMessage({
        type: "error",
        text:
          err instanceof Error
            ? err.message
            : "Failed to save profile. Please check inputs.",
      });
    }
  }

  function patchIdentity(field: keyof CareerIdentity, value: string) {
    setIdentity((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
    >
      {/* Save Notification Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "rgba(15, 23, 42, 0.6)",
          padding: "1rem 1.5rem",
          borderRadius: "0.75rem",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div>
          <h3 style={{ fontSize: "1.1rem", fontWeight: "700" }}>
            Master Career Profile
          </h3>
          <p style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
            Your canonical career source of truth. Version #
            {profile?.version ?? 1}
          </p>
        </div>

        <div
          style={{ display: "flex", alignItems: "center", gap: "1rem" }}
        >
          {message && (
            <span
              style={{
                fontSize: "0.8rem",
                color: message.type === "success" ? "#34d399" : "#f87171",
              }}
            >
              {message.text}
            </span>
          )}
          <button
            type="submit"
            disabled={saving}
            style={{
              ...primaryBtnStyle,
              opacity: saving ? 0.7 : 1,
              cursor: saving ? "wait" : "pointer",
            }}
          >
            <Save style={{ width: "16px", height: "16px" }} />
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </div>

      {/* Section Navigation */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          paddingBottom: "0.5rem",
          flexWrap: "wrap",
        }}
      >
        {(
          [
            { id: "identity", label: "Identity & Links", icon: User },
            { id: "experience", label: "Experience", icon: Briefcase },
            { id: "education", label: "Education & Certs", icon: GraduationCap },
            { id: "skills", label: "Skills & Tech", icon: Code2 },
            { id: "projects", label: "Projects & Wins", icon: FolderGit2 },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSection(tab.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.5rem 1rem",
                borderRadius: "0.5rem",
                fontSize: "0.85rem",
                fontWeight: isActive ? "600" : "500",
                color: isActive ? "#ffffff" : "#94a3b8",
                backgroundColor: isActive
                  ? "rgba(99, 102, 241, 0.15)"
                  : "transparent",
                border: isActive
                  ? "1px solid rgba(99, 102, 241, 0.3)"
                  : "1px solid transparent",
                cursor: "pointer",
              }}
            >
              <Icon style={{ width: "14px", height: "14px" }} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── SECTION: IDENTITY & LINKS ───────────────────────────────── */}
      {activeSection === "identity" && (
        <div className="glass-panel" style={panelStyle}>
          <SectionHeader
            icon={<User style={{ width: "16px", height: "16px" }} />}
            title="Identity & Headline"
          />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <Field label="Full Name">
              <input
                type="text"
                value={identity.fullName}
                onChange={(e) => patchIdentity("fullName", e.target.value)}
                placeholder="Alex Rivera"
                style={inputStyle}
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={identity.email ?? ""}
                onChange={(e) => patchIdentity("email", e.target.value)}
                placeholder="alex@example.com"
                style={inputStyle}
              />
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <Field label="Headline">
              <input
                type="text"
                value={identity.headline ?? ""}
                onChange={(e) => patchIdentity("headline", e.target.value)}
                placeholder="Staff Fullstack & AI Systems Engineer"
                style={inputStyle}
              />
            </Field>
            <Field label="Location">
              <input
                type="text"
                value={identity.location ?? ""}
                onChange={(e) => patchIdentity("location", e.target.value)}
                placeholder="San Francisco, CA / Remote"
                style={inputStyle}
              />
            </Field>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "0.75rem",
            }}
          >
            <SectionSubHeader
              icon={<Link2 style={{ width: "14px", height: "14px" }} />}
              title="Social & Portfolio Links"
            />
            <AddButton
              label="Add Link"
              onClick={() =>
                setLinks([
                  ...links,
                  { id: `link-${String(Date.now())}`, label: "", url: "" },
                ])
              }
            />
          </div>

          {links.length === 0 ? (
            <EmptyState
              icon={<Link2 style={{ width: "28px", height: "28px" }} />}
              title="No profile links yet"
              description="Add your GitHub, LinkedIn, portfolio, or blog so recruiters can explore your work."
              actionLabel="Add your first link"
              onAction={() =>
                setLinks([
                  ...links,
                  { id: `link-${String(Date.now())}`, label: "", url: "" },
                ])
              }
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {links.map((link) => (
                <div key={link.id} style={entryRowStyle}>
                  <input
                    type="text"
                    value={link.label}
                    onChange={(e) =>
                      setLinks(updateItem(links, link.id, { label: e.target.value }))
                    }
                    placeholder="Label (e.g. GitHub)"
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <input
                    type="url"
                    value={link.url}
                    onChange={(e) =>
                      setLinks(updateItem(links, link.id, { url: e.target.value }))
                    }
                    placeholder="https://github.com/..."
                    style={{ ...inputStyle, flex: 2 }}
                  />
                  <DeleteButton onClick={() => setLinks(removeItem(links, link.id))} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SECTION: EXPERIENCE ─────────────────────────────────────── */}
      {activeSection === "experience" && (
        <div className="glass-panel" style={panelStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <SectionHeader
              icon={<Briefcase style={{ width: "16px", height: "16px" }} />}
              title="Work Experience"
            />
            <AddButton label="Add Experience" onClick={addExperience} />
          </div>

          {experiences.length === 0 ? (
            <EmptyState
              icon={<Briefcase style={{ width: "28px", height: "28px" }} />}
              title="No experience records yet"
              description="Add your work history — role, company, dates, impact bullets, and the technologies you used."
              actionLabel="Add your first experience"
              onAction={addExperience}
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {experiences.map((exp) => (
                <div key={exp.id} style={entryCardStyle}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
                    <Field label="Job Title">
                      <input
                        type="text"
                        value={exp.title}
                        onChange={(e) =>
                          setExperiences(updateItem(experiences, exp.id, { title: e.target.value }))
                        }
                        placeholder="Staff Software Engineer"
                        style={inputStyle}
                      />
                    </Field>
                    <Field label="Company">
                      <input
                        type="text"
                        value={exp.company}
                        onChange={(e) =>
                          setExperiences(updateItem(experiences, exp.id, { company: e.target.value }))
                        }
                        placeholder="Company Name"
                        style={inputStyle}
                      />
                    </Field>
                    <Field label="Location">
                      <input
                        type="text"
                        value={exp.location ?? ""}
                        onChange={(e) =>
                          setExperiences(updateItem(experiences, exp.id, { location: e.target.value }))
                        }
                        placeholder="Remote / City"
                        style={inputStyle}
                      />
                    </Field>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <Field label="Start Date">
                      <input
                        type="text"
                        value={exp.startDate ?? ""}
                        onChange={(e) =>
                          setExperiences(updateItem(experiences, exp.id, { startDate: e.target.value }))
                        }
                        placeholder="e.g. 2022"
                        style={inputStyle}
                      />
                    </Field>
                    <Field label="End Date">
                      <input
                        type="text"
                        value={exp.endDate ?? ""}
                        onChange={(e) =>
                          setExperiences(updateItem(experiences, exp.id, { endDate: e.target.value }))
                        }
                        placeholder="e.g. 2024 or leave blank if current"
                        style={inputStyle}
                      />
                    </Field>
                  </div>

                  <label
                    style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "#cbd5e1" }}
                  >
                    <input
                      type="checkbox"
                      checked={exp.current ?? false}
                      onChange={(e) =>
                        setExperiences(updateItem(experiences, exp.id, { current: e.target.checked }))
                      }
                      style={{ accentColor: "#6366f1", width: "16px", height: "16px" }}
                    />
                    Currently working here
                  </label>

                  <Field label="Impact Bullets (one per line)">
                    <textarea
                      value={exp.bullets?.join("\n") ?? ""}
                      onChange={(e) =>
                        setExperiences(updateItem(experiences, exp.id, { bullets: e.target.value.split("\n") }))
                      }
                      placeholder={"Built…\nReduced latency by 40%…\nLed a team of 6…"}
                      rows={3}
                      style={{ ...inputStyle, resize: "vertical" }}
                    />
                  </Field>

                  <Field label="Technologies (comma separated)">
                    <input
                      type="text"
                      value={exp.technologies?.join(", ") ?? ""}
                      onChange={(e) =>
                        setExperiences(
                          updateItem(experiences, exp.id, {
                            technologies: e.target.value
                              .split(",")
                              .map((t) => t.trim())
                              .filter(Boolean),
                          }),
                        )
                      }
                      placeholder="TypeScript, React, PostgreSQL, AWS"
                      style={inputStyle}
                    />
                  </Field>

                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <DeleteButton onClick={() => setExperiences(removeItem(experiences, exp.id))} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SECTION: EDUCATION & CERTIFICATIONS ─────────────────────── */}
      {activeSection === "education" && (
        <div className="glass-panel" style={panelStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <SectionHeader
              icon={<GraduationCap style={{ width: "16px", height: "16px" }} />}
              title="Education & Degrees"
            />
            <AddButton label="Add Education" onClick={addEducation} />
          </div>

          {education.length === 0 ? (
            <EmptyState
              icon={<GraduationCap style={{ width: "28px", height: "28px" }} />}
              title="No education entries yet"
              description="Add your degrees, fields of study, and academic timeline."
              actionLabel="Add your first education"
              onAction={addEducation}
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {education.map((edu) => (
                <div key={edu.id} style={entryCardStyle}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <Field label="Institution">
                      <input
                        type="text"
                        value={edu.institution}
                        onChange={(e) =>
                          setEducation(updateItem(education, edu.id, { institution: e.target.value }))
                        }
                        placeholder="Stanford University"
                        style={inputStyle}
                      />
                    </Field>
                    <Field label="Degree">
                      <input
                        type="text"
                        value={edu.degree ?? ""}
                        onChange={(e) =>
                          setEducation(updateItem(education, edu.id, { degree: e.target.value }))
                        }
                        placeholder="B.S. Computer Science"
                        style={inputStyle}
                      />
                    </Field>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <Field label="Start Date">
                      <input
                        type="text"
                        value={edu.startDate ?? ""}
                        onChange={(e) =>
                          setEducation(updateItem(education, edu.id, { startDate: e.target.value }))
                        }
                        placeholder="e.g. 2020"
                        style={inputStyle}
                      />
                    </Field>
                    <Field label="End Date">
                      <input
                        type="text"
                        value={edu.endDate ?? ""}
                        onChange={(e) =>
                          setEducation(updateItem(education, edu.id, { endDate: e.target.value }))
                        }
                        placeholder="e.g. 2024"
                        style={inputStyle}
                      />
                    </Field>
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <DeleteButton onClick={() => setEducation(removeItem(education, edu.id))} />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem" }}>
            <SectionSubHeader
              icon={<BadgeCheck style={{ width: "14px", height: "14px" }} />}
              title="Certifications"
            />
            <AddButton label="Add Certification" onClick={addCertification} />
          </div>

          {certifications.length === 0 ? (
            <EmptyState
              icon={<BadgeCheck style={{ width: "28px", height: "28px" }} />}
              title="No certifications yet"
              description="Add certifications with issuing body and dates to strengthen credibility."
              actionLabel="Add your first certification"
              onAction={addCertification}
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {certifications.map((cert) => (
                <div key={cert.id} style={entryCardStyle}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <Field label="Certification Name">
                      <input
                        type="text"
                        value={cert.name}
                        onChange={(e) =>
                          setCertifications(updateItem(certifications, cert.id, { name: e.target.value }))
                        }
                        placeholder="AWS Solutions Architect"
                        style={inputStyle}
                      />
                    </Field>
                    <Field label="Issuer">
                      <input
                        type="text"
                        value={cert.issuer ?? ""}
                        onChange={(e) =>
                          setCertifications(updateItem(certifications, cert.id, { issuer: e.target.value }))
                        }
                        placeholder="Amazon Web Services"
                        style={inputStyle}
                      />
                    </Field>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <Field label="Issue Date">
                      <input
                        type="text"
                        value={cert.issueDate ?? ""}
                        onChange={(e) =>
                          setCertifications(updateItem(certifications, cert.id, { issueDate: e.target.value }))
                        }
                        placeholder="e.g. 2023"
                        style={inputStyle}
                      />
                    </Field>
                    <Field label="Expiration Date">
                      <input
                        type="text"
                        value={cert.expirationDate ?? ""}
                        onChange={(e) =>
                          setCertifications(updateItem(certifications, cert.id, { expirationDate: e.target.value }))
                        }
                        placeholder="e.g. 2026 (optional)"
                        style={inputStyle}
                      />
                    </Field>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem" }}>
                    <input
                      type="url"
                      value={cert.credentialUrl ?? ""}
                      onChange={(e) =>
                        setCertifications(updateItem(certifications, cert.id, { credentialUrl: e.target.value }))
                      }
                      placeholder="Credential URL (optional)"
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <DeleteButton onClick={() => setCertifications(removeItem(certifications, cert.id))} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SECTION: SKILLS & TECHNOLOGIES ──────────────────────────── */}
      {activeSection === "skills" && (
        <div className="glass-panel" style={panelStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <SectionHeader
              icon={<Code2 style={{ width: "16px", height: "16px" }} />}
              title="Skills & Technologies"
            />
            <AddButton label="Add Skill" onClick={addSkill} />
          </div>

          {skills.length === 0 ? (
            <EmptyState
              icon={<Code2 style={{ width: "28px", height: "28px" }} />}
              title="No skills added yet"
              description="Define your core competencies and proficiency levels — Foundational, Working, Advanced, or Expert."
              actionLabel="Add your first skill"
              onAction={addSkill}
            />
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "0.75rem",
              }}
            >
              {skills.map((sk) => (
                <div key={sk.id} style={entryRowStyle}>
                  <input
                    type="text"
                    value={sk.name}
                    onChange={(e) =>
                      setSkills(updateItem(skills, sk.id, { name: e.target.value }))
                    }
                    placeholder="Skill Name"
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <input
                    type="text"
                    value={sk.category ?? ""}
                    onChange={(e) =>
                      setSkills(updateItem(skills, sk.id, { category: e.target.value }))
                    }
                    placeholder="Category"
                    style={{ ...inputStyle, width: "110px" }}
                  />
                  <select
                    value={sk.proficiency ?? "advanced"}
                    onChange={(e) =>
                      setSkills(
                        updateItem(skills, sk.id, {
                          proficiency: e.target.value as
                            | "foundational"
                            | "working"
                            | "advanced"
                            | "expert",
                        }),
                      )
                    }
                    style={{ ...inputStyle, width: "120px" }}
                  >
                    <option value="foundational">Foundational</option>
                    <option value="working">Working</option>
                    <option value="advanced">Advanced</option>
                    <option value="expert">Expert</option>
                  </select>
                  <DeleteButton onClick={() => setSkills(removeItem(skills, sk.id))} />
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem" }}>
            <SectionSubHeader
              icon={<Code2 style={{ width: "14px", height: "14px" }} />}
              title="Technology Stacks"
            />
            <AddButton label="Add Technology" onClick={addTechnology} />
          </div>

          {technologies.length === 0 ? (
            <EmptyState
              icon={<Code2 style={{ width: "28px", height: "28px" }} />}
              title="No technologies added yet"
              description="List the stacks and platforms you work with, optionally grouped by category (e.g. Cloud, Frontend)."
              actionLabel="Add your first technology"
              onAction={addTechnology}
            />
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "0.75rem",
              }}
            >
              {technologies.map((tech) => (
                <div key={tech.id} style={entryRowStyle}>
                  <input
                    type="text"
                    value={tech.name}
                    onChange={(e) =>
                      setTechnologies(updateItem(technologies, tech.id, { name: e.target.value }))
                    }
                    placeholder="Technology Name"
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <input
                    type="text"
                    value={tech.category ?? ""}
                    onChange={(e) =>
                      setTechnologies(updateItem(technologies, tech.id, { category: e.target.value }))
                    }
                    placeholder="Category"
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <DeleteButton onClick={() => setTechnologies(removeItem(technologies, tech.id))} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SECTION: PROJECTS & ACHIEVEMENTS ────────────────────────── */}
      {activeSection === "projects" && (
        <div className="glass-panel" style={panelStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <SectionHeader
              icon={<FolderGit2 style={{ width: "16px", height: "16px" }} />}
              title="Portfolio Projects"
            />
            <AddButton label="Add Project" onClick={addProject} />
          </div>

          {projects.length === 0 ? (
            <EmptyState
              icon={<FolderGit2 style={{ width: "28px", height: "28px" }} />}
              title="No projects added yet"
              description="Showcase your key projects with links, descriptions, and measurable outcomes."
              actionLabel="Add your first project"
              onAction={addProject}
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {projects.map((proj) => (
                <div key={proj.id} style={entryCardStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem" }}>
                    <input
                      type="text"
                      value={proj.name}
                      onChange={(e) =>
                        setProjects(updateItem(projects, proj.id, { name: e.target.value }))
                      }
                      placeholder="Project Name"
                      style={{ ...inputStyle, flex: 1, fontWeight: 700 }}
                    />
                    <DeleteButton onClick={() => setProjects(removeItem(projects, proj.id))} />
                  </div>
                  <Field label="Description">
                    <textarea
                      value={proj.description ?? ""}
                      onChange={(e) =>
                        setProjects(updateItem(projects, proj.id, { description: e.target.value }))
                      }
                      placeholder="What did you build and why does it matter?"
                      rows={2}
                      style={{ ...inputStyle, resize: "vertical" }}
                    />
                  </Field>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <Field label="Project URL">
                      <input
                        type="url"
                        value={proj.url ?? ""}
                        onChange={(e) =>
                          setProjects(updateItem(projects, proj.id, { url: e.target.value }))
                        }
                        placeholder="https://example.com"
                        style={inputStyle}
                      />
                    </Field>
                    <Field label="Repository URL">
                      <input
                        type="url"
                        value={proj.repositoryUrl ?? ""}
                        onChange={(e) =>
                          setProjects(updateItem(projects, proj.id, { repositoryUrl: e.target.value }))
                        }
                        placeholder="https://github.com/..."
                        style={inputStyle}
                      />
                    </Field>
                  </div>
                  <Field label="Technologies (comma separated)">
                    <input
                      type="text"
                      value={proj.technologies?.join(", ") ?? ""}
                      onChange={(e) =>
                        setProjects(
                          updateItem(projects, proj.id, {
                            technologies: e.target.value
                              .split(",")
                              .map((t) => t.trim())
                              .filter(Boolean),
                          }),
                        )
                      }
                      placeholder="Next.js, PostgreSQL, Redis"
                      style={inputStyle}
                    />
                  </Field>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem" }}>
            <SectionSubHeader
              icon={<Trophy style={{ width: "14px", height: "14px" }} />}
              title="Achievements"
            />
            <AddButton label="Add Achievement" onClick={addAchievement} />
          </div>

          {achievements.length === 0 ? (
            <EmptyState
              icon={<Trophy style={{ width: "28px", height: "28px" }} />}
              title="No achievements yet"
              description="Awards, recognition, and standout results that set you apart."
              actionLabel="Add your first achievement"
              onAction={addAchievement}
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {achievements.map((ach) => (
                <div key={ach.id} style={entryCardStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem" }}>
                    <input
                      type="text"
                      value={ach.title}
                      onChange={(e) =>
                        setAchievements(updateItem(achievements, ach.id, { title: e.target.value }))
                      }
                      placeholder="Achievement Title"
                      style={{ ...inputStyle, flex: 1, fontWeight: 700 }}
                    />
                    <DeleteButton onClick={() => setAchievements(removeItem(achievements, ach.id))} />
                  </div>
                  <Field label="Description">
                    <textarea
                      value={ach.description ?? ""}
                      onChange={(e) =>
                        setAchievements(updateItem(achievements, ach.id, { description: e.target.value }))
                      }
                      placeholder="What made this achievement significant?"
                      rows={2}
                      style={{ ...inputStyle, resize: "vertical" }}
                    />
                  </Field>
                  <Field label="Date">
                    <input
                      type="text"
                      value={ach.date ?? ""}
                      onChange={(e) =>
                        setAchievements(updateItem(achievements, ach.id, { date: e.target.value }))
                      }
                      placeholder="e.g. 2024"
                      style={inputStyle}
                    />
                  </Field>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </form>
  );
}

/* ── Item mutations ───────────────────────────────────────────────────── */

function updateItem<T extends { id: string }>(
  items: readonly T[],
  id: string,
  patch: Partial<T>,
): T[] {
  return items.map((item) => (item.id === id ? { ...item, ...patch } : item));
}

function removeItem<T extends { id: string }>(
  items: readonly T[],
  id: string,
): T[] {
  return items.filter((item) => item.id !== id);
}

/* ── Add helpers ──────────────────────────────────────────────────────── */

function addExperience(): ExperienceEntry {
  return {
    id: `exp-${String(Date.now())}`,
    company: "",
    title: "",
    location: "",
    startDate: "",
    endDate: "",
    current: false,
    bullets: [],
    technologies: [],
  };
}

function addEducation(): EducationEntry {
  return {
    id: `edu-${String(Date.now())}`,
    institution: "",
    degree: "",
    fieldOfStudy: "",
    startDate: "",
    endDate: "",
  };
}

function addCertification(): CertificationEntry {
  return {
    id: `cert-${String(Date.now())}`,
    name: "",
    issuer: "",
    issueDate: "",
    expirationDate: "",
    credentialUrl: "",
  };
}

function addSkill(): SkillEntry {
  return {
    id: `skill-${String(Date.now())}`,
    name: "",
    category: "",
    proficiency: "advanced",
  };
}

function addTechnology(): TechnologyEntry {
  return {
    id: `tech-${String(Date.now())}`,
    name: "",
    category: "",
  };
}

function addProject(): ProjectEntry {
  return {
    id: `proj-${String(Date.now())}`,
    name: "",
    description: "",
    url: "",
    repositoryUrl: "",
    technologies: [],
  };
}

function addAchievement(): AchievementEntry {
  return {
    id: `ach-${String(Date.now())}`,
    title: "",
    description: "",
    date: "",
  };
}

/* ── Presentational helpers ───────────────────────────────────────────── */

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={labelStyle}>
      <span style={labelText}>{label}</span>
      {children}
    </label>
  );
}

function SectionHeader({
  icon,
  title,
}: {
  icon: ReactNode;
  title: string;
}) {
  return (
    <h4
      style={{
        fontSize: "1rem",
        fontWeight: "700",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        marginBottom: "1rem",
        color: "#e2e8f0",
      }}
    >
      {icon}
      {title}
    </h4>
  );
}

function SectionSubHeader({
  icon,
  title,
}: {
  icon: ReactNode;
  title: string;
}) {
  return (
    <h5
      style={{
        fontSize: "0.9rem",
        fontWeight: "700",
        display: "flex",
        alignItems: "center",
        gap: "0.4rem",
        color: "#cbd5e1",
      }}
    >
      {icon}
      {title}
    </h5>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={actionBtnStyle}>
      <Plus style={{ width: "14px", height: "14px" }} />
      {label}
    </button>
  );
}

function DeleteButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: "none",
        border: "none",
        color: "#f87171",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0.25rem",
      }}
    >
      <Trash2 style={{ width: "16px", height: "16px" }} />
    </button>
  );
}

function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "2rem 1.5rem",
        border: "1px dashed rgba(255,255,255,0.12)",
        borderRadius: "0.75rem",
        backgroundColor: "rgba(15,23,42,0.4)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.6rem",
      }}
    >
      <div
        style={{
          width: "52px",
          height: "52px",
          borderRadius: "12px",
          backgroundColor: "rgba(99,102,241,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#818cf8",
        }}
      >
        {icon}
      </div>
      <h5 style={{ fontSize: "0.95rem", fontWeight: 700 }}>{title}</h5>
      <p style={{ fontSize: "0.8rem", color: "#94a3b8", maxWidth: "380px" }}>
        {description}
      </p>
      <button type="button" onClick={onAction} style={actionBtnStyle}>
        <Plus style={{ width: "14px", height: "14px" }} />
        {actionLabel}
      </button>
    </div>
  );
}

/* ── Styles ───────────────────────────────────────────────────────────── */

const panelStyle: CSSProperties = {
  padding: "1.5rem",
  display: "flex",
  flexDirection: "column",
  gap: "0.9rem",
};

const labelStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.35rem",
};

const labelText: CSSProperties = {
  fontSize: "0.75rem",
  fontWeight: 600,
  color: "#cbd5e1",
};

const inputStyle: CSSProperties = {
  padding: "0.5rem 0.75rem",
  borderRadius: "0.5rem",
  backgroundColor: "rgba(15, 23, 42, 0.8)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "#f8fafc",
  fontSize: "0.85rem",
  outline: "none",
};

const actionBtnStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.4rem",
  padding: "0.4rem 0.85rem",
  borderRadius: "0.375rem",
  backgroundColor: "rgba(99, 102, 241, 0.15)",
  border: "1px solid rgba(99, 102, 241, 0.3)",
  color: "#818cf8",
  fontSize: "0.8rem",
  fontWeight: 600,
  cursor: "pointer",
};

const primaryBtnStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  padding: "0.6rem 1.25rem",
  borderRadius: "0.5rem",
  background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
  color: "#ffffff",
  fontWeight: 600,
  fontSize: "0.85rem",
  border: "none",
  boxShadow: "0 4px 15px rgba(99, 102, 241, 0.3)",
};

const entryCardStyle: CSSProperties = {
  padding: "1rem",
  borderRadius: "0.5rem",
  backgroundColor: "rgba(15, 23, 42, 0.6)",
  border: "1px solid rgba(255,255,255,0.06)",
  display: "flex",
  flexDirection: "column",
  gap: "0.75rem",
};

const entryRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  padding: "0.6rem 0.85rem",
  borderRadius: "0.5rem",
  backgroundColor: "rgba(15, 23, 42, 0.6)",
  border: "1px solid rgba(255,255,255,0.06)",
};
