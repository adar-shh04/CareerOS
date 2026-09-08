---
name: careeros-frontend
description: >
  CareerOS-specific frontend architecture and implementation conventions.
  Use this skill when building, modifying, or reviewing any part of the
  CareerOS Next.js frontend (apps/web). This skill must be read before any
  CareerOS frontend task. It encodes the existing architecture, naming
  conventions, data fetching patterns, authentication model, and
  component organization specific to this codebase.
---

# CareerOS Frontend Conventions

This skill defines the rules and conventions for the CareerOS `apps/web` Next.js frontend. It **supplements** the generic skills (`nextjs`, `react`, `tailwind`, `feature-arch`, etc.) with CareerOS-specific invariants that agents must follow.

## Critical first step

Before writing any frontend code for CareerOS:

1. Inspect the relevant portion of `apps/web/` — do not assume structure from similar repos.
2. Trace the existing data fetching and routing patterns.
3. Check whether the component or page already exists partially.
4. Read `AGENTS.md` if you have not already.
5. Read `AI_CONTEXT.md` for architecture rules.

Never replace or restructure existing working architecture. Make the smallest correct change.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16, App Router |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| Runtime | React 19 |
| Package manager | pnpm |
| Monorepo | Turborepo |

---

## Authentication Model

CareerOS uses **Better Auth** with database-backed sessions (not JWTs).

- Session is validated server-side on every authenticated route.
- Active organization is tracked via `session.activeOrganizationId`.
- **Never assume an authenticated user has an active organization.**
- Always check `activeOrganizationId` presence before accessing workspace-scoped data.
- Never build custom auth flows. Better Auth manages sign-in, sign-up, sessions.

Frontend session access pattern:
```tsx
// Server Component or Route Handler
const session = await auth.api.getSession({ headers: await headers() });
if (!session?.user) redirect('/sign-in');
if (!session.session.activeOrganizationId) redirect('/onboarding');
const workspaceId = session.session.activeOrganizationId;
```

---

## API Communication

The CareerOS backend is a NestJS REST API running at `CAREEROS_API_URL` (server-side) or `NEXT_PUBLIC_APP_URL/api/*` (client-side via proxy).

### Server Components (preferred for initial page data)

```tsx
const res = await fetch(`${process.env.CAREEROS_API_URL}/workspaces/${workspaceId}/career-profile`, {
  headers: { cookie: ... },
  next: { revalidate: 60 },
});
const data = await res.json();
```

### Client Components (for interactive/mutating data)

Use **TanStack Query** for client-side data fetching and caching.

```tsx
const { data, isLoading, error } = useQuery({
  queryKey: ['career-profile', workspaceId],
  queryFn: () => apiClient.get(`/workspaces/${workspaceId}/career-profile`),
});
```

Never use raw `useEffect` + `useState` for server data fetching in new code.

---

## Multi-tenancy in the Frontend

- Every workspace-scoped API call must include `workspaceId` in the path.
- Never call `/career-profile` without a workspace prefix.
- Workspace ID comes from the active session — never hardcode or guess it.
- If `workspaceId` is missing, redirect to onboarding or surface a clear error state.

---

## Application Structure

```text
apps/web/
├── app/                      # Next.js App Router pages
│   ├── (auth)/               # Sign-in, sign-up, password reset
│   ├── (app)/                # Authenticated app shell
│   │   ├── onboarding/       # Onboarding flow
│   │   ├── dashboard/        # Dashboard
│   │   ├── profile/          # Career Profile
│   │   ├── jobs/             # Job Radar
│   │   ├── resume/           # Resume Studio
│   │   ├── applications/     # Applications CRM
│   │   └── insights/         # AI Insights + Career Handbook
│   └── api/                  # API routes (auth endpoints, proxy routes)
├── components/
│   ├── ui/                   # Shared primitive components (shadcn/ui pattern)
│   └── [feature]/            # Feature-specific components
├── lib/
│   ├── api.ts                # API client
│   ├── auth.ts               # Better Auth client config
│   └── query-client.ts       # TanStack Query configuration
└── types/                    # Shared TypeScript types
```

Follow this structure. Do not introduce a completely different directory layout.

---

## Forms

Use **React Hook Form** + **Zod** for all forms.

```tsx
const schema = z.object({ name: z.string().min(1) });
type FormValues = z.infer<typeof schema>;

const form = useForm<FormValues>({
  resolver: zodResolver(schema),
  defaultValues: { name: '' },
});
```

Never build uncontrolled ad-hoc form state without React Hook Form.

---

## Design Conventions

CareerOS UI is a professional productivity tool. See `frontend-production-shadcn` for the full ruleset. Key invariants:

- Use shadcn/ui component patterns (even if not yet fully installed).
- Tailwind v4: use CSS variables for custom tokens, not arbitrary values.
- All interactive states must be handled: loading, empty, error, disabled.
- No lorem ipsum. Use realistic placeholder data.
- No decorative gradients, blobs, or glassmorphism in app interior pages.
- Typography: body `text-sm`, headings `text-xl font-semibold tracking-tight`.

---

## Capability-Dependent UI Rules

CareerOS AI features may be unavailable (no AI provider configured). Frontend must:

- Always check the `available: boolean` field from AI endpoints.
- Show an honest, actionable message when `available: false` — never hide or crash.
- Never show a fake "loading" spinner forever when AI is unavailable.
- Provide a path to configure BYOK keys in Settings when AI is unavailable.

Example pattern:
```tsx
if (!data.available) {
  return <AIUnavailableBanner reason={data.reason} settingsHref="/settings/integrations" />;
}
```

---

## Checklist Before Submitting Frontend Work

- [ ] Inspected the existing implementation before writing new code
- [ ] Session and `activeOrganizationId` validated before workspace access
- [ ] All loading, empty, and error states implemented
- [ ] TypeScript strict-mode passes (no `any`, no unchecked assertions)
- [ ] Realistic data used in examples (no lorem ipsum, no fake metrics)
- [ ] Capability-unavailable state handled for AI-dependent features
- [ ] `pnpm check-types` passes in `apps/web`
- [ ] No new dependencies added without explicit user approval
