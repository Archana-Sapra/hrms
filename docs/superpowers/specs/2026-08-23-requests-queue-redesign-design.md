# Manage Requests — Queue Redesign

Date: 2026-08-23
Status: Awaiting review

## Problem

`frontend/src/components/hr/AdminRequestsPage.tsx` is a 1,003-line component
that renders an approvals inbox as a blog feed. It has four classes of problem.

**It is far too sparse for its job.** Every request is a `Card` with `p-6`, a
40px icon tile, a title, a description, a metadata row and a bordered footer
holding a single button — roughly 250px of vertical space to convey five
fields. At the 63 pending requests currently in the system that is a ~15,000px
scroll, about 16 screens, with three requests visible at a time. On the
Regularization tab all 50 rows carry the same clock icon and the identical
title "Attendance Regularization": the tile and the heading spend the most
prominent space on the page on zero information, because the tab already said
it.

**The action model is inverted.** The default state of a row is a button that
reveals an edit form in place (lines 969–979). Approving one clean request is
five interactions — click "Review Request", open a `Select`, pick "Approved",
click "Save" — two of which are pure navigation. This is a CRUD edit form
bolted onto what is actually a decision queue. HR reports that details are
almost never read before deciding, so the 90% case should be one click.

**The one feature that would solve the volume problem is unreachable.** A
per-row checkbox and a sticky bulk bar exist (lines 825–835, 754–767) but there
is no select-all, so bulk-approving 50 regularizations means 50 individual
clicks spread across 16 screens of scrolling.

**Decision-relevant signal is discarded or buried.** `daysWaiting` is computed
(line 50) and rendered only past three days, at the end of a wrapping metadata
row. Sorting is hardcoded to `createdAt` descending (line 386) with no control,
so the oldest and most urgent requests sit at the bottom of the scroll. And the
`UnifiedRequest` flattening throws away the fields that would make each row
decision-ready — see "Type-Aware Rows" below.

## Goals

Rebuild Manage Requests as a dense, scannable queue where the common case —
approve on sight — costs one click, and clearing a batch costs three. Keep all
five request types on one page. Correct the backend defects found while
surveying the domains rather than porting them.

Non-goal: changing who may approve what, or the underlying approval semantics
of any request type.

## Scope

**In scope.** The page shell, tabs, filters, the row list and its per-type row
content, bulk selection and bulk actions, the detail modal wiring, sorting.
Backend: two new bulk endpoints, one query-validation fix, and the password
reset cleanups enumerated below.

**Out of scope.** `dashboard/AdminPendingRequests.tsx` and
`dashboard/LeaveRequestsTable.tsx` — separate dashboard surfaces that happen to
show requests. `employee/MyRequests.tsx`, the employee-facing view.
`RequestDetailModal.tsx` internals are reused as-is and not rewritten.

## The Five Domains Are Not One Thing

The current page flattens five models into a `UnifiedRequest` carrying
`title` / `description` / `date` strings. That flattening is the root cause of
the generic feel, and of the `STATUS_FILTERS_BY_TYPE` plus tab-switch
status-reset machinery at lines 630–647 — the page is fighting to unify things
that do not share a workflow.

| Domain | Statuses | Review is | Side effects on approve |
|---|---|---|---|
| Leave | pending/approved/rejected | approve/reject | none |
| Regularization | pending/approved/rejected | approve/reject | writes or creates an `Attendance` row, recomputes `status` + `workHours`, invalidates two caches |
| Expense | pending/approved/rejected | approve/reject | none |
| Password | pending/approved/rejected | approve/reject | sets `user.password` to the stored hash, sends email |
| Help | pending/in-progress/resolved | triage + written response | none |

Four of the five are an approve/reject queue. **Help is the sole outlier** — a
ticket triage flow with a written response, not a decision — and keeps a
launcher row that opens a modal.

Password reset was initially assumed to be a token/expiry flow. It is not:
`createPasswordResetRequest` bcrypt-hashes the employee's proposed password at
submission (cost 10, matching `user.controllers.ts`), and
`approvePasswordResetRequest` assigns that hash to `user.password`. There is no
token and nothing expires. It is the simplest workflow of the five and belongs
in the queue — with one deliberate exception, below.

## Type-Aware Rows

Fields the models carry that the current UI destroys:

