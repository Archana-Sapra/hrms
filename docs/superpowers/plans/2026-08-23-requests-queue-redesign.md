# Manage Requests Queue Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Manage Requests card feed with a dense approvals queue where approving a request costs one click and clearing a batch costs three.

**Architecture:** Backend first — extract the regularization review side effects into a shared service so single and bulk paths cannot drift, then add two bulk endpoints. Frontend second — split the 1,003-line page into `hr/requests/` with a row component per request type, driven by a `useRequestQueue` hook that owns fetching, filtering and sorting.

**Tech Stack:** Express 5 + Mongoose 8 + Zod 4 (backend, ESM); React 19 + TanStack Query v5 + Tailwind v4 + shadcn primitives (frontend).

**Spec:** `docs/superpowers/specs/2026-08-23-requests-queue-redesign-design.md`

## Global Constraints

- **Package manager is pnpm.** Never npm.
- **No test suite exists.** Verification is `pnpm type-check` (backend), `pnpm typecheck` + `pnpm lint` (frontend), and exercising paths by hand. Steps below say "verify", not "run tests" — this is deliberate, not an omission.
- **Verified baselines, measured 2026-08-23 at commit `10197fa`:** backend type-check **clean**; frontend typecheck **76 errors**; frontend lint **118 problems (105 errors, 13 warnings)**. CLAUDE.md states 102 and 180 — those numbers are **stale**; use the ones here. Do not increase them; reduce where you touch a file. Task 12 updates CLAUDE.md.
- **Every route reading a body validates with Zod first.** Schema in `backend/validators/`, wired with `validateBody`.
- **Express 5: `req.query` is getter-only.** Read via `getValidatedQuery<T>(req)`.
- **Never call axios from a component.** Add or extend a hook in `frontend/src/hooks/queries/`.
- **Tailwind v4 CSS-first.** Style from `@theme` tokens (`bg-card`, `text-muted-foreground`, `border-border`, `text-destructive`) — never raw `bg-white dark:bg-slate-800` or `text-gray-500`. There is no `tailwind.config.js`.
- **React Compiler is on.** Do not add `useMemo`/`useCallback`/`React.memo` for performance.
- **Modals use `ui/dialog`.** Form controls use `ui/input`, `ui/select`, `ui/checkbox`, `ui/label` — style call sites with layout classes only.
- **Commit after every task.** Never add a `Co-Authored-By` trailer or a generated-with footer (see CLAUDE.md → Commits).
- **Reuse what already exists; do not add variants or wrappers around working primitives.** Verified available and sufficient as-is: `bulkRequestStatusSchema` (`validators/request.schemas.ts:123`, currently unused — do not write a new bulk schema), `ui/checkbox` (Radix, supports `checked="indeterminate"` natively, so select-all needs no custom state), `ui/textarea` (has a `bare` variant already), `ui/dialog`, `ui/select`, `ui/badge`, `RequestDetailModal` (`dashboard/RequestDetailModal.tsx`, reused unmodified), and the expense `POST /bulk-status` endpoint. Only write something new where nothing equivalent exists.

## File Structure

**Backend — create:**
- `services/regularizationReviewService.ts` — the approve/reject side effects, extracted from the controller so single and bulk share one implementation.

**Backend — modify:**
- `controllers/regularization.controllers.ts` — `reviewRegularization` delegates to the service; add `bulkReviewRegularizations`.
- `controllers/leave.controllers.ts` — add `bulkUpdateLeaveStatus`.
- `controllers/passwordReset.controllers.ts` — accept a rejection reason; comment the hash field.
- `routes/regularization.ts`, `routes/leave.ts`, `routes/expense.routes.ts` — new routes; add missing `validateQuery`.
- `models/PasswordResetRequest.model.ts` — drop dead statuses, comment `newPassword`.
- `validators/hr.schemas.ts` — password reject reason optional-with-default.

**Frontend — create** (replacing the single 1,003-line file):
```
hr/requests/
  AdminRequestsPage.tsx        orchestrator: URL state, tabs, modal    (~220 ln)
  useRequestQueue.ts           fetch, unify, filter, sort              (~180 ln)
  requestTypes.ts              UnifiedRequest union + per-type guards
  components/
    RequestsHeader.tsx         RequestsTabs.tsx      RequestsToolbar.tsx
    BulkActionBar.tsx          RejectReasonDialog.tsx
    RequestRow.tsx             RequestsEmptyState.tsx
    rows/{Leave,Regularization,Expense,Password,Help}Row.tsx
```

**Frontend — modify:** `lib/apiEndpoints.ts`, `hooks/queries/useRegularizations.ts`, `hooks/queries/useLeaves.ts`, `main.tsx` (import path).

**Frontend — delete:** `hr/AdminRequestsPage.tsx` (Task 11, only once the replacement is proven).

---

## Task 1: Extract the regularization review service

The riskiest change in the plan, done first and alone. `reviewRegularization` currently inlines ~120 lines of side effects: it creates or mutates an `Attendance` row, recomputes status and work hours, and invalidates two caches. Bulk cannot be an `updateMany` because of this. Extract it verbatim so both callers share one implementation.

**Files:**
- Create: `backend/services/regularizationReviewService.ts`
- Modify: `backend/controllers/regularization.controllers.ts:reviewRegularization`

**Interfaces:**
- Consumes: nothing (first task).
- Produces:
```ts
export type RegReviewOutcome =
  | { ok: true; id: string; status: 'approved' | 'rejected' }
  | { ok: false; id: string; reason: string };

export async function applyRegularizationReview(args: {
  id: string;
  status: 'approved' | 'rejected';
  reviewComment?: string | null;
  reviewerId: mongoose.Types.ObjectId;
}): Promise<RegReviewOutcome>;
```

