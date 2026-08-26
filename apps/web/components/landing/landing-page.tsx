"use client";

import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  Compass,
  FileText,
  Menu,
  Send,
  Sparkles,
  Target,
  TrendingUp,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const navItems = [
  ["What We Do", "#what-we-do"],
  ["How It Works", "#how-it-works"],
  ["Growth", "#growth"],
  ["Help & Support", "#support"],
  ["Contact", "#contact"],
];

const features = [
  { icon: Compass, title: "Career Profile", text: "Keep your skills, experience, goals, and preferences in one living career profile." },
  { icon: BriefcaseBusiness, title: "Job Radar", text: "Discover and organize relevant opportunities without endless searching." },
  { icon: Target, title: "Explainable Matching", text: "See the skills, experience, seniority, and location signals behind every fit." },
  { icon: FileText, title: "Resume Intelligence", text: "Build reusable resume profiles and targeted versions that evolve with you." },
  { icon: TrendingUp, title: "Career Growth", text: "Understand the skills and experience that move you toward your next goal." },
  { icon: Sparkles, title: "Less Repetition", text: "Reduce the repetitive work of job searching so you can focus on better decisions." },
];

const journey = ["Build your profile", "Discover opportunities", "Understand your fit", "Tailor your resume", "Apply & track", "Learn & grow"];

function Logo() {
  return <Link href="/" className="landing-logo" aria-label="CareerOS home"><span className="logo-mark"><Send size={17} /></span>CareerOS</Link>;
}