- **Expense `amount`** is a `Number`, flattened to the string
  `"Amount: ₹1,234"` (line 374) and therefore unsortable and un-totalable. For
  an approvals queue "what am I approving, in rupees" is the most important
  field on the row.
- **Leave `numberOfDays`** and the `startDate`→`endDate` range are concatenated
  into a title string (lines 287–290).
- **Help `priority`** is indexed in Mongo as `{ status: 1, priority: -1,
  createdAt: -1 }` — the backend is built to sort by it and the UI sorts by
  `createdAt` instead.
- **Regularization `requestedCheckIn` / `requestedCheckOut`** are `Date`s,
  concatenated into a sentence.
- **`approvedBy` / `reviewedBy` / `processedBy` and `approvedAt`** form an audit
  trail that is never displayed anywhere in the app.

Each row type renders its own fields rather than a shared title/description:

| Tab | Row content (left → right) |
|---|---|
| Leave | employee · date range · `numberOfDays` as "3d" · reason (truncated) · age · actions |
| Regularization | employee · date · `in → out` times · reason (truncated) · age · actions |
| Expense | employee · item · **amount, right-aligned, tabular numerals** · date · age · actions |
| Password | employee · email · submitted · age · actions |
| Help | employee · subject · category chip · priority chip · age · opens modal |

Age becomes a first-class left-of-actions element rather than a conditional
afterthought, and is shown from day one rather than day three.

## Layout

Rows, not cards. Target ~52px per row, so 12–15 requests are visible per screen
instead of 3. Type becomes a small colored dot or chip; the 40px icon tile is
removed. The `border-t` footer disappears — Approve and Reject sit inline at
the right edge of the row.

Row click opens the existing `RequestDetailModal` for the cases that need
reading. The list carries decisions; the modal carries detail. Today the list
attempts both.

A header row gains a select-all checkbox (selecting only bulk-eligible rows in
the current filter) and a sort control. **Sort defaults to oldest-first** — the
correct default for a queue — with options for newest, age, and, where the type
supports it, amount and priority.

Mobile keeps the row shape but drops to two lines, with actions in a trailing
overflow menu. The existing `hr/employeeDirectory/` folder is the structural
precedent.

### Component structure

```
hr/requests/
  AdminRequestsPage.tsx       orchestrator: URL state, queries, tabs   (~220 ln)
  useRequestQueue.ts          fetching, unioning, filtering, sorting   (~180 ln)
  components/
    RequestsHeader.tsx        title, open count
    RequestsTabs.tsx          tab bar + badges
    RequestsToolbar.tsx       status, month, search, sort, clear
    BulkActionBar.tsx         sticky selection bar + reject-reason prompt
    RequestRow.tsx            shared row chrome, selection, actions
    rows/LeaveRow.tsx
    rows/RegularizationRow.tsx
    rows/ExpenseRow.tsx
    rows/PasswordRow.tsx
    rows/HelpRow.tsx
    RequestsEmptyState.tsx
```

## Interaction Model

**Leave, Regularization, Expense** — inline Approve / Reject on every pending
row; checkbox; included in select-all and bulk.

**Password** — inline Approve / Reject, but **no checkbox and no bulk**.
Silently changing a dozen people's passwords in one click is a bad idea. This
is a deliberate policy choice, not a technical limit.

**Help** — no inline actions. The row opens the detail modal, where triage
status and the response message are set. It is the only type that genuinely
needs a form.

**Bulk approve** requires no comment. **Bulk reject prompts once for a shared
reason**, written to `rejectionReason` (leave), `reviewComment`
(regularization, expense). A rejection with no explanation only generates a
follow-up question from the employee.

**Single-row reject** prompts for a reason the same way, via the same small
dialog used by bulk reject — one component, two callers. This is what replaces
the hardcoded password rejection string noted under "Fixes", and it means
rejecting is two clicks against approving's one. That asymmetry is intended:
approvals are the volume case, rejections are the ones an employee will ask
about. Approve stays a single click for every type.

Because regularization approval has real side effects, **partial failure is
normal** — a missing employee record, a date conflict. Bulk results report
"47 approved, 3 failed" and name the failures rather than reporting blanket
success.

## Backend Changes

### New