- [ ] **Step 1: Create the service, moving the logic verbatim**

Copy the body of the current `reviewRegularization` from the `RegularizationRequest.findById(id)` lookup through the notification dispatch. Every `res.status(...).json(...)` early return becomes a returned `{ ok: false, reason }`. Preserve exactly: the `reg.status !== 'pending'` guard, the `checkInTime >= checkOutTime` validation, the `!att && !checkInTime` guard, `getISTDayBoundaries`, both `AttendanceBusinessService` branches, the cache invalidation in its own try/catch, and the fire-and-forget notification.

```ts
// backend/services/regularizationReviewService.ts
import mongoose from 'mongoose';
import RegularizationRequest from '../models/Regularization.model.js';
import Attendance from '../models/Attendance.model.js';
import Employee from '../models/Employee.model.js';
import { getISTDayBoundaries } from '../utils/timezone.js';
import { invalidateAttendanceCache, invalidateDashboardCache } from '../utils/cacheInvalidation.js';
import { AttendanceBusinessService } from '../services/attendance/AttendanceBusinessService.js';
import NotificationService from '../services/notificationService.js';
import logger from '../utils/logger.js';
import type { RegularizationStatus } from '../types/index.js';

export type RegReviewOutcome =
  | { ok: true; id: string; status: 'approved' | 'rejected' }
  | { ok: false; id: string; reason: string };

/**
 * Applies one regularization decision, including the attendance side effects.
 * Shared by the single-review route and the bulk route so the two cannot drift.
 * Never throws for business-rule failures — those come back as `ok: false` so a
 * bulk caller can report per-item results instead of aborting the batch.
 */
export async function applyRegularizationReview({
  id, status, reviewComment, reviewerId,
}: {
  id: string;
  status: 'approved' | 'rejected';
  reviewComment?: string | null;
  reviewerId: mongoose.Types.ObjectId;
}): Promise<RegReviewOutcome> {
  const reg = await RegularizationRequest.findById(id);
  if (!reg) return { ok: false, id, reason: 'Request not found' };
  if (reg.status !== 'pending') return { ok: false, id, reason: 'Request already reviewed' };

  reg.status = status as RegularizationStatus;
  reg.reviewedBy = reviewerId;
  reg.reviewComment = reviewComment || '';
  await reg.save();

  if (status === 'approved') {
    const employeeDoc = await Employee.findOne({ employeeId: reg.employeeId });
    if (!employeeDoc) return { ok: false, id, reason: 'Employee not found for regularization' };

    const checkInTime = reg.requestedCheckIn;
    const checkOutTime = reg.requestedCheckOut;
    if (!checkInTime && !checkOutTime) {
      return { ok: false, id, reason: 'At least check-in or check-out time must be provided' };
    }
    if (checkInTime && checkOutTime && checkInTime >= checkOutTime) {
      return { ok: false, id, reason: 'Check-in time must be before check-out time' };
    }

    const { startOfDay, endOfDay } = getISTDayBoundaries(reg.date);
    let att = await Attendance.findOne({
      employee: employeeDoc._id,
      date: { $gte: startOfDay.toJSDate(), $lte: endOfDay.toJSDate() },
    });

    if (!att && !checkInTime) {
      return { ok: false, id, reason: 'Check-in time is required when no attendance record exists' };
    }

    if (!att) {
      att = await Attendance.create({
        employee: employeeDoc._id,
        employeeName: `${employeeDoc.firstName} ${employeeDoc.lastName}`,
        date: startOfDay.toJSDate(),
        checkIn: checkInTime,
        checkOut: checkOutTime,
        status: 'present' as const,
        comments: 'Regularized by HR/Admin',
        reason: 'Regularized by HR/Admin',
      });
    } else {
      if (checkInTime) att.checkIn = checkInTime;
      if (checkOutTime) att.checkOut = checkOutTime;
      att.reason = 'Regularized by HR/Admin';
      att.comments = 'Regularized by HR/Admin';
      if (!att.employeeName) att.employeeName = `${employeeDoc.firstName} ${employeeDoc.lastName}`;
      await att.save();
    }

    if (att.checkIn && att.checkOut) {
      const r = await AttendanceBusinessService.calculateFinalStatus(att.checkIn, att.checkOut);
      att.status = r.status;
      att.workHours = r.workHours;
      await att.save();
    } else if (att.checkIn && !att.checkOut) {
      const r = await AttendanceBusinessService.determineAttendanceStatus(att.checkIn, null);
      att.status = r.status;
      await att.save();
    }

    try {
      invalidateAttendanceCache(employeeDoc.employeeId);
      invalidateDashboardCache();
    } catch (cacheError) {
      const err = cacheError instanceof Error ? cacheError : new Error('Unknown error');
      logger.error({ err }, 'Error invalidating cache (non-critical)');
    }
  }

  if (reg.employeeId) {
    NotificationService.notifyEmployee(reg.employeeId, 'regularization_status_update', {
      status,
      date: reg.date ? reg.date.toDateString() : 'Unknown date',
      checkIn: reg.requestedCheckIn ? reg.requestedCheckIn.toLocaleString() : 'Not specified',
      checkOut: reg.requestedCheckOut ? reg.requestedCheckOut.toLocaleString() : 'Not specified',
      reason: reg.reason || 'No reason provided',
      comment: reviewComment || 'No comment',
    }).catch((error: unknown) => {
      const err = error instanceof Error ? error : new Error('Unknown error');
      logger.error({ err }, 'Failed to send regularization status notification');
    });
  }

  return { ok: true, id, status };
}
```