function Airplane({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`airplane ${className}`}><Send size={34} /></div>;
}

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <main className="landing-page">
      <header className="landing-nav">
        <div className="landing-nav-inner"><Logo />
          <nav className={menuOpen ? "landing-links is-open" : "landing-links"} aria-label="Main navigation">
            {navItems.map(([label, href]) => <a key={href} href={href} onClick={() => setMenuOpen(false)}>{label}</a>)}
            <Link href="/login" className="mobile-signin">Sign in</Link>
            <Link href="/register" className="mobile-cta">Get started <ArrowRight size={15} /></Link>
          </nav>
          <div className="nav-actions"><Link href="/login" className="nav-signin">Sign in</Link><Link href="/register" className="nav-cta">Get started <ArrowRight size={15} /></Link></div>
          <button className="menu-button" aria-label={menuOpen ? "Close navigation" : "Open navigation"} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
        </div>
      </header>

      <section className="hero-section">
        <div className="hero-copy"><p className="eyebrow"><span className="eyebrow-line" />Career clarity, in motion</p><h1>Your career.<br /><em>One operating system.</em></h1><p className="hero-lede">CareerOS brings job discovery, career intelligence, resume optimization, applications, and growth into one intelligent workspace.</p><div className="hero-actions"><Link href="/register" className="primary-button">Get started <ArrowRight size={17} /></Link><a href="#what-we-do" className="text-button">Explore CareerOS <ChevronRight size={16} /></a></div></div>
        <div className="hero-art" aria-label="Career path visual"><img className="hero-reference-image" src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/images.jfif-6iyXrcPzcTmejVzr87VRPnGwiHdLxx.jpeg" alt="Paper airplanes and clouds floating across a bright blue sky" /><div className="hero-image-wash" /><div className="sun-glow" /><svg className="flight-path" viewBox="0 0 600 390" aria-hidden="true"><path d="M30 315 C145 120 205 340 310 180 S450 65 570 80" /></svg><Airplane className="hero-plane" /><div className="float-card card-match"><span className="card-icon"><Target size={15} /></span><div><strong>Job match</strong><small>Explainable fit</small></div><b>92%</b></div><div className="float-card card-resume"><span className="card-icon"><FileText size={15} /></span><div><strong>Resume fit</strong><small>3 strengths found</small></div><Check size={16} className="check-icon" /></div><div className="destination"><span /><small>next opportunity</small></div></div>
      </section>

      <section className="value-strip" aria-label="CareerOS benefits">{[[Compass, "Discover better opportunities", "Find relevant jobs instead of endlessly searching."], [Target, "Understand your fit", "Know why a role matches your profile and goals."], [TrendingUp, "Move forward faster", "Turn opportunities into targeted, measurable progress."]].map(([Icon, title, text]) => <div className="value-item" key={title as string}><Icon size={21} /><div><h3>{title as string}</h3><p>{text as string}</p></div></div>)}</section>

      <section className="section feature-section" id="what-we-do"><div className="section-heading"><p className="eyebrow">The complete system</p><h2>Everything you need to move<br className="desktop-only" /> your career forward.</h2><p>CareerOS turns the fragmented job-search process into one connected system.</p></div><div className="feature-grid">{features.map(({ icon: Icon, title, text }) => <article className="feature-card" key={title}><span className="feature-icon"><Icon size={20} /></span><h3>{title}</h3><p>{text}</p><ArrowRight size={17} className="feature-arrow" /></article>)}</div></section>

      <section className="section journey-section" id="how-it-works"><div className="section-heading"><p className="eyebrow">A connected journey</p><h2>From searching to growing.</h2><p>Your next step is clearer when every step works together.</p></div><div className="journey-track">{journey.map((step, index) => <div className="journey-step" key={step}><span className="journey-dot">{String(index + 1).padStart(2, "0")}</span><p>{step}</p>{index < journey.length - 1 && <span className="journey-connector" />}</div>)}</div></section>

      <section className="match-section"><div className="match-copy"><p className="eyebrow">Evidence, not guesswork</p><h2>Don&apos;t just get a score.<br /><em>Understand the match.</em></h2><p>CareerOS makes the reasoning visible, so every opportunity becomes an informed decision — not an opaque number.</p><a href="#contact" className="text-button">See how it works <ChevronRight size={16} /></a></div><div className="analysis-card"><div className="analysis-top"><div><span className="muted-label">ROLE ANALYSIS</span><h3>Frontend Engineer</h3><p>Northstar Labs · Remote</p></div><div className="match-badge">92%<small>aligned</small></div></div><div className="analysis-line"><span>Match overview</span><span className="status-positive">Strong alignment</span></div><div className="analysis-grid"><div><small>SKILLS</small><p><Check size={14} /> React</p><p><Check size={14} /> TypeScript</p><p><Check size={14} /> Next.js</p></div><div><small>EXPERIENCE</small><p><Check size={14} /> 2 / 3 years aligned</p><small>LOCATION</small><p><Check size={14} /> Remote preference</p></div></div><div className="missing"><small>ONE AREA TO GROW</small><p><span>•</span> GraphQL</p></div><p className="analysis-note">Strong technical alignment with your current profile. Your biggest gap is GraphQL — a clear next step before applying.</p></div></section>

      <section className="section resume-section"><div className="resume-visual"><div className="resume-stack"><div className="resume-sheet sheet-back" /><div className="resume-sheet sheet-mid" /><div className="resume-sheet sheet-front"><span className="resume-kicker">CAREEROS / RESUME PROFILE</span><strong>Frontend<br />Engineer</strong><span className="resume-rule" /><small>React · TypeScript · Product systems</small></div></div><div className="version-pill"><span /><div><b>Version 04</b><small>Targeted · Northstar Labs</small></div></div></div><div className="resume-copy"><p className="eyebrow">Your career asset</p><h2>Your resume should<br /><em>evolve with you.</em></h2><p>Keep reusable resume data, multiple profiles, and targeted versions in one place — while preserving the source of your story.</p><div className="resume-list"><span><Check size={15} /> Master career profile</span><span><Check size={15} /> Multiple resume profiles</span><span><Check size={15} /> Version history that stays clear</span></div></div></section>

      <section className="growth-section" id="growth"><div className="growth-content"><p className="eyebrow">Career horizon</p><h2>Don&apos;t just find your next job.<br /><em>Build your next career.</em></h2><p>CareerOS helps you understand what comes next — not just what is available today.</p><div className="horizon-path"><span>Current profile</span><ArrowRight size={16} /><span>Skill development</span><ArrowRight size={16} /><span>Next role</span><ArrowRight size={16} /><span>Long-term goal</span></div></div><Airplane className="growth-plane" /></section>

      <section className="section support-section" id="support"><div className="compass-art"><Compass size={116} strokeWidth={1} /><span className="compass-ring ring-a" /><span className="compass-ring ring-b" /></div><div><p className="eyebrow">Help & support</p><h2>Never lose<br /><em>your direction.</em></h2><p>Whether you&apos;re deciding which role to apply for or figuring out your next move, CareerOS should help you understand what to do next.</p><a href="#contact" className="primary-button">Explore support <ArrowRight size={17} /></a></div></section>

      <section className="contact-section" id="contact"><div><p className="eyebrow">Have an idea?</p><h2>Help shape<br /><em>CareerOS.</em></h2><p>Tell us what works, what doesn&apos;t, and what you want next.</p></div><form className="feedback-form" onSubmit={(event) => event.preventDefault()}><label>Name<input name="name" placeholder="Your name" /></label><label>Email<input name="email" type="email" placeholder="you@company.com" /></label><label>Message<textarea name="message" placeholder="What should we build next?" rows={3} /></label><button className="primary-button" type="submit">Send feedback <ArrowRight size={17} /></button></form></section>

      <section className="final-cta"><div><p className="eyebrow">The next step is yours</p><h2>Your next opportunity<br /><em>is out there.</em></h2><p>CareerOS helps you find it, understand it, and move toward it.</p><Link href="/register" className="primary-button">Get started <ArrowRight size={17} /></Link></div><Airplane className="final-plane" /></section>

      <footer className="landing-footer"><div><Logo /><p>Career Operating System<br />for modern job seekers.</p></div><div className="footer-links"><div><b>Product</b><a href="#what-we-do">Career Profile</a><a href="#what-we-do">Job Radar</a><a href="#what-we-do">Resume Intelligence</a></div><div><b>Resources</b><a href="#support">Help & Support</a><a href="#contact">Feedback</a><a href="#how-it-works">How it works</a></div><div><b>Company</b><a href="#contact">Contact</a><a href="/login">Sign in</a><a href="/register">Get started</a></div></div><p className="copyright">© 2026 CareerOS</p></footer>
    </main>
  );
}
