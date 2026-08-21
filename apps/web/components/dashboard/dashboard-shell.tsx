"use client";

import { BrainCircuit, BriefcaseBusiness, Compass, FileText, Menu, Settings2, UserRound, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import type { PropsWithChildren } from "react";
import { useState } from "react";

const navigation = [
  { href: "/dashboard", label: "Command center", icon: Compass },
  { href: "/jobs", label: "Job radar", icon: BriefcaseBusiness },
  { href: "/resume", label: "Resume studio", icon: FileText },
];

export function DashboardShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground lg:flex">
      <aside className={`${mobileOpen ? "translate-x-0" : "-translate-x-full"} fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-background px-5 py-6 transition-transform lg:static lg:translate-x-0`}>
        <div className="flex items-center justify-between">
          <button className="flex items-center gap-3 text-left" onClick={() => router.push("/dashboard")} aria-label="Go to CareerOS command center">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-background"><BrainCircuit className="size-5" /></span>
            <span><span className="block text-sm font-semibold tracking-tight">CareerOS</span><span className="block text-xs text-muted-foreground">Career intelligence</span></span>
          </button>
          <button className="rounded-md p-2 text-muted-foreground lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X className="size-5" /></button>
        </div>
        <div className="mt-10 rounded-lg border border-border bg-card px-3 py-3"><p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Workspace</p><p className="mt-1 truncate text-sm font-medium">Personal workspace</p></div>
        <nav className="mt-8 flex flex-1 flex-col gap-1" aria-label="Primary navigation">
          <p className="mb-2 px-3 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Work surface</p>
          {navigation.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return <button key={href} onClick={() => { router.push(href); setMobileOpen(false); }} className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors ${active ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:bg-card hover:text-foreground"}`} aria-current={active ? "page" : undefined}><Icon className="size-4" />{label}</button>;
          })}
          <div className="mt-auto border-t border-border pt-4"><button className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted-foreground hover:bg-card hover:text-foreground"><UserRound className="size-4" />Career profile</button><button className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted-foreground hover:bg-card hover:text-foreground"><Settings2 className="size-4" />Settings</button></div>
        </nav>
        <div className="border-t border-border pt-4 text-xs leading-5 text-muted-foreground">Evidence before action. You stay in control.</div>
      </aside>
      {mobileOpen && <button className="fixed inset-0 z-40 bg-background/70 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation overlay" />}
      <div className="min-w-0 flex-1"><header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur lg:px-8"><button className="rounded-md p-2 text-muted-foreground lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu className="size-5" /></button><div className="hidden items-center gap-2 text-sm text-muted-foreground lg:flex"><span className="size-1.5 rounded-full bg-accent-emerald" />Systems operational</div><div className="ml-auto flex items-center gap-3"><span className="hidden text-sm text-muted-foreground sm:inline">Adarsh Singh</span><span className="flex size-8 items-center justify-center rounded-full border border-border bg-card text-xs font-semibold">AS</span></div></header><main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-10">{children}</main></div>
    </div>
  );
}
