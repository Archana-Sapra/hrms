# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repository.

## Commands

**Package manager is pnpm.** Do not use npm.

```bash
# backend (Node 22 / Express 5 / TS, ESM)
pnpm dev / build / start
pnpm type-check          # tsc --noEmit — this is the backend's "lint"

# frontend (React 19 / Vite / TS)
pnpm dev / build
pnpm typecheck           # tsc -p tsconfig.app.json --noEmit
pnpm lint

# stop backend (Windows)
netstat -ano | findstr :4000 && taskkill //F //PID <pid>
```

## Before claiming done

- **`pnpm build` on the frontend does not type-check.** A successful `vite build`
  proves nothing about types. Run `pnpm typecheck` and `pnpm lint` and report
  actual numbers against these baselines: **typecheck 102**, **lint 180**
  (161 errors, 19 warnings). Don't increase them; reduce where you touch a file.
- **There is no test suite.** Verify by type-checking, building, and exercising
  code paths directly.
- The backend type-checks and builds clean. Keep it that way.
- `react-hooks/set-state-in-effect` lint errors are real bugs (cascading
  renders), not noise.

## Auth

- Roles: `admin`, `hr`, `employee`.
- **JWT** in `localStorage` via `frontend/src/lib/tokenStorage.ts`. Deliberately
  not httpOnly — tokens are pulled out for CLI/script testing.
- bcrypt (cost 10) in `controllers/user.controllers.ts`.
- **Backend guard** `middlewares/auth.middleware.ts` — `authMiddleware([roles])`.
  Re-checks `User.isActive`, and for `employee` that the linked `Employee` is
  active, so unlink/deactivate take effect without re-login. Costs 1–2 DB reads
  per request.
- **Frontend guard** `components/auth/RequireRole.tsx`, wired in `main.tsx`.
  Intentionally **synchronous** (decodes the in-memory JWT) — never make it
  fetch, or every navigation pays a round trip. The backend is the real security
  boundary; this only avoids rendering a shell that would 403.

## Request validation — the rule

**Every route that reads a request body validates it with Zod first.** No
exceptions.

```
routes/x.routes.ts   router.post('/', authMiddleware([...]), validateBody(schema), handler)
validators/*.ts      schema + exported z.infer type
controllers/x.ts     const { ... } = req.body as SomeInput;   // guaranteed by middleware
```

- `middlewares/zodValidation.middleware.ts` — `validateBody`, `validateQuery`,
  `validateParams`, `validate`.
- **Express 5: `req.query` is getter-only.** Never assign to it. `validateQuery`
  / `validateParams` expose results on `req.validatedQuery` /
  `req.validatedParams`; read via `getValidatedQuery<T>(req)`.
- Schemas in `backend/validators/`, by domain: `common`, `auth`, `employee`,
  `request` (leave/WFH/regularization/expense), `salary`, `settings`, `content`,
  `hr`, `attendance`. Shared primitives go in `common.schemas.ts`.
- **Never write `req.body as { inline: string }`** — an assertion with no runtime
  check. Add a schema.
- Zod is **v4** both sides: `z.email()` not `z.string().email()`; errors are on
  `error.issues` not `error.errors`.

## Comments — write almost none

Default to **zero comments**. Code says what it does; a comment must earn its
line. The bar: *would someone break this if the comment weren't there?*

Worth keeping:

- A non-obvious constraint or footgun — "Express 5: `req.query` is getter-only",
  "employeeId contains slashes, never regex it".
- Why a deliberate choice that looks wrong **is** right, when the next person
  would otherwise "fix" it.
- A short doc comment on an exported helper whose contract isn't obvious from
  the signature.

Delete on sight:

- Narration of the diff — "this used to be X", "previously both sat at the same
  weight", "now uses tokens". That belongs in the commit message, not the file.
- Restating the code: `// map over employees` above a `.map`.
- Design-rationale essays. One clause, not a paragraph.
- Section banners and decorative dividers.

Prefer a clear name over a comment explaining a murky one. When a comment is
warranted, one line beats five.