- [ ] **Step 2: Rewrite the controller to delegate**

Replace the whole body of `reviewRegularization` after the auth/param guards. Map `ok: false` to the status codes the old code used, so existing frontend error handling is unaffected.

```ts
export const reviewRegularization = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || (req.user.role !== 'hr' && req.user.role !== 'admin')) {
      res.status(403).json({ message: 'Not authorized' });
      return;
    }
    const id = paramValue(req.params.id);
    const { status, reviewComment } = req.body as ReviewRegularizationInput;
    if (!id) { res.status(400).json({ message: 'Request ID is required' }); return; }

    const outcome = await applyRegularizationReview({
      id, status, reviewComment, reviewerId: req.user._id,
    });

    if (!outcome.ok) {
      const code = outcome.reason === 'Request not found' ? 404
        : outcome.reason.includes('Employee not found') ? 404
        : 400;
      res.status(code).json({ message: outcome.reason });
      return;
    }
    res.json({ success: true, message: `Request ${status}` });
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    logger.error({ err: error, requestId: req.params.id }, 'Error in reviewRegularization');
    res.status(500).json({ message: 'Failed to review request', error: error.message });
  }
};
```

Add `import { applyRegularizationReview } from '../services/regularizationReviewService.js';` and `import { paramValue } from '../utils/helpers.js';`. Remove now-unused imports (`Attendance`, `Employee`, `getISTDayBoundaries`, `invalidateAttendanceCache`, `invalidateDashboardCache`, `AttendanceBusinessService`, `NotificationService`) **only if** no other function in the file uses them — check first; `getISTDayBoundaries` and others may still be needed by `requestRegularization`.

- [ ] **Step 3: Verify types**

Run: `cd backend && pnpm type-check`
Expected: clean, no output. If unused-import errors appear, remove exactly those imports.

- [ ] **Step 4: Exercise the path by hand**

Start the backend (`pnpm dev`). As HR, approve one pending regularization from the existing UI. Confirm: response is 200; the request's status is `approved`; an `Attendance` row for that employee/date now exists with the requested times and a recomputed `status`. Then attempt to approve the same request again and confirm a 400 "Request already reviewed".

- [ ] **Step 5: Commit**

```bash
git add backend/services/regularizationReviewService.ts backend/controllers/regularization.controllers.ts
git commit -m "refactor(regularization): extract review side effects into a shared service

Approving a regularization creates or mutates an Attendance record and
recomputes status and work hours, so a bulk endpoint cannot be an
updateMany. Extracting the logic lets single and bulk share it."
```

---

## Task 2: Regularization bulk-review endpoint

**Files:**
- Modify: `backend/controllers/regularization.controllers.ts` (add `bulkReviewRegularizations`)
- Modify: `backend/routes/regularization.ts`

**Interfaces:**
- Consumes: `applyRegularizationReview`, `RegReviewOutcome` from Task 1.
- Produces: `POST /api/regularizations/bulk-review`, body `{ ids: string[]; status: 'approved'|'rejected'; reviewComment?: string }`, response:
```ts
{ success: true; updatedCount: number; failedCount: number;
  failures: { id: string; reason: string }[] }
```

**Note:** `bulkRequestStatusSchema` already exists in `validators/request.schemas.ts:123` (`ids` + `status` + `reviewComment`) and is currently **unused** — exported but never imported. Reuse it; do not write a new schema.

- [ ] **Step 1: Add the controller**

Sequential, not `Promise.all` — each approval performs several dependent DB writes plus cache invalidation, and a 50-wide parallel fan-out against one Railway instance is how you get connection-pool exhaustion.

```ts
export const bulkReviewRegularizations = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || (req.user.role !== 'hr' && req.user.role !== 'admin')) {
      res.status(403).json({ message: 'Not authorized' });
      return;
    }
    const { ids, status, reviewComment } = req.body as BulkRequestStatusInput;

    const failures: { id: string; reason: string }[] = [];
    let updatedCount = 0;

    for (const id of ids) {
      try {
        const outcome = await applyRegularizationReview({
          id, status, reviewComment, reviewerId: req.user._id,
        });
        if (outcome.ok) updatedCount += 1;
        else failures.push({ id: outcome.id, reason: outcome.reason });
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        logger.error({ err: error, id }, 'Bulk regularization item failed');
        failures.push({ id, reason: error.message });
      }
    }

    logger.info({ requested: ids.length, updatedCount, failedCount: failures.length },
      'Bulk regularization review complete');

    res.json({ success: true, updatedCount, failedCount: failures.length, failures });
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    logger.error({ err: error }, 'Error in bulkReviewRegularizations');
    res.status(500).json({ message: 'Failed to review requests', error: error.message });
  }
};
```

Import `BulkRequestStatusInput` from `'../validators/request.schemas.js'`.

- [ ] **Step 2: Register the route**

In `backend/routes/regularization.ts`, add **above** the existing `/:id/review` route so the literal path is not shadowed by the param route:

```ts
router.post(
  "/bulk-review",
  authMiddleware(["hr", "admin"]),
  validateBody(bulkRequestStatusSchema),
  bulkReviewRegularizations
);
```

Add `bulkReviewRegularizations` to the controller import and `bulkRequestStatusSchema` to the validators import.

- [ ] **Step 3: Verify types**

Run: `cd backend && pnpm type-check`
Expected: clean.

- [ ] **Step 4: Exercise the path by hand**

With the backend running, get a JWT from `localStorage` and call the endpoint with three pending regularization ids, one of which you have already approved:

```bash
curl -X POST http://localhost:4000/api/regularizations/bulk-review \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"ids":["<pendingA>","<pendingB>","<alreadyApproved>"],"status":"approved"}'
```

Expected: `updatedCount: 2`, `failedCount: 1`, and `failures[0].reason === 'Request already reviewed'`. Confirm attendance rows were written for the two that succeeded. **Partial failure reporting is the point of this endpoint — verify it rather than assuming it.**

- [ ] **Step 5: Commit**

```bash
git add backend/controllers/regularization.controllers.ts backend/routes/regularization.ts
git commit -m "feat(regularization): add bulk-review endpoint

Loops the shared review service sequentially and returns per-item
results, so a partially failed batch reports which items failed.
Reuses the previously unused bulkRequestStatusSchema."
```

---

## Task 3: Leave bulk-status endpoint

Leave approval has no side effects, so this is a genuine `updateMany` mirroring `bulkUpdateStatus` in `expense.controllers.ts:198`.

**Files:**
- Modify: `backend/controllers/leave.controllers.ts`, `backend/routes/leave.ts`

**Interfaces:**
- Consumes: `bulkRequestStatusSchema` (same schema as Task 2).
- Produces: `PUT /api/leaves/bulk-status`, response `{ success: true; updatedCount: number }`.

- [ ] **Step 1: Add the controller**

The `status: { $ne: 'approved' }` guard mirrors the expense endpoint — it prevents re-approving an already-approved leave. `reviewComment` maps to the Leave model's `rejectionReason` field, which only applies to rejections.

```ts
export const bulkUpdateLeaveStatus = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    const { ids, status, reviewComment } = req.body as BulkRequestStatusInput;

    const updateFields: Record<string, unknown> = { status };
    if (status === 'approved') {
      updateFields.approvedBy = req.user?._id;
      updateFields.approvedAt = new Date();
      updateFields.rejectionReason = undefined;
    } else {
      updateFields.rejectionReason = reviewComment || '';
    }

    const result = await Leave.updateMany(
      { _id: { $in: ids }, status: { $ne: 'approved' } },
      { $set: updateFields }
    );

    const updated = await Leave.find({ _id: { $in: ids } })
      .populate('employee', 'employeeId').lean();
    for (const leave of updated) {
      const emp = leave.employee as unknown as { employeeId?: string } | null;
      if (emp?.employeeId) {
        NotificationService.notifyEmployee(emp.employeeId, 'leave_status_update', {
          status,
          startDate: leave.startDate ? new Date(leave.startDate).toDateString() : 'Unknown',
          endDate: leave.endDate ? new Date(leave.endDate).toDateString() : 'Unknown',
          comment: reviewComment || 'No comment',
        }).catch(() => {});
      }
    }

    res.json({ success: true, updatedCount: result.modifiedCount });
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    logger.error({ err: error }, 'Error in bulkUpdateLeaveStatus');
    res.status(500).json({ message: 'Failed to update leaves', error: error.message });
  }
};
```

Before writing, open `controllers/leave.controllers.ts` and confirm the exact notification event name used by the existing `updateLeaveStatus` — use that same string rather than `'leave_status_update'` if it differs.

- [ ] **Step 2: Register the route**

In `backend/routes/leave.ts`, add above `/:leaveId/status`:

```ts
router.put(
  "/bulk-status",
  authMiddleware(["admin", "hr"]),
  validateBody(bulkRequestStatusSchema),
  bulkUpdateLeaveStatus
);
```

- [ ] **Step 3: Verify types**

Run: `cd backend && pnpm type-check`
Expected: clean.

- [ ] **Step 4: Exercise the path by hand**

```bash
curl -X PUT http://localhost:4000/api/leaves/bulk-status \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"ids":["<pendingLeaveId>"],"status":"rejected","reviewComment":"Insufficient notice"}'
```

Expected: `updatedCount: 1`; the leave shows `status: rejected` and `rejectionReason: "Insufficient notice"`.

- [ ] **Step 5: Commit**

```bash
git add backend/controllers/leave.controllers.ts backend/routes/leave.ts
git commit -m "feat(leave): add bulk-status endpoint

Leave approval has no side effects, so this is an updateMany mirroring
the expense bulk endpoint, with notifications in a background loop."
```

---

## Task 4: Backend cleanups

Four independent small fixes from the spec, grouped because each is a few lines and they share a verification pass.

**Files:**
- Modify: `backend/routes/expense.routes.ts:28`
- Modify: `backend/models/PasswordResetRequest.model.ts`
- Modify: `backend/controllers/passwordReset.controllers.ts`
- Modify: `backend/validators/hr.schemas.ts`

- [ ] **Step 1: Add the missing query validation**

`getAllExpenses` has no `validateQuery`, unlike the leave and regularization list routes. In `routes/expense.routes.ts`:

```ts
router.get('/all', authMiddleware(['admin', 'hr']), validateQuery(requestListQuerySchema), getAllExpenses);
```

Import `validateQuery` and `requestListQuerySchema`. Then open `controllers/expense.controllers.ts:getAllExpenses` and switch any direct `req.query` reads to `getValidatedQuery<RequestListQuery>(req)` — **Express 5 makes `req.query` getter-only**, and the validated result lives on `req.validatedQuery`.

- [ ] **Step 2: Drop the dead password statuses**

Verified by grep: nothing in the codebase ever sets `expired` or `completed`. In `models/PasswordResetRequest.model.ts`, reduce the enum to `['pending', 'approved', 'rejected']` (both the `PasswordResetStatus` type and the schema `values`), and comment the hash field:

```ts
export type PasswordResetStatus = 'pending' | 'approved' | 'rejected';

    /**
     * The employee's proposed password, already bcrypt-hashed (cost 10) at
     * submission time — a pending request never holds a readable password.
     * On approval this hash is assigned to `User.password` as-is.
     */
    newPassword: {
      type: String,
      required: [true, 'New password is required'],
    },
```

- [ ] **Step 3: Let HR supply a rejection reason**

In `validators/hr.schemas.ts`, make `rejectPasswordResetSchema`'s reason optional with a default so existing callers that omit it still work:

```ts
export const rejectPasswordResetSchema = z.object({
  reason: shortTextSchema.min(1).default('Rejected by administrator.'),
});
```

Confirm `shortTextSchema` is imported there; if not, import it from `./common.schemas.js`. Then in `controllers/passwordReset.controllers.ts:rejectPasswordResetRequest`, confirm the supplied `reason` is written to the request's `remarks` field rather than a hardcoded string.

- [ ] **Step 4: Verify types**

Run: `cd backend && pnpm type-check`
Expected: clean. Dropping the enum members may surface type errors anywhere `expired`/`completed` were referenced — the frontend `STATUS_FILTERS_BY_TYPE` is handled in Task 7; a backend error here means a real remaining usage, so read it rather than suppressing it.

- [ ] **Step 5: Exercise the paths by hand**

Submit a password reset from the login page, then reject it as HR with a typed reason and confirm `remarks` holds that reason. Approve a second one and **confirm the employee can sign in with the password they submitted** — this is the one path that fails silently. Load `/api/expenses/all?status=pending` and confirm it still returns.

- [ ] **Step 6: Commit**

```bash
git add backend/routes/expense.routes.ts backend/controllers/expense.controllers.ts backend/models/PasswordResetRequest.model.ts backend/controllers/passwordReset.controllers.ts backend/validators/hr.schemas.ts
git commit -m "fix(requests): validate expense query, drop dead password statuses

getAllExpenses was the only admin list route without validateQuery.
The expired and completed password statuses are never set anywhere, so
they were two filter options that could never match a row. HR can now
supply a rejection reason instead of a hardcoded string."
```

---

## Task 5: Frontend data layer

**Files:**
- Modify: `frontend/src/lib/apiEndpoints.ts`
- Modify: `frontend/src/hooks/queries/useRegularizations.ts`
- Modify: `frontend/src/hooks/queries/useLeaves.ts`

**Interfaces:**
- Consumes: the endpoints from Tasks 2 and 3.
- Produces:
```ts
useBulkReviewRegularizations(): UseMutationResult<
  { success: boolean; updatedCount: number; failedCount: number;
    failures: { id: string; reason: string }[] },
  Error,
  { ids: string[]; status: 'approved' | 'rejected'; reviewComment?: string }>

useBulkUpdateLeaveStatus(): UseMutationResult<
  { success: boolean; updatedCount: number },
  Error,
  { ids: string[]; status: 'approved' | 'rejected'; reviewComment?: string }>
```

- [ ] **Step 1: Add the endpoints**

```ts
  LEAVES: {
    // ...existing
    BULK_STATUS: '/leaves/bulk-status',
  },
  REGULARIZATIONS: {
    // ...existing
    BULK_REVIEW: '/regularizations/bulk-review',
  },
```

- [ ] **Step 2: Add the regularization hook**

Mirrors `useReviewRegularization` (same file, line 91) including its three invalidations — approved regularizations affect attendance, so `attendance.all()` must be invalidated too.

```ts
/**
 * Bulk review regularization requests (Admin/HR).
 * Returns per-item failures so the caller can report a partial batch.
 */
export const useBulkReviewRegularizations = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, status, reviewComment }: {
      ids: string[];
      status: 'approved' | 'rejected';
      reviewComment?: string;
    }) => {
      const { data } = await axiosInstance.post<{
        success: boolean;
        updatedCount: number;
        failedCount: number;
        failures: { id: string; reason: string }[];
      }>(API_ENDPOINTS.REGULARIZATIONS.BULK_REVIEW, { ids, status, reviewComment });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.regularizations.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
    },
  });
};
```

- [ ] **Step 3: Add the leave hook**

```ts
/**
 * Bulk update leave statuses (Admin/HR).
 */
export const useBulkUpdateLeaveStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, status, reviewComment }: {
      ids: string[];
      status: 'approved' | 'rejected';
      reviewComment?: string;
    }) => {
      const { data } = await axiosInstance.put<{ success: boolean; updatedCount: number }>(
        API_ENDPOINTS.LEAVES.BULK_STATUS, { ids, status, reviewComment }
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leaves.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
    },
  });
};
```

- [ ] **Step 4: Export and verify**

Confirm both hooks are re-exported from `hooks/queries/index.ts` (check whether it uses `export *` per domain file — if so, nothing to add).

Run: `cd frontend && pnpm typecheck`
Expected: still **76** errors, not more.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/apiEndpoints.ts frontend/src/hooks/queries/useRegularizations.ts frontend/src/hooks/queries/useLeaves.ts
git commit -m "feat(queries): add bulk review hooks for regularization and leave"
```

---

## Task 6: Request types and the queue hook

The data core of the new page, built and type-checked before any UI depends on it.

**Files:**
- Create: `frontend/src/components/hr/requests/requestTypes.ts`
- Create: `frontend/src/components/hr/requests/useRequestQueue.ts`

**Interfaces:**
- Consumes: existing list hooks (`useAllLeaves`, `useAllHelpInquiries`, `useRegularizationRequests`, `usePasswordResetRequests`, `useAllExpenses`).
- Produces:
```ts
export type RequestType = 'leave' | 'help' | 'regularization' | 'password' | 'expense';
export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'resolved' | 'in-progress';
export type SortKey = 'oldest' | 'newest' | 'amount' | 'priority';