**`POST /api/regularization/bulk-review`** — `{ ids, status, reviewComment }`.
This **must loop the existing per-record logic server-side**; it cannot be an
`updateMany`, because approving a regularization creates or mutates an
`Attendance` document, recomputes status and work hours through
`AttendanceBusinessService`, and invalidates two caches. Returns per-item
results. `reviewRegularization` already rejects anything not `pending`
("Request already reviewed"), which makes the loop naturally idempotent.
Extract the current single-record body into a shared service function so the
single and bulk paths cannot drift.

**`PUT /api/leave/bulk-status`** — `{ ids, status, rejectionReason }`. Leave
approval has no side effects, so this is a genuine `updateMany` mirroring
`bulkUpdateStatus` in `expense.controllers.ts`, with notifications fired in a
background loop.

Expense reuses the existing `POST /api/expenses/bulk-status` unchanged.

Both new endpoints follow the project rule: schema in
`validators/request.schemas.ts` extending `reviewDecisionSchema` the way
`bulkExpenseStatusSchema` does, wired with `validateBody` and
`authMiddleware(['admin', 'hr'])`.

### Fixes

- **`getAllExpenses` has no `validateQuery`** (`expense.routes.ts:28`), unlike
  the leave and regularization list endpoints which both use
  `requestListQuerySchema`. Violates the validation rule in CLAUDE.md. Added to
  scope at the user's request.
- **Drop `expired` and `completed`** from the `PasswordResetRequest` status
  enum and from `STATUS_FILTERS_BY_TYPE.password`. Nothing in the codebase ever
  sets either — verified by grep — so they are two filter options that can
  never match a row.
- **Rename `newPassword` → `newPasswordHash`** in `PasswordResetRequest`. The
  field holds a bcrypt hash; the current name invites someone to log it or
  return it in a response. Requires a migration note for existing documents.
- **The password approve button says "Approve & Generate Token"**
  (`AdminRequestsPage.tsx:909`). It generates no token. Rename to
  **"Approve & Set Password"**.
- **Password reject hardcodes `reason: 'Rejected by administrator.'**
  (line 577). The model has `remarks` and the schema accepts a reason — let HR
  type one, consistent with every other reject path.
- **Bulk action fallthrough** (line 550): `handleBulkAction` routes anything
  that is not leave or regularization to `updateExpenseStatusMutation` via an
  unnarrowed `return`. Safe today only because `bulkEligible` happens to filter
  to three types; adding a fourth would silently post it to the expense
  endpoint. Replace with an exhaustive `switch` that fails loudly on an
  unhandled type.

## Frontend Data Layer

New hooks in the existing per-domain files, mirroring
`useBulkUpdateExpenseStatus`:

- `useBulkReviewRegularizations` → `hooks/queries/useRegularizations.ts`
- `useBulkUpdateLeaveStatus` → `hooks/queries/useLeaves.ts`

Plus endpoints in `lib/apiEndpoints.ts` and invalidation against the existing
`queryKeys.{regularizations,leaves}.all()` and `queryKeys.dashboard.all()`, as
the expense hook already does.

Sorting and filtering stay client-side, unchanged in mechanism from today. The
page fetches all five domains on the "All" tab with no pagination; that is
acceptable at 63 requests and degrades at ~600. **Pagination is explicitly
deferred** — noted here so the omission is a decision rather than an oversight.

## Verification

There is no test suite, per CLAUDE.md. Verification is:

- `pnpm type-check` on the backend — must stay clean.
- `pnpm typecheck` and `pnpm lint` on the frontend, reported against the
  baselines of **102** and **180** (161 errors, 19 warnings). These must not
  increase; touched files should reduce them.
- Exercising each path directly: single approve and reject on all five types;
  bulk approve and bulk reject on leave, regularization and expense; a bulk run
  containing a deliberately un-approvable regularization, to confirm partial
  failure is reported accurately rather than swallowed.
- Confirming a password reset approval still lets the employee sign in with the
  password they submitted — the field rename touches the one path that would
  silently break authentication.

## Risks

**The `newPassword` → `newPasswordHash` rename touches authentication.** Any
pending request documents written before the rename keep the old field name.
The migration must handle in-flight rows, or pending resets will approve with
an `undefined` password. Safest sequence: deploy a controller that reads
`newPasswordHash ?? newPassword`, migrate the documents, then drop the fallback.

**The regularization bulk loop is the largest new surface.** Extracting the
single-record logic into a shared service is a refactor of a controller with
real side effects on attendance data. It carries the most risk in this plan and
should be built and verified before the UI that calls it.
