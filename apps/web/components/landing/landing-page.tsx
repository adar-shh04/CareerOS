import Link from "next/link";
import {
  ArrowRight,
  Check,
  Compass,
  FileText,
  LifeBuoy,
  Map,
  MessageSquare,
  Radar,
  Route,
  Send,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";

const modules = [
  { icon: Compass, title: "Career Profile", text: "Build a living source of truth for your experience, strengths, goals, and next direction." },
  { icon: Radar, title: "Job Radar", text: "Discover relevant roles across your sources without losing the context behind each opportunity." },
  { icon: Target, title: "Explainable Fit", text: "See skills matched, skills missing, experience, seniority, location, and role alignment." },
  { icon: FileText, title: "Resume Intelligence", text: "Keep a durable master profile and create multiple targeted resume versions for thoughtful applications." },
  { icon: Route, title: "Application CRM", text: "Track applications, conversations, interviews, artifacts, and next actions in one connected system." },
  { icon: TrendingUp, title: "Learn & Grow", text: "Turn outcomes and job-market evidence into a practical roadmap for your next milestone." },
];

const journey = ["Profile", "Discover", "Understand fit", "Optimize", "Apply", "Track", "Learn", "Grow"];

export default function LandingPage() {
  return (
    <main className="landing-page">
      <header className="landing-nav">
        <Link className="brand" href="/" aria-label="CareerOS home">
          <span className="brand-mark"><Compass aria-hidden="true" /></span>
          <span>Career<span>OS</span></span>
        </Link>
        <nav className="desktop-nav" aria-label="Primary navigation">
          <a href="#what-we-do">What we do</a><a href="#how-it-works">How it works</a><a href="#growth">Growth</a><a href="#help-support">Help &amp; support</a>
        </nav>
        <div className="nav-actions"><Link className="text-link" href="/login">Sign in</Link><Link className="button button-small" href="/register">Get started <ArrowRight aria-hidden="true" /></Link></div>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow"><span className="eyebrow-dot" /> Your career, with direction</p>
          <h1 id="hero-title">A clearer route to the work <em>you&apos;re meant for.</em></h1>
          <p className="hero-lede">CareerOS is an intelligent Career Operating System that brings your profile, opportunities, applications, and growth into one thoughtful workspace.</p>
          <div className="hero-actions"><Link className="button" href="/register">Build your career system <ArrowRight aria-hidden="true" /></Link><a className="button button-quiet" href="#what-we-do">Explore what we do <Map aria-hidden="true" /></a></div>
          <div className="trust-line"><Check aria-hidden="true" /> User-led. Explainable. Built for progress.</div>
        </div>
        <div className="hero-art" aria-label="Paper airplanes following a route through a bright career sky" role="img">
          <div className="sun-ring" /><div className="cloud cloud-one" /><div className="cloud cloud-two" /><div className="route-line" /><Send className="plane plane-one" aria-hidden="true" /><Send className="plane plane-two" aria-hidden="true" /><div className="destination"><Target aria-hidden="true" /><span>your next chapter</span></div>
        </div>
      </section>

      <section className="intro-section" id="what-we-do"><div className="section-heading"><p className="eyebrow">One system. The whole journey.</p><h2>Everything you need to move with intention.</h2><p>CareerOS replaces scattered tabs and one-off tools with a connected operating layer for the decisions that shape your career.</p></div><div className="module-grid">{modules.map(({ icon: Icon, title, text }) => <article className="module-card" key={title}><div className="module-icon"><Icon aria-hidden="true" /></div><h3>{title}</h3><p>{text}</p><ArrowRight className="card-arrow" aria-hidden="true" /></article>)}</div></section>

      <section className="journey-section" id="how-it-works"><div className="journey-art"><div className="compass"><Compass aria-hidden="true" /><span>N</span><span>E</span><span>S</span><span>W</span></div><div className="orbit orbit-a" /><div className="orbit orbit-b" /></div><div className="journey-copy"><p className="eyebrow">The flight path</p><h2>From where you are to where you want to go.</h2><p>Your career isn&apos;t a straight line. CareerOS helps you see the signal, choose the next move, and keep learning from every step.</p><div className="journey-list">{journey.map((item, index) => <div className="journey-step" key={item}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item}</strong>{index < journey.length - 1 ? <i aria-hidden="true" /> : null}</div>)}</div></div></section>

      <section className="growth-section" id="growth"><div><p className="eyebrow">Career horizon</p><h2>Make progress visible. Make growth repeatable.</h2><p>Whether you are exploring, switching lanes, or stepping up, your workspace should remember what matters and show you what&apos;s next.</p><Link className="button" href="/register">Find your direction <ArrowRight aria-hidden="true" /></Link></div><div className="horizon-art"><div className="mountain mountain-back" /><div className="mountain mountain-front" /><div className="milestone milestone-one">Profile</div><div className="milestone milestone-two">Momentum</div><div className="milestone milestone-three">Horizon</div></div></section>

      <section className="support-section" id="help-support"><div className="support-card"><div className="module-icon"><LifeBuoy aria-hidden="true" /></div><p className="eyebrow">Help &amp; support</p><h2>A steady signal when the path gets noisy.</h2><p>Career decisions are personal. CareerOS keeps recommendations understandable, actions reviewable, and you in control of every send, apply, and final decision.</p><a className="inline-link" href="#contact">Talk with the team <ArrowRight aria-hidden="true" /></a></div><div className="feedback-card" id="feedback"><MessageSquare aria-hidden="true" /><p className="eyebrow">Feedback shapes the roadmap</p><h3>What would make your next move easier?</h3><form><label htmlFor="feedback-message">Your feedback</label><textarea id="feedback-message" name="feedback" placeholder="Tell us what you need from your career OS..." /><button className="button" type="submit">Share feedback <Send aria-hidden="true" /></button></form></div></section>

      <section className="contact-section" id="contact"><div><p className="eyebrow">Start a conversation</p><h2>Build a better way forward.</h2><p>Questions, ideas, or partnership thoughts? We&apos;d love to hear what you&apos;re building toward.</p></div><form className="contact-form"><div className="form-row"><label>Full name<input name="name" type="text" placeholder="Your name" /></label><label>Email<input name="email" type="email" placeholder="you@example.com" /></label></div><label>Message<textarea name="message" placeholder="How can we help?" /></label><button className="button" type="submit">Send message <ArrowRight aria-hidden="true" /></button></form></section>

      <section className="final-cta"><Sparkles aria-hidden="true" /><h2>Your next chapter deserves a system.</h2><p>Start with clarity. Move with confidence.</p><Link className="button button-dark" href="/register">Get started with CareerOS <ArrowRight aria-hidden="true" /></Link></section>
      <footer className="landing-footer"><Link className="brand" href="/"><span className="brand-mark"><Compass aria-hidden="true" /></span><span>Career<span>OS</span></span></Link><p>Intelligent infrastructure for intentional careers.</p><div><a href="#what-we-do">What we do</a><a href="#contact">Contact</a><Link href="/login">Sign in</Link></div></footer>
    </main>
  );
}