export interface BaseRequest {
  _id: string; type: RequestType; date: Date; createdAt: Date;
  status: RequestStatus; employeeName: string; employeeEmail: string;
  reason: string; age: number;
  response?: string; reviewComment?: string;
}
export interface LeaveRequest extends BaseRequest { type: 'leave';
  startDate: Date; endDate: Date; numberOfDays: number; leaveType: string }
export interface RegularizationRequest_ extends BaseRequest { type: 'regularization';
  requestedCheckIn?: Date; requestedCheckOut?: Date }
export interface ExpenseRequest extends BaseRequest { type: 'expense';
  item: string; amount: number }
export interface PasswordRequest extends BaseRequest { type: 'password'; email: string }
export interface HelpRequest extends BaseRequest { type: 'help';
  subject: string; category?: string; priority?: 'low'|'medium'|'high' }

export type UnifiedRequest =
  | LeaveRequest | RegularizationRequest_ | ExpenseRequest | PasswordRequest | HelpRequest;

export const OPEN_STATUSES: Set<RequestStatus>;
export const BULK_ELIGIBLE_TYPES: Set<RequestType>;  // leave, regularization, expense
export const rowKey: (r: UnifiedRequest) => string;
export const daysWaiting: (createdAt: Date) => number;

// useRequestQueue.ts
export function useRequestQueue(args: {
  activeTab: string; statusFilter: string; monthParam: string;
  search: string; sort: SortKey; enabled: boolean;
}): {
  requests: UnifiedRequest[];        // filtered + sorted
  openCountsByType: Record<string, number>;
  totalOpen: number;
  loading: boolean;
  failedSources: string[];
  refetchAll: () => void;
};
```

- [ ] **Step 1: Write `requestTypes.ts`**

Discriminated union keyed on `type` — each variant keeps its own real fields rather than being flattened into title/description strings. `amount` stays a `number` so it can be sorted and totalled; `numberOfDays`, `priority`, and the check-in/out `Date`s likewise.

```ts
export const OPEN_STATUSES = new Set<RequestStatus>(['pending', 'in-progress']);

/** Password is excluded deliberately: bulk-changing many passwords in one
 *  click is a policy hazard, not a technical limitation. Help is a triage
 *  flow needing a written response, so it has no inline decision either. */
export const BULK_ELIGIBLE_TYPES = new Set<RequestType>(['leave', 'regularization', 'expense']);

export const rowKey = (r: UnifiedRequest) => `${r.type}-${r._id}`;

/** Whole days since submission — the queue's most useful sort signal. */
export const daysWaiting = (createdAt: Date): number =>
  Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000));
```

Write the interfaces exactly as in the Interfaces block above.

- [ ] **Step 2: Write `useRequestQueue.ts`**

Port the five `.map()` normalizers from the old `AdminRequestsPage.tsx:274-387`, but map to the **typed** variants instead of title/description strings. Keep these behaviours verbatim, each of which encodes a real bug fix:
- `fallbackTime = 0`, never `Date.now()` — impure during render, and undated rows would sort to the top.
- Month absent ⇒ no date range, so a request pending since last month does not vanish when the calendar rolls over.
- `statusFilter === 'open' | 'all'` ⇒ no `status` pushed to the API; `open` is a client-side union.
- Per-tab `enabled` flags so inactive tabs are not fetched.
- `failedSources` collected per query so a partial failure is visible.

Counts are taken **before** the status filter so each tab badge shows its load. Sorting:

```ts
const sorted = [...filtered].sort((a, b) => {
  switch (sort) {
    case 'newest': return b.createdAt.getTime() - a.createdAt.getTime();
    case 'amount': {
      const av = a.type === 'expense' ? a.amount : -1;
      const bv = b.type === 'expense' ? b.amount : -1;
      return bv - av;
    }
    case 'priority': {
      const rank = { high: 3, medium: 2, low: 1 } as const;
      const av = a.type === 'help' ? rank[a.priority ?? 'low'] : 0;
      const bv = b.type === 'help' ? rank[b.priority ?? 'low'] : 0;
      return bv - av;
    }
    case 'oldest':
    default: return a.createdAt.getTime() - b.createdAt.getTime();
  }
});
```

- [ ] **Step 3: Verify types**

Run: `cd frontend && pnpm typecheck`
Expected: still **76**. New files must contribute zero errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/hr/requests/requestTypes.ts frontend/src/components/hr/requests/useRequestQueue.ts
git commit -m "feat(requests): add typed request union and queue hook

Replaces the title/description flattening with a discriminated union
that keeps amount as a number, numberOfDays, priority and the
check-in/out times, so rows can render and sort real fields."
```

---

## Task 7: Row components

**Files:**
- Create: `frontend/src/components/hr/requests/components/RequestRow.tsx`
- Create: `frontend/src/components/hr/requests/components/rows/{Leave,Regularization,Expense,Password,Help}Row.tsx`

**Interfaces:**
- Consumes: `UnifiedRequest` and friends from Task 6.
- Produces:
```ts
interface RequestRowProps {
  request: UnifiedRequest;
  selected: boolean;
  selectable: boolean;
  onToggleSelect: (key: string) => void;
  onApprove: (r: UnifiedRequest) => void;
  onReject: (r: UnifiedRequest) => void;
  onOpenDetail: (r: UnifiedRequest) => void;
  busy: boolean;
}
export default function RequestRow(props: RequestRowProps): JSX.Element;

// each rows/*Row.tsx
export default function LeaveRow({ request }: { request: LeaveRequest }): JSX.Element;
```

