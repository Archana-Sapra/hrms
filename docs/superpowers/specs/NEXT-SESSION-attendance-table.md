# Next session: rebuild the attendance table

Copy everything below the line into a fresh Claude Code session.

---

Rebuild the attendance table in the HRMS employee directory, following the
conventions established by the employee directory redesign that is already
merged to `main`.

**Read these first, in this order:**

1. `docs/superpowers/specs/2026-08-22-employee-directory-redesign.md` — the spec
   the directory rebuild was built from. Its "Next Session: Attendance Table"
   section is the origin of this task; this file supersedes it where they differ.
2. `docs/superpowers/plans/2026-08-22-employee-directory-redesign.md` — the
   executed plan. Its Global Constraints and Existing API Reference sections
   still bind.
3. `frontend/src/components/hr/employeeDirectory/LeaveSection.tsx` — the
   canonical example of the house pattern you are to follow: cards below `md`,
   table from `md` up, `@theme` tokens, a confirm dialog for destructive actions.
4. `frontend/src/components/hr/employeeDirectory/components/ProfileFields.tsx`
   and `ProfileField.tsx` — how sections and field rows are laid out now.

## Scope

**In scope**, under `frontend/src/components/hr/employeeDirectory/attendance/`:

| File | Lines | Note |
|---|---|---|
| `AttendanceTable.tsx` | 1052 | the main target |
| `AttendanceAnalytics.tsx` | 204 | |
| `EditAttendanceModal.tsx` | 251 | |
| `TimeInput.tsx` | 114 | |

`../AttendanceSection.tsx` (37 lines) is a thin pass-through wrapper. Collapse it
if it earns nothing once the split is done.

**Out of scope.** Everything else in `employeeDirectory/` was rebuilt last
session and is settled. Do not reopen it. In particular do not touch
`EmployeeDirectory.tsx`, `ProfileField*.tsx`, `LeaveSection.tsx`,
`InactiveEmployees.tsx`, or `DocumentManager.tsx` except where a prop contract
genuinely forces it — and if it does, say so rather than editing silently.

## Where this code now renders — read before laying anything out

`AttendanceSection` used to render in a full-width detail pane. It now sits
inside a **tab** (`EmployeeProfile.tsx`, the "Attendance" tab), which is inside a
pane that scrolls internally. Two consequences:

- It is **narrower** than it was, and on mobile it renders at 375px inside a
  two-screen flow. A wide multi-column table will overflow. This is the single
  biggest thing to fix.
- **Do not add `min-h-screen`, `h-screen`, or a `position: fixed` bottom
  element.** The app shell at `frontend/src/components/Sidebar.tsx:288` owns the
  scroll container (`h-dvh`, `overflow-y-auto`) and already renders the mobile
  bottom bar plus its spacer at `Sidebar.tsx:293-302`. `DocumentManager` broke
  exactly this rule last session and had to be fixed — it kept `min-h-screen`
  from when it replaced the whole pane.

## Conventions this rebuild established — apply all of them

- **Split into focused components**, one clear purpose each, in a `components/`
  subfolder beside the feature; extract derivation into hooks. No file should
  approach 1,000 lines.
- **`@theme` tokens only**: `bg-card`, `bg-muted`, `text-muted-foreground`,
  `border-border`, `ring-ring`, `text-destructive`, `bg-popover`. **Never** raw
  `bg-white dark:bg-slate-800` or `text-gray-500` pairs. There are currently 35
  such lines across these four files (23 in `AttendanceTable.tsx` alone).
- **shadcn primitives** from `components/ui/`: `input`, `select`, `label`,
  `dialog`, `badge`, `button`, `tabs`, and `enhanced-datepicker` /
  `enhanced-calendar` for dates. Style their call sites with **layout classes
  only** (`mt-1`, `h-9`), never colours.
- **Mobile first**: cards below `md`, table from `md` up. Tap targets ≥44px on
  touch paths. Note `h-11` beats `size="sm"`'s `h-8` because `ui/button` passes
  `className` through `cn()` → `twMerge`, which removes the conflicting class.
