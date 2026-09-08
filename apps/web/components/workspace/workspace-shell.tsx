"use client";

import { Bell, BriefcaseBusiness, ChevronLeft, ChevronRight, Command, FileText, FolderKanban, LayoutDashboard, Menu, MoreHorizontal, PanelRight, Search, Settings, Sparkles, Target, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import type React from "react";
import { useCallback, useEffect, useState } from "react";

const nav = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Job Radar", path: "/jobs", icon: BriefcaseBusiness },
  { label: "Resume Studio", path: "/resume-studio", icon: FileText },
  { label: "Career Profile", path: "/career-profile", icon: FolderKanban },
  { label: "Applications", path: "/applications", icon: Target },
  { label: "Insights", path: "/insights", icon: Sparkles },
  { label: "AI Coach", path: "/ai-coach", icon: PanelRight },
  { label: "Settings", path: "/settings", icon: Settings },
];

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [coachOpen, setCoachOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const current = nav.find((item) => item.path === pathname) ?? nav[0];
  const go = useCallback((path: string) => router.push(path), [router]);
  const settingsItem = nav[7];

  useEffect(() => {
    const saved = window.localStorage.getItem("careeros-sidebar-collapsed");
    if (saved === "true") setCollapsed(true);
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setPaletteOpen(true); }
      if (event.key === "Escape") { setPaletteOpen(false); setNotificationsOpen(false); setMoreOpen(false); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const setSidebar = () => { const next = !collapsed; setCollapsed(next); window.localStorage.setItem("careeros-sidebar-collapsed", String(next)); };
  return <div className={`workspace-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
    <aside className="workspace-sidebar">
      <div className="workspace-brand"><div className="brand-mark">C</div>{!collapsed && <div><strong>CareerOS</strong><span>Personal workspace</span></div>}</div>
      <div className="workspace-switcher"><span className="workspace-dot" />{!collapsed && <><span>Personal</span><ChevronRight aria-hidden="true" /></>}</div>
      <nav className="workspace-nav" aria-label="Primary navigation">{nav.slice(0, 5).map((item) => <NavItem key={item.path} item={item} active={pathname === item.path} collapsed={collapsed} onClick={() => go(item.path)} />)}<div className="nav-divider" />{nav.slice(5, 7).map((item) => <NavItem key={item.path} item={item} active={pathname === item.path} collapsed={collapsed} onClick={() => go(item.path)} />)}</nav>
      <div className="sidebar-bottom">{settingsItem && <NavItem item={settingsItem} active={pathname === settingsItem.path} collapsed={collapsed} onClick={() => go(settingsItem.path)} />}<button className="sidebar-user" onClick={() => setMoreOpen((value) => !value)} aria-label="Open user menu"><span className="avatar">AM</span>{!collapsed && <span><strong>Alex Morgan</strong><small>Account menu</small></span>}</button><button className="collapse-button" onClick={setSidebar} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>{collapsed ? <ChevronRight aria-hidden="true" /> : <ChevronLeft aria-hidden="true" />}</button></div>
      {moreOpen && <div className="user-menu"><strong>Alex Morgan</strong><span>alex@example.com</span><button onClick={() => go("/settings")}>Settings</button><button onClick={() => go("/settings")}>API keys</button><button>Sign out</button></div>}
    </aside>
    <main className="workspace-main"><header className="workspace-topbar"><div className="mobile-menu"><Menu aria-hidden="true" /></div><div><span className="breadcrumb">CareerOS / Workspace</span><h1>{current?.label}</h1></div><div className="topbar-actions"><button className="command-trigger" onClick={() => setPaletteOpen(true)}><Search aria-hidden="true" /><span>Search or jump to…</span><kbd><Command aria-hidden="true" /> K</kbd></button><button className="icon-button" onClick={() => setNotificationsOpen((value) => !value)} aria-label="Open notifications"><Bell aria-hidden="true" /><span className="unread-dot" /></button><button className="icon-button coach-trigger" onClick={() => setCoachOpen(true)} aria-label="Open contextual AI Coach"><Sparkles aria-hidden="true" /></button></div>{notificationsOpen && <Notifications onClose={() => setNotificationsOpen(false)} />}</header><div className="workspace-content">{children}</div></main>
    <nav className="mobile-tabs" aria-label="Mobile navigation">{nav.slice(0, 4).map((item) => <NavItem key={item.path} item={item} active={pathname === item.path} collapsed onClick={() => go(item.path)} />)}<button className={`mobile-tab ${moreOpen ? "active" : ""}`} onClick={() => setMoreOpen((value) => !value)}><MoreHorizontal aria-hidden="true" /><span>More</span></button></nav>
    {coachOpen && <aside className="contextual-panel"><div className="contextual-header"><div><p className="eyebrow">CareerOS intelligence</p><h2>Contextual Coach</h2></div><button className="icon-button" onClick={() => setCoachOpen(false)} aria-label="Close Coach"><X aria-hidden="true" /></button></div><div className="contextual-body"><Sparkles aria-hidden="true" /><h3>Make the next decision clearer.</h3><p>This panel stays attached to the work you are doing. Open a match explanation or ask about your career evidence.</p><button className="button-secondary" onClick={() => { setCoachOpen(false); go("/ai-coach"); }}>Open AI Coach</button></div></aside>}
    {paletteOpen && <div className="palette-backdrop" onClick={() => setPaletteOpen(false)}><div className="command-palette" role="dialog" aria-modal="true" aria-label="Command palette" onClick={(event) => event.stopPropagation()}><div className="palette-search"><Search aria-hidden="true" /><input autoFocus placeholder="Search or jump to…" aria-label="Search commands" /></div><div className="palette-list">{nav.map((item) => { const Icon = item.icon; return <button key={item.path} onClick={() => { setPaletteOpen(false); go(item.path); }}><Icon aria-hidden="true" /><span>{item.label}</span><ChevronRight aria-hidden="true" /></button>; })}</div><div className="palette-footer">Use <kbd>↑</kbd> <kbd>↓</kbd> to navigate · <kbd>Enter</kbd> to select · <kbd>Esc</kbd> to close</div></div></div>}
  </div>;
}

function NavItem({ item, active, collapsed, onClick }: { item: typeof nav[number]; active: boolean; collapsed: boolean; onClick: () => void }) { const Icon = item.icon; return <button className={`nav-item ${active ? "active" : ""}`} onClick={onClick} title={collapsed ? item.label : undefined}><Icon aria-hidden="true" />{!collapsed && <span>{item.label}</span>}</button>; }
function Notifications({ onClose }: { onClose: () => void }) { return <div className="notifications"><div className="popover-heading"><strong>Notifications</strong><button onClick={onClose} aria-label="Close notifications"><X aria-hidden="true" /></button></div><div className="notification-group"><span>Job matches</span><p><strong>Northstar Labs</strong> is a new high-fit match.</p></div><div className="notification-group"><span>Profile suggestions</span><p>Coach found one piece of evidence to surface.</p></div><div className="notification-group"><span>Application updates</span><p>No new updates. You are clear.</p></div></div>; }