- [ ] **Step 1: Build `RequestRow` shell**

Owns chrome shared by all types: the `ui/checkbox` (rendered as an inert same-size spacer when not selectable, so rows stay aligned), the type dot, the per-type content slot, the age chip, the status badge, and the action cluster. Target ~52px on desktop.

Rules: no `Card`, no `p-6`, no 40px icon tile, no `border-t` footer. Row click calls `onOpenDetail`; action buttons must call `e.stopPropagation()` so approving does not also open the modal. Use `@theme` tokens only. The whole row is a `<tr>`-like flex row but must remain keyboard-reachable — make the clickable region a `<button>` or add `role="button"` with an `onKeyDown` handler for Enter/Space.

Age chip: neutral under 3 days, `text-yellow-600 dark:text-yellow-500` at 3–6, `text-destructive` at 7+.

- [ ] **Step 2: Build the five row bodies**

Per the spec's table — each renders only its own fields:

- `LeaveRow` — date range, `{numberOfDays}d`, truncated reason.
- `RegularizationRow` — date, `in → out` via `formatTime`, truncated reason.
- `ExpenseRow` — item, then **amount right-aligned with `tabular-nums`** and `₹{amount.toLocaleString('en-IN')}`.
- `PasswordRow` — name and email. Buttons are plain **Approve** / **Reject**, same as every other type. Approve sets the employee's new password; reject leaves the old one in place. The old copy said "Approve & Generate Token" (`hr/AdminRequestsPage.tsx:909`) — there is no token and nothing expires, so that word must not reappear anywhere in the new UI.
- `HelpRow` — subject, category chip, priority chip.

Truncate with `truncate` on a `min-w-0` flex child; without `min-w-0` the flex item will not shrink and the row will overflow.

- [ ] **Step 3: Verify types and lint**

Run: `cd frontend && pnpm typecheck && pnpm lint`
Expected: typecheck **76**, lint **118 (105 errors, 13 warnings)** or lower.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/hr/requests/components/
git commit -m "feat(requests): add dense row components per request type"
```

---

## Task 8: Toolbar, tabs, header, empty state, reject dialog

**Files:**
- Create: `frontend/src/components/hr/requests/components/{RequestsHeader,RequestsTabs,RequestsToolbar,RequestsEmptyState,RejectReasonDialog}.tsx`

**Interfaces:**
- Produces:
```ts
function RequestsTabs(props: { activeTab: string; counts: Record<string, number>;
  totalOpen: number; onChange: (tabId: string) => void }): JSX.Element;

function RequestsToolbar(props: {
  statusFilter: string; monthParam: string; search: string; sort: SortKey;
  activeTab: string; hasActiveFilters: boolean;
  onParam: (key: string, value: string | null) => void; onClear: () => void;
}): JSX.Element;