## Backend

- Route params are typed `string | string[]` (path-to-regexp v8). Narrow with
  `paramValue(req.params.x)` from `utils/helpers.ts` — do not cast.
- JSON body limit 1mb. `/api/documents` is mounted **before** `express.json()`
  and uses multer, so uploads bypass it.
- Mongoose 8, one model per file. **`.lean()` on read-only queries**; not where
  you then `.save()`. Prefer projections for existence checks.
- Email via **Resend**, Web Push via `services/pushService.ts`. Scheduling is
  in-process **node-cron** (`schedulerService.ts`) — not a queue, because this
  runs as a single Railway instance. Horizontal scaling would double-fire jobs.

## Frontend

- **TanStack Query v5 is the only sanctioned way to talk to the API.** Hooks in
  `src/hooks/queries/` (one file per domain); keys in `lib/queryKeys.ts`; paths
  in `lib/apiEndpoints.ts`. `lib/axios.ts` is the single instance (bearer token,
  refresh, 401/403 redirect).
- **Never call axios from a component**, and `useEffect` is not a data-fetching
  tool — add or extend a query hook.
- `src/components/` is feature-first: `dashboard/`, `hr/`, `employee/`, `ui/`,
  `auth/`. `src/services/` is for non-API browser services; there is no
  `src/service/` (singular) — do not recreate it.
- **Tailwind v4, CSS-first.** Tokens live in the `@theme` block of
  `src/index.css`. **There is no `tailwind.config.js`** — adding one does
  nothing, the v4 Vite plugin ignores it.
- **React Compiler is enabled** (`vite.config.js`). Do not add
  `useMemo`/`useCallback`/`React.memo` for performance by default.

## UI conventions

- Modals: use `ui/dialog` (22 files do). Remaining `fixed inset-0` matches are
  overlays, full-screen banners, and `ui/BusyOverlay` — not modals.
- Form controls: `ui/input`, `ui/textarea`, `ui/select`, `ui/checkbox`,
  `ui/label`. `ui/textarea` has a `bare` variant for composers with their own
  chrome. `input` and `textarea` are on `@theme` tokens — style call sites with
  **layout classes only** (`mt-1`, `h-40`), never colors, or you fight the
  component.
- Dates: `enhanced-datepicker` (input + popover), `enhanced-calendar` (grid),
  `enhanced-date-field` (bounded `dob`/`joining`). `enhanced-calendar` replaces
  the stock shadcn `calendar` because it adds **month/year dropdowns** — without
  them, DOB entry means paging month-by-month to 1990. Don't reintroduce stock.
- Style from `@theme` tokens (`bg-card`, `text-muted-foreground`,
  `border-border`, `ring-ring`, `text-destructive`), **not** raw
  `bg-white dark:bg-slate-800` / `text-gray-500` pairs — which is still what most
  untouched files do. Prefer the real shadcn primitive and collapse duplicates
  over adding a variant. Accessibility coverage is low; improve it as you go.

## Business rules

- **Attendance**: no check-in = Absent unless on approved leave. Working-day
  math excludes weekends and holidays.
- **Salary**: old and new Indian tax regimes, TDS from the structure.
  `SalaryStructure` (recurring) and `SalarySlip` (monthly) are managed
  independently. Draft → Finalized gates employee visibility.
- **Permissions**: Admin everything incl. user management; HR employees,
  attendance, salary structures/slips, publish/unpublish; Employee own data only.

## Adding a feature

**Backend**: model → **Zod schema in `validators/`** → controller → route with
`authMiddleware` + `validateBody` → `pnpm type-check`.

**Frontend**: query hook (+ key, + endpoint) → component → route in `main.tsx`,
wrapped in `RequireRole` if admin/HR-only → `pnpm typecheck` and `pnpm lint`.

## Deployment

Frontend on Vercel, backend on Railway. CORS origins from
`CORS_ALLOWED_ORIGINS` (comma-separated), hardcoded fallback in `server.ts`.
