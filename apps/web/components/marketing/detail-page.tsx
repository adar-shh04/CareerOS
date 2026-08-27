import Link from 'next/link';
import { ArrowRight, Check, Compass, FileText, Code2, BriefcaseBusiness, Radar, Route, Target, TrendingUp, Upload } from 'lucide-react';
import styles from './detail-page.module.css';

const features = [
  ['career-profile','Career Profile','Your persistent foundation: skills, experience, education, projects, goals, preferred roles, location, seniority, interests, and achievements. One source of truth powers matching, resume targeting, insights, tracking, and growth.'],
  ['job-radar','Job Radar','CareerOS ingests opportunities, normalizes their structure, deduplicates repeats, and brings a clearer radar into view. Sources → ingestion → normalization → deduplication → radar.'],
  ['job-matching','Explainable Job Matching','See the dimensions behind a fit summary: matched and missing skills, experience, seniority, location, remote policy, role alignment, and career goals. CareerOS explains why, not just how.'],
  ['resume-intelligence','Resume Intelligence','Treat resumes as durable career assets. Keep a master resume, preserve original source and templates when applicable, and create targeted versions without destroying the source.'],
  ['applications','Application Tracking','Move opportunities through Discovered → Interested → Applied → Screening → Interview → Offer → Rejected → Archived, with room for resume versions, dates, stages, outcomes, and notes.'],
  ['career-insights','Career Insights','Learn from activity over time: target roles, recurring skills, outcomes, resume versions, strengths, and gaps. Insights guide reflection—not hiring guarantees.'],
  ['automation','Workflow Automation','Reduce repetitive work across ingestion, deduplication, matching, targeting, tracking, reminders, and reviewable workflows. CareerOS never applies on your behalf.'],
  ['career-growth','Career Growth','Current Profile → Skill Gaps → Learning / Experience → Better Opportunities → Next Role → Long-Term Goal. Make your next move visible and intentional.'],
] as const;

const steps = [
  ['sign-up','01','Create your account','Start with an onboarding flow that introduces the system before you land in the command center.'],
  ['byok','02','Bring your own key','Where AI features require it, configure your provider through CareerOS. Keys stay server-side and are never exposed in the browser.'],
  ['career-profile','03','Build your career profile','Your profile becomes the persistent source of truth rather than another form to repeat.'],
  ['resume-import','04','Import a resume','Upload → parse → extract → review → confirm. Intended architecture preserves your control and does not silently overwrite profile data.'],
  ['linkedin','05','Enrich with LinkedIn','Where supported, explicitly connect or provide information. No unauthorized scraping or restriction bypassing.'],
  ['github','06','Add GitHub evidence','Authorized/public GitHub data can enrich technical context; activity is evidence, not proof of skill level.'],
  ['job-discovery','07','Discover jobs','Career Profile + Job Sources → Job Radar, through ingestion, normalization, and deduplication.'],
  ['matching','08','Understand fit','Review deterministic, explainable dimensions instead of trusting an opaque score.'],
  ['resume','09','Target your resume','Use persistent profile and resume information to prepare a considered role-specific version while preserving your original.'],
  ['applications','10','Apply & track','Keep the decision yours, then learn from every application and move toward the next opportunity.'],
] as const;

export function DetailPage({ kind }: { kind: 'what-we-do' | 'how-it-works' }) {
  const isFeatures = kind === 'what-we-do';
  const items = isFeatures ? features : steps;
  return <main className={styles.page}>
    <header className={styles.nav}><Link href="/" className={styles.brand}><span className={styles.mark}><Compass /></span>Career<span>OS</span></Link><Link href="/" className={styles.back}>Back to home <ArrowRight /></Link></header>
    <section className={styles.hero}><p className={styles.kicker}>{isFeatures ? 'The CareerOS ecosystem' : 'A connected workflow'}</p><h1>{isFeatures ? 'Everything your career needs, in one system.' : 'From confusion to clarity, one step at a time.'}</h1><p>{isFeatures ? 'CareerOS connects your profile, opportunities, resumes, applications, and career growth into one persistent career operating system.' : 'CareerOS helps you build a durable foundation, discover opportunities, understand fit, take thoughtful action, and keep growing.'}</p></section>
    <div className={styles.index}>{items.map(([id, ...rest]) => <a key={id} href={`#${id}`}>{isFeatures ? rest[0] : `${rest[0]} ${rest[1]}`}</a>)}</div>
    <div className={styles.sections}>{items.map(([id, ...rest]) => <section id={id} className={styles.section} key={id}><div className={styles.sectionIcon}>{isFeatures ? id === 'job-radar' ? <Radar /> : id === 'resume-intelligence' ? <FileText /> : id === 'career-growth' ? <TrendingUp /> : <Target /> : id === 'github' ? <Code2 /> : id === 'linkedin' ? <BriefcaseBusiness /> : id === 'resume-import' ? <Upload /> : <Route />}</div><div><p className={styles.number}>{isFeatures ? 'CAREEROS MODULE' : rest[0]}</p><h2>{isFeatures ? rest[0] : rest[1]}</h2><p>{isFeatures ? rest[1] : rest[2]}</p>{isFeatures && id === 'job-radar' && <div className={styles.mockList}><b>Frontend Engineer <span>92% alignment</span></b><b>Full Stack Developer <span>87% alignment</span></b><b>Software Engineer <span>81% alignment</span></b></div>}{isFeatures && id === 'job-matching' && <div className={styles.match}><b>Frontend Engineer — Strong alignment</b><span><Check /> React · TypeScript · Next.js</span><span><Check /> Experience and remote preference aligned</span><span className={styles.gap}>• Gap: GraphQL</span></div>}</div></section>)}</div>
    <section className={styles.cta}><Compass /><h2>Build a career system that remembers what matters.</h2><Link href="/register">Get started <ArrowRight /></Link></section>
  </main>;
}