function RejectReasonDialog(props: {
  open: boolean; count: number; onCancel: () => void;
  onConfirm: (reason: string) => void;
}): JSX.Element;
```

- [ ] **Step 1: Port tabs and toolbar**

Move the existing tab bar and filter row over unchanged in behaviour — including the tab-switch guard that clears a status the new tab cannot offer (old file lines 630–647), otherwise the list silently comes back empty. `STATUS_FILTERS_BY_TYPE.password` loses `expired` and `completed` to match Task 4's enum.

Toolbar gains a **Sort** `ui/select`: Oldest first (default), Newest first, Largest amount (expense tab only), Highest priority (help tab only).

- [ ] **Step 2: Build `RejectReasonDialog`**

A `ui/dialog` with a `ui/textarea` and Cancel / Reject buttons. Used by both single-row reject and bulk reject — one component, two callers. Title reads "Reject request" when `count === 1`, otherwise `Reject {count} requests`. Reject is disabled while the reason is empty.

- [ ] **Step 3: Verify and commit**

Run: `cd frontend && pnpm typecheck && pnpm lint`
Expected: no increase over baseline.

```bash
git add frontend/src/components/hr/requests/components/
git commit -m "feat(requests): add tabs, toolbar with sort, and reject reason dialog"
```

---

## Task 9: Bulk action bar with select-all

**Files:**
- Create: `frontend/src/components/hr/requests/components/BulkActionBar.tsx`

**Interfaces:**
- Produces:
```ts
function BulkActionBar(props: {
  selectedCount: number; onClear: () => void;
  onApprove: () => void; onReject: () => void; busy: boolean;
}): JSX.Element;
```

- [ ] **Step 1: Build the bar**

Sticky, as today. Shows `{n} selected`, then Clear / Reject / Approve. Disabled while `busy` so a double-click cannot fire two batches.

- [ ] **Step 2: Add select-all in the list header**

A `ui/checkbox` that selects every **bulk-eligible row in the current filtered view** — not the whole queue. Indeterminate when a subset is selected. This is the single change that makes bulk usable: without it, clearing 50 regularizations means 50 clicks.

- [ ] **Step 3: Verify and commit**

```bash
git add frontend/src/components/hr/requests/components/BulkActionBar.tsx
git commit -m "feat(requests): add bulk action bar with select-all"
```

---

## Task 10: Page orchestrator

**Files:**
- Create: `frontend/src/components/hr/requests/AdminRequestsPage.tsx`

**Interfaces:**
- Consumes: everything from Tasks 5–9, plus `RequestDetailModal` from `../../dashboard/RequestDetailModal`.

- [ ] **Step 1: Assemble the page**

Keeps filters in the URL via `useSearchParams` exactly as today — a view stays linkable, bookmarkable, and undoable with the back button. Adds `sort` as a param. Owns: `selected: Set<string>`, `busy`, the reject-dialog target, and the detail-modal target.

Keep the comment explaining why there is no local authorization branch (old file lines 596–600): both `/admin/*` routes are wrapped in `<RequireRole>`, and a local check could only ever flash a false "Access Denied".

- [ ] **Step 2: Wire the actions**

Single approve → the existing per-type mutation, no dialog. Single reject → `RejectReasonDialog`, then the per-type mutation with the reason. Bulk approve → the bulk hook for each type present in the selection. Bulk reject → dialog once, then the bulk hooks.

**Replace the old fallthrough bug (old line 550) with an exhaustive switch.** The old code routed anything that was not leave or regularization to the expense mutation via an unnarrowed `return`:

```ts
const bulkFor = (type: RequestType) => {
  switch (type) {
    case 'leave': return bulkLeave;
    case 'regularization': return bulkReg;
    case 'expense': return bulkExpense;
    case 'password':
    case 'help':
      throw new Error(`${type} requests are not bulk-eligible`);
    default: {
      const _exhaustive: never = type;
      throw new Error(`Unhandled request type: ${String(_exhaustive)}`);
    }
  }
};
```

Group the selection by type and issue one bulk call per type.

- [ ] **Step 3: Report partial failures honestly**

The regularization bulk response carries `failedCount` and `failures`. When `failedCount > 0`, the toast must be `variant: 'error'` and read `{updatedCount} approved, {failedCount} failed` with the first failure's reason. Do not report a partial batch as success — the spec calls this out because it is the failure mode most likely to be papered over.

- [ ] **Step 4: Point the route at the new page**

In `frontend/src/main.tsx`, update the import to `components/hr/requests/AdminRequestsPage`. Leave the `RequireRole` wrapper untouched.

- [ ] **Step 5: Verify**

Run: `cd frontend && pnpm typecheck && pnpm lint && pnpm build`
Expected: typecheck ≤76, lint ≤118, build succeeds. Remember `pnpm build` proves nothing about types — all three are required.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/hr/requests/AdminRequestsPage.tsx frontend/src/main.tsx
git commit -m "feat(requests): wire the new dense queue page

One-click approve, select-all bulk, oldest-first default sort, and
honest partial-failure reporting. Replaces the five-interaction inline
edit form with direct decisions."
```

---

## Task 11: Retire the old page

Only after Task 10 is verified working in the browser.

**Files:**
- Delete: `frontend/src/components/hr/AdminRequestsPage.tsx`

- [ ] **Step 1: Confirm nothing imports it**

Run: `cd frontend && grep -rn "hr/AdminRequestsPage" src/`
Expected: no matches outside `src/components/hr/requests/`. If `dashboard/AdminPendingRequests.tsx` imports anything from it, move that export into `requests/requestTypes.ts` first.

- [ ] **Step 2: Delete and verify**

```bash
git rm frontend/src/components/hr/AdminRequestsPage.tsx
cd frontend && pnpm typecheck && pnpm lint && pnpm build
```
Expected: all pass; both counts should now be **below** baseline, since a 1,003-line file left the project.

- [ ] **Step 3: Commit**

```bash
git commit -m "refactor(requests): remove the superseded card-feed page"
```

---

## Task 12: Full verification pass and doc correction

- [ ] **Step 1: Measure and record**

```bash
cd backend && pnpm type-check
cd ../frontend && pnpm typecheck 2>&1 | grep -cE "error TS"
cd frontend && pnpm lint 2>&1 | tail -3
```

Record the three numbers. Backend must be clean; the frontend counts must not exceed 76 and 118.

- [ ] **Step 2: Exercise every path by hand**

As HR, in the browser:
1. Single approve on leave, regularization, expense, password — each **one click**, no dialog.
2. Single reject on each — dialog appears, reason is required, reason is persisted.
3. Help row opens the modal; triage status and response save.
4. Select-all on Regularization, bulk approve. Confirm the count and that attendance rows were written.
5. Bulk reject with a shared reason; confirm it lands on every affected record.
6. A bulk run including one already-reviewed request — **confirm the toast reports the partial failure and names it.**
7. Password rows have **no checkbox** and are excluded from select-all.
8. Filters and sort survive a page reload (they are URL params) and the back button undoes them.
9. Narrow the viewport to phone width: rows stay two-line, actions remain reachable, nothing overflows horizontally.

- [ ] **Step 3: Correct the stale baselines in CLAUDE.md**

CLAUDE.md claims typecheck 102 and lint 180. Measured at `10197fa` they were **76** and **118 (105 errors, 13 warnings)**. Update the "Before claiming done" section to the post-implementation numbers from Step 1, so the next session is not calibrated against numbers that are three fixes out of date.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: correct stale typecheck and lint baselines

Measured, not inherited: the documented 102/180 were stale."
```

---

## Notes for the executor

**Deferred deliberately, not forgotten:**
- **Pagination.** The page fetches all five domains on "All" with no paging. Fine at 63 requests, degrades around 600. Recorded in the spec as a decision.
- **Grouping by employee/date.** Considered and deferred until the dense list exists and it can be seen whether the data actually clusters.
- **The audit trail.** `approvedBy`/`reviewedBy`/`approvedAt` are stored by every model and displayed nowhere. Out of scope here; worth a future pass.

**If you find yourself wanting to widen scope:** stop and ask. The spec's scope section is deliberately bounded, and the two dashboard surfaces that also show requests (`AdminPendingRequests`, `LeaveRequestsTable`) are explicitly out.