- **Date-range state belongs in the URL**, not component state, so the view is
  shareable and the back button works. `EmployeeDirectory.tsx` already does this
  for employee selection and the active/inactive tab via `useSearchParams` —
  follow that pattern.
- **Accessibility**: real table semantics on desktop (`scope="col"`),
  keyboard-operable controls, accessible names on icon-only buttons,
  `aria-invalid` + `aria-describedby` on edit fields, `aria-hidden` on decorative
  icons.
- **React Compiler is enabled.** Do NOT add `useMemo` / `useCallback` /
  `React.memo` for performance.
- **Never call axios from a component**; use TanStack Query hooks in
  `src/hooks/queries/`. `useEffect` is not a data-fetching tool.

## Specific things to check and fix — verify each against the code, do not assume

1. **Is `updateTrigger` dead?** A `updateTrigger: number` counter is threaded
   from `EmployeeDirectory` → `AttendanceSection` → `AttendanceTable` purely to
   force refreshes. TanStack Query invalidation may already cover this. If it is
   redundant, remove it and the `attendanceTrigger` state in
   `EmployeeDirectory.tsx` — that is the one sanctioned edit to that file.
2. **Are attendance queries scoped server-side?** Last session found
   `useAllLeaves` was called with the filter as its whole options object, so
   `params` was `undefined` and the page fetched **every leave in the system**
   on each profile view, then filtered client-side. Check `useAttendance` for the
   same class of bug — same shape, same consequence.
3. **One `as any`** remains in `AttendanceTable.tsx`. Replace it with real
   narrowing, not a different cast.
4. Any `window.location.href` navigation that should be `navigate()`.
5. Any hook called with arguments its signature does not accept — last session
   found `useEmployee(id, { enabled })` passing a second argument the hook
   ignores.

## Verification — this project has NO test suite

CLAUDE.md is explicit: verify by type-checking, building, and exercising code
paths directly. Do not create test files or install a test runner.

**Current numbers on `main`, which must not increase:**

- Frontend `pnpm typecheck` → **89**
- Frontend `pnpm lint` → **146** (129 errors, 17 warnings)
- Backend `pnpm type-check` → **clean**
- `pnpm build` → succeeds

These are well below the CLAUDE.md baselines of 102 / 180 because last session
reduced them. **Report actual numbers**; do not claim a result you have not run.
`pnpm build` does not type-check — run `pnpm typecheck` separately.

Also confirm you introduce no `react-hooks/set-state-in-effect` errors. The count
is 24, all pre-existing, and **zero** are in `employeeDirectory/`. Keep it that
way — these are real cascading-render bugs, not noise.

**Package manager is pnpm. Never npm.**

## Browser verification

I could not run a browser last session, so no UI was ever exercised — every check
was static. If you also cannot, say so plainly rather than implying otherwise,
and hand the user this list:

- Attendance tab at 375px: does the table/cards layout fit without horizontal
  overflow?
- Changing the date range: does the URL update, and does the back button work?
- Editing an attendance record: does the modal save and the list refresh?
- Dark mode and light mode on the new components.

## Known open items in the wider feature (context, not your task)

Recorded from last session's final review, all deferred deliberately:

- `role="listbox"` with an interactive child in `EmployeeList.tsx` is invalid
  ARIA; should become a plain `ul`/`li` with `aria-current`.
- The backend leave filter returns **all** leaves if the employee lookup misses
  (`backend/controllers/leave.controllers.ts:168-173`) — pre-existing, but the
  frontend's client-side safety net was removed.
- `ProfileHeader`'s overflow menu is not Escape-dismissable.
- Employment-type filter is unreachable on desktop (inline row omits it; the
  sheet trigger is `lg:hidden`).
- Directory search matches name only, not email or employee ID.
- `EmployeeLink.tsx` and `AddEmployee.tsx` still use hardcoded colours — never in
  scope, now visually inconsistent with their rebuilt siblings.

Do not fix these as part of the attendance work. Mention it if one blocks you.

## Process

Use the superpowers workflow: brainstorm the approach with me first, then a
written plan, then execute it task by task with a review after each. Do not start
editing code before we have agreed on the design.
