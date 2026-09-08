"use client";

import { Bell, BriefcaseBusiness, ChevronLeft, ChevronRight, Command, FileText, FolderKanban, LayoutDashboard, Menu, MoreHorizontal, PanelRight, Search, Settings, Sparkles, Target, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const paletteInputRef = useRef<HTMLInputElement>(null);
  const current = nav.find((item) => item.path === pathname) ?? nav[0];
  const primaryNav = [nav[0], nav[1], nav[2], nav[4]];
  const moreNav = [nav[3], nav[5], nav[6], nav[7]];
  const filteredCommands = useMemo(() => nav.filter((item) => item.label.toLowerCase().includes(query.trim().toLowerCase())), [query]);
  const go = useCallback((path: string) => router.push(path), [router]);
  const settingsItem = nav[7];

  useEffect(() => {
    const saved = window.localStorage.getItem("careeros-sidebar-collapsed");
    if (saved === "true") setCollapsed(true);
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setPaletteOpen(true); setSelectedIndex(0); }
      if (!paletteOpen) return;
      if (event.key === "Escape") { event.preventDefault(); setPaletteOpen(false); setQuery(""); return; }
      if (event.key === "ArrowDown") { event.preventDefault(); setSelectedIndex((index) => filteredCommands.length ? (index + 1) % filteredCommands.length : 0); }
      if (event.key === "ArrowUp") { event.preventDefault(); setSelectedIndex((index) => filteredCommands.length ? (index - 1 + filteredCommands.length) % filteredCommands.length : 0); }
      if (event.key === "Enter" && filteredCommands[selectedIndex]) { event.preventDefault(); setPaletteOpen(false); setQuery(""); go(filteredCommands[selectedIndex].path); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [filteredCommands, go, paletteOpen, selectedIndex]);

  useEffect(() => {
    if (paletteOpen) {
      setSelectedIndex(0);
      window.requestAnimationFrame(() => paletteInputRef.current?.focus());
    }
  }, [paletteOpen, query]);

  const setSidebar = () => { const next = !collapsed; setCollapsed(next); window.localStorage.setItem("careeros-sidebar-collapsed", String(next)); };
  return <div className={`workspace-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
    <aside className="workspace-sidebar">
      <div className="workspace-brand"><div className="brand-mark">C</div>{!collapsed && <div><strong>CareerOS</strong><span>Personal workspace</span></div>}</div>
      <div className="workspace-switcher"><span className="workspace-dot" />{!collapsed && <><span>Personal</span><ChevronRight aria-hidden="true" /></>}</div>
      <nav className="workspace-nav" aria-label="Primary navigation">{nav.slice(0, 5).map((item) => <NavItem key={item.path} item={item} active={pathname === item.path} collapsed={collapsed} onClick={() => go(item.path)} />)}<div className="nav-divider" />{nav.slice(5, 7).map((item) => <NavItem key={item.path} item={item} active={pathname === item.path} collapsed={collapsed} onClick={() => go(item.path)} />)}</nav>
      <div className="sidebar-bottom">{settingsItem && <NavItem item={settingsItem} active={pathname === settingsItem.path} collapsed={collapsed} onClick={() => go(settingsItem.path)} />}<button className="sidebar-user" onClick={() => setMoreOpen((value) => !value)} aria-label="Open user menu"><span className="avatar">AM</span>{!collapsed && <span><strong>Alex Morgan</strong><small>Account menu</small></span>}</button><button className="collapse-button" onClick={setSidebar} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>{collapsed ? <ChevronRight aria-hidden="true" /> : <ChevronLeft aria-hidden="true" />}</button></div>
      {moreOpen && <div className="user-menu"><strong>Alex Morgan</strong><span>alex@example.com</span><button onClick={() => go("/settings")}>Settings</button><button onClick={() => go("/settings")}>API keys</button><button>Sign out</button></div>}
    </aside>
    <main className="workspace-main"><header className="workspace-topbar"><button className="mobile-menu icon-button" onClick={() => setMobileMenuOpen(true)} aria-label="Open navigation"><Menu aria-hidden="true" /></button><div><span className="breadcrumb">CareerOS / Workspace</span><h1>{current?.label}</h1></div><div className="topbar-actions"><button className="command-trigger" onClick={() => setPaletteOpen(true)}><Search aria-hidden="true" /><span>Search or jump to…</span><kbd><Command aria-hidden="true" /> K</kbd></button><button className="icon-button" onClick={() => setNotificationsOpen((value) => !value)} aria-label="Open notifications"><Bell aria-hidden="true" /><span className="unread-dot" /></button><button className="icon-button coach-trigger" onClick={() => setCoachOpen(true)} aria-label="Open contextual AI Coach"><Sparkles aria-hidden="true" /></button></div>{notificationsOpen && <Notifications onClose={() => setNotificationsOpen(false)} />}</header><div className="workspace-content">{children}</div></main>
    {mobileMenuOpen && <div className="mobile-drawer-backdrop" onClick={() => setMobileMenuOpen(false)}><aside className="mobile-drawer" aria-label="Mobile navigation" onClick={(event) => event.stopPropagation()}><div className="popover-heading"><strong>CareerOS</strong><button className="icon-button" onClick={() => setMobileMenuOpen(false)} aria-label="Close navigation"><X aria-hidden="true" /></button></div>{nav.map((item) => <NavItem key={item.path} item={item} active={pathname === item.path} collapsed={false} onClick={() => { setMobileMenuOpen(false); go(item.path); }} />)}</aside></div>}
    <nav className="mobile-tabs" aria-label="Mobile navigation">{primaryNav.map((item) => <NavItem key={item.path} item={item} active={pathname === item.path} collapsed onClick={() => go(item.path)} />)}<button className={`mobile-tab ${moreOpen ? "active" : ""}`} onClick={() => setMoreOpen((value) => !value)}><MoreHorizontal aria-hidden="true" /><span>More</span></button></nav>
    {moreOpen && <div className="mobile-more-menu" role="menu">{moreNav.map((item) => <button key={item.path} role="menuitem" onClick={() => { setMoreOpen(false); go(item.path); }}><item.icon aria-hidden="true" /><span>{item.label}</span></button>)}</div>}
    {coachOpen && <aside className="contextual-panel"><div className="contextual-header"><div><p className="eyebrow">CareerOS intelligence</p><h2>Contextual Coach</h2></div><button className="icon-button" onClick={() => setCoachOpen(false)} aria-label="Close Coach"><X aria-hidden="true" /></button></div><div className="contextual-body"><Sparkles aria-hidden="true" /><h3>Make the next decision clearer.</h3><p>This panel stays attached to the work you are doing. Open a match explanation or ask about your career evidence.</p><button className="button-secondary" onClick={() => { setCoachOpen(false); go("/ai-coach"); }}>Open AI Coach</button></div></aside>}
    {paletteOpen && <div className="palette-backdrop" onClick={() => setPaletteOpen(false)}><div className="command-palette" role="dialog" aria-modal="true" aria-label="Command palette" onClick={(event) => event.stopPropagation()}><div className="palette-search"><Search aria-hidden="true" /><input ref={paletteInputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search or jump to…" aria-label="Search commands" /></div><div className="palette-list" role="listbox" aria-label="Navigation commands">{filteredCommands.map((item, index) => { const Icon = item.icon; return <button key={item.path} role="option" aria-selected={index === selectedIndex} className={index === selectedIndex ? "command-selected" : ""} onMouseEnter={() => setSelectedIndex(index)} onClick={() => { setPaletteOpen(false); setQuery(""); go(item.path); }}><Icon aria-hidden="true" /><span>{item.label}</span><ChevronRight aria-hidden="true" /></button>; })}{filteredCommands.length === 0 && <p className="palette-empty">No matching commands</p>}</div><div className="palette-footer">Use <kbd>↑</kbd> <kbd>↓</kbd> to navigate · <kbd>Enter</kbd> to select · <kbd>Esc</kbd> to close</div></div></div>}
  </div>;
}

function NavItem({ item, active, collapsed, onClick }: { item: typeof nav[number]; active: boolean; collapsed: boolean; onClick: () => void }) { const Icon = item.icon; return <button className={`nav-item ${active ? "active" : ""}`} onClick={onClick} title={collapsed ? item.label : undefined}><Icon aria-hidden="true" />{!collapsed && <span>{item.label}</span>}</button>; }
function Notifications({ onClose }: { onClose: () => void }) { return <div className="notifications"><div className="popover-heading"><strong>Notifications</strong><button onClick={onClose} aria-label="Close notifications"><X aria-hidden="true" /></button></div><div className="notification-group"><span>Job matches</span><p><strong>Northstar Labs</strong> is a new high-fit match.</p></div><div className="notification-group"><span>Profile suggestions</span><p>Coach found one piece of evidence to surface.</p></div><div className="notification-group"><span>Application updates</span><p>No new updates. You are clear.</p></div></div>; }
