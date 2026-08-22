# Employee Directory Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 733-line `EmployeeDirectory.tsx` monolith with focused, themed, accessible components that an HR user can comfortably operate on a phone (PWA) and desktop.

**Architecture:** One route with two presentations. Desktop (`lg+`) renders a two-pane master/detail; mobile renders the list at `/employees` and the profile full-screen at `/employees/:id`, so the PWA back gesture works. Selection and the active/inactive tab live in the URL, not component state. Presentation splits into `components/` with derivation extracted to `useEmployeeFilters`.

**Tech Stack:** React 19 (React Compiler enabled), TypeScript, Vite, TanStack Query v5, react-router, Tailwind v4 (CSS-first, `@theme` block in `src/index.css`), shadcn-style primitives in `src/components/ui/`, lucide-react icons.

**Spec:** `docs/superpowers/specs/2026-08-22-employee-directory-redesign.md`

## Global Constraints

- **Package manager is pnpm. Never npm.**
- **There is no test suite.** Verification is `pnpm typecheck`, `pnpm lint`, `pnpm build`, and exercising the page in a browser. Do not fabricate test files or a test runner.
- **Baselines (do not increase):** frontend `pnpm typecheck` **102**, `pnpm lint` **180** (161 errors, 19 warnings). Backend `pnpm type-check` is **clean** and must stay clean. Report actual numbers at each verification step.
- **`pnpm build` on the frontend does not type-check.** A successful `vite build` proves nothing about types. Always run `pnpm typecheck` separately.
- **Tailwind v4 CSS-first. There is no `tailwind.config.js`** — creating one does nothing. Tokens live in the `@theme` block of `src/index.css`.
- **Style with `@theme` tokens** (`bg-card`, `text-muted-foreground`, `border-border`, `ring-ring`, `text-destructive`, `bg-primary`), never raw `bg-white dark:bg-slate-800` / `text-gray-500` pairs.
- **`ui/input` and `ui/textarea` are already tokenized** — style their call sites with **layout classes only** (`mt-1`, `h-40`), never colors, or you fight the component.
- **React Compiler is enabled** (`vite.config.js`). Do NOT add `useMemo` / `useCallback` / `React.memo` for performance.
- **Never call axios from a component.** TanStack Query hooks in `src/hooks/queries/` are the only sanctioned way to reach the API. `useEffect` is not a data-fetching tool.
- **`react-hooks/set-state-in-effect` lint errors are real bugs** (cascading renders), not noise. Do not introduce any.
- Modals use `ui/dialog`. Route params are typed `string | string[]`.
- Zod is **v4** on both sides: `z.email()` not `z.string().email()`; errors are on `error.issues` not `error.errors`.

## Existing API Reference

Signatures a zero-context engineer needs. **Verified against the codebase — use exactly these shapes.**

```ts
// hooks/queries/useEmployees.ts
useEmployees(params?: EmployeeQueryParams)        // → Employee[]   ({ status: 'active' | 'inactive' })
useEmployee(id: string)                           // → Employee | undefined. ONE ARG ONLY.
useUpdateEmployee()                               // mutate({ id, ...UpdateEmployeeDto })
useToggleEmployeeStatus()                         // mutate(employeeId: string)
useUnlinkEmployeeFromUser()                       // mutate({ userId: string })

// hooks/queries/useLeaves.ts
useAllLeaves(options?: { params?: LeaveQueryParams; enabled?: boolean })  // → Leave[]
useUpdateLeaveStatus()                            // mutate({ leaveId, status: 'approved' | 'rejected' })
                                                  // already invalidates leaves + attendance + dashboard

// hooks/queries/useSettings.ts
useDepartments(options?: { enabled?: boolean })   // → string[]

// hooks/queries/useUsers.ts
useUsers()                                        // → User[]  (User.employeeId links to Employee.employeeId)

// hooks/use-media-query.ts
useMediaQuery(query: string)                      // → boolean, correct on first render (useSyncExternalStore)

// components/ui/*
Button   variant: default | destructive | outline | secondary | ghost | link
         size:    default | sm | lg | xl | icon
Badge    variant: default | primary | secondary | success | warning | error
Select   { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue }
Dialog   { Dialog, DialogPortal, DialogOverlay, DialogClose, DialogTrigger,
           DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription }
Tabs     { Tabs, TabsList, TabsTrigger, TabsContent }

// utils / validation
sanitizeText(value: string): string                          // utils/sanitization
validateUpdateEmployee(data)  // → { success: true, data } | { success: false, errors: Record<string,string> }
validateField(field, value)   // → { valid: true } | { valid: false, error: string }
useToast()    // → { toast({ title, description, variant?: 'default'|'destructive'|'error' }) }
useConfirm()  // → confirm({ title, description, confirmText, destructive? }) => Promise<boolean>
```

**Gotcha:** `Employee.name` may be empty; fall back to `` `${firstName} ${lastName}` ``. `Employee.isActive` is the boolean the backend uses; `Employee.status` is the `'active' | 'inactive'` string. Both exist.

## File Structure

```
backend/models/Employee.model.ts            MODIFY  remove toJSON Aadhaar mask

frontend/src/components/ui/
  badge.tsx                                 MODIFY  hardcoded colors → @theme tokens (4 consumers)
  tabs.tsx                                  MODIFY  hardcoded colors → @theme tokens (2 consumers)

frontend/src/components/hr/employeeDirectory/
  EmployeeDirectory.tsx                     REWRITE orchestrator only        (~120 ln)
  components/
    DirectoryHeader.tsx                     CREATE  title, tabs, Add/Link     (~90)
    DirectoryToolbar.tsx                    CREATE  search + filters + count  (~110)
    FilterSheet.tsx                         CREATE  mobile filter dialog      (~120)
    EmployeeList.tsx                        CREATE  scroll + states           (~90)
    EmployeeListItem.tsx                    CREATE  one row                   (~80)
    EmployeeProfile.tsx                     CREATE  detail pane + tabs        (~130)
    ProfileHeader.tsx                       CREATE  avatar, name, actions     (~110)
    ProfileFields.tsx                       CREATE  three field groups        (~150)
    ProfileField.tsx                        CREATE  one field, read/edit      (~90)
    EmployeeAvatar.tsx                      CREATE  extracted from monolith   (~30)
    LeaveActionDialog.tsx                   CREATE  approve/reject confirm    (~100)
  employeeName.ts                           CREATE  employeeDisplayName only  (~8)
  useEmployeeFilters.ts                     CREATE  filter/sort derivation    (~70)
  LeaveSection.tsx                          REWRITE cards <md, table md+      (~200)
  DocumentManager.tsx                       MODIFY  tokens + mobile grid
  InactiveEmployees.tsx                     REWRITE reuse list components     (~150)
```

Files that change together live together: everything presentational sits in `components/`, derivation in the hook beside it.

---

### Task 1: Remove Aadhaar masking (backend)

Standalone, no frontend dependency. Do it first so the rebuilt profile is developed against real data.

**Files:**
- Modify: `backend/models/Employee.model.ts:253-263`

**Interfaces:**
- Consumes: nothing
- Produces: `GET /api/employees/:id` returns the full 12-digit `aadhaarNumber` instead of `XXXX-XXXX-1234`. Every consumer of the Employee model's `toJSON` is affected — this is intended and approved.

- [ ] **Step 1: Read the current transform**

Run: `sed -n '250,268p' backend/models/Employee.model.ts`

You should see a `toJSON.transform` that rewrites `ret.aadhaarNumber`.

- [ ] **Step 2: Remove the masking block**

Replace the `toJSON` option so the transform no longer rewrites the value. The `virtuals: true` setting must stay:

```ts
    toJSON: {
      virtuals: true,
    },
    toObject: { virtuals: true },
```

Delete the whole `transform` function, including the "Optionally mask sensitive data" and "PAN is not masked" comments — they described behaviour that no longer exists.

- [ ] **Step 3: Verify the backend still type-checks**

Run: `cd backend && pnpm type-check`
Expected: clean, no errors.

- [ ] **Step 4: Verify no other code depends on the mask**

Run: `grep -rn "XXXX" backend/ frontend/src/ --include=*.ts --include=*.tsx`
Expected: no hits that read or assert the masked format. If any exist, they are now dead and must be removed in this task.

- [ ] **Step 5: Commit**

```bash
git add backend/models/Employee.model.ts
git commit -m "fix: stop masking Aadhaar in Employee toJSON

HR needs the value the directory exists to display, and the endpoint is
already HR/admin-only — staff who can read it can already see PAN, bank
account numbers and salary. Masking also forced the frontend to strip the
field on save so the masked value would not overwrite the real one."
```

---

### Task 2: Tokenize `ui/badge` and `ui/tabs`

These two primitives hardcode colors, so building on them would reintroduce the exact problem this redesign removes. Only 4 and 2 consumers respectively, so the change is contained.

**Files:**
- Modify: `frontend/src/components/ui/badge.tsx:13-21`
- Modify: `frontend/src/components/ui/tabs.tsx:14-22,29-37`

**Interfaces:**
- Consumes: nothing
- Produces: `Badge` keeps its exact prop API — `variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error'`. `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent` keep the Radix API. Only classes change, so no call site needs editing.

- [ ] **Step 1: Replace the badge variant map**

In `badge.tsx`, swap the hardcoded map for token-based classes:

```tsx
  const variants: Record<BadgeVariant, string> = {
    default: 'bg-muted text-muted-foreground',
    primary: 'bg-primary/10 text-primary',
    secondary: 'bg-secondary text-secondary-foreground',
    success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
    error: 'bg-destructive/10 text-destructive',
  };
```

Success/warning stay semantically green/amber — status color carries meaning and must not become theme-neutral — but they now use one alpha-blended scale that works on both light and dark surfaces instead of a `bg-green-200 dark:bg-green-800` pair.

- [ ] **Step 2: Replace the tabs classes**

In `tabs.tsx`, `TabsList`:

```tsx
    "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
```

`TabsTrigger`:

```tsx
    "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
```

- [ ] **Step 3: Typecheck and lint**

Run: `cd frontend && pnpm typecheck && pnpm lint`
Expected: typecheck ≤102, lint ≤180. Report the actual numbers. Class-only changes should not move either.

- [ ] **Step 4: Visually verify existing consumers**

Run: `cd frontend && pnpm dev`, then check the 4 badge consumers and 2 tabs consumers in both light and dark mode:

```bash
grep -rl "ui/badge\|ui/tabs" frontend/src --include=*.tsx
```

Expected: badges and tabs remain legible in both themes; no invisible text.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui/badge.tsx frontend/src/components/ui/tabs.tsx
git commit -m "refactor: put ui/badge and ui/tabs on @theme tokens

Both primitives hardcoded slate/gray pairs, so anything built on them
inherited colors that ignore the theme. Prop APIs are unchanged."
```

---

### Task 3: Extract `EmployeeAvatar` and add `useEmployeeFilters`

Pure extraction plus new derivation logic, with no UI wired yet — this keeps the risky rewrite tasks smaller.

**Files:**
- Create: `frontend/src/components/hr/employeeDirectory/components/EmployeeAvatar.tsx`
- Create: `frontend/src/components/hr/employeeDirectory/useEmployeeFilters.ts`

**Interfaces:**
- Consumes: `Employee` from `@/types`; `Avatar, AvatarImage, AvatarFallback` from `@/components/ui/avatar`.
- Produces:
  - `EmployeeAvatar({ name: string; src?: string; className?: string })` from
    `components/EmployeeAvatar.tsx`
  - `employeeDisplayName(e: Pick<Employee,'name'|'firstName'|'lastName'>): string`
    from `employeeName.ts` — **its own module, not EmployeeAvatar.tsx.**
    Exporting a non-component alongside a component trips
    `react-refresh/only-export-components` and costs a lint warning per file.
  - `useEmployeeFilters({ employees, users }): { search, setSearch, department, setDepartment, employmentType, setEmploymentType, linkState, setLinkState, activeFilterCount, clearFilters, visible, total, linkedMap }`
  - `type LinkState = 'all' | 'linked' | 'unlinked'`

- [ ] **Step 1: Create `EmployeeAvatar.tsx`**

Move the avatar out of the monolith verbatim in behaviour — the deterministic tint must not change, or every employee's color shifts.

```tsx
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import type { Employee } from '@/types';

// Deterministic fallback tint so an employee without a photo keeps the same
// colour across renders. Mirrors ui/avatarIcon, which can only ever render the
// *logged-in* user's picture and so is not reusable for a list of employees.
const AVATAR_TINTS = [
    'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
    'bg-purple-500', 'bg-pink-500', 'bg-indigo-500',
];

export function employeeDisplayName(
    e: Pick<Employee, 'name' | 'firstName' | 'lastName'>,
): string {
    return e.name?.trim() || `${e.firstName ?? ''} ${e.lastName ?? ''}`.trim();
}

export function EmployeeAvatar({
    name,
    src,
    className = 'size-9',
}: {
    name: string;
    src?: string;
    className?: string;
}) {
    const trimmed = name.trim();
    const initial = trimmed.charAt(0).toUpperCase();
    const tint = AVATAR_TINTS[(trimmed.charCodeAt(0) || 0) % AVATAR_TINTS.length];

    return (
        <Avatar className={`${className} shrink-0`}>
            {src && <AvatarImage src={src} alt="" />}
            <AvatarFallback className={`${tint} text-white text-sm font-medium`}>
                {initial}
            </AvatarFallback>
        </Avatar>
    );
}
```

- [ ] **Step 2: Create `useEmployeeFilters.ts`**

`linkedMap` replaces the old per-row `users.some(...)` scan, which was O(rows × users) on every render.

```ts
import { useState } from 'react';
import type { Employee, User } from '@/types';
import { employeeDisplayName } from './employeeName';

export type LinkState = 'all' | 'linked' | 'unlinked';

export function useEmployeeFilters({
    employees,
    users,
}: {
    employees: Employee[];
    users: User[];
}) {
    const [search, setSearch] = useState('');
    const [department, setDepartment] = useState('all');
    const [employmentType, setEmploymentType] = useState('all');
    const [linkState, setLinkState] = useState<LinkState>('all');

    // employeeId -> linked user. One pass instead of a find/some per row.
    const linkedMap = new Map<string, User>();
    for (const u of users) {
        if (u.employeeId) linkedMap.set(u.employeeId, u);
    }

    const term = search.trim().toLowerCase();
    const visible = employees
        .filter((e) => {
            if (term && !employeeDisplayName(e).toLowerCase().includes(term)) return false;
            if (department !== 'all' && e.department !== department) return false;
            if (employmentType !== 'all' && e.employmentType !== employmentType) return false;
            if (linkState !== 'all') {
                const isLinked = linkedMap.has(e.employeeId);
                if (linkState === 'linked' && !isLinked) return false;
                if (linkState === 'unlinked' && isLinked) return false;
            }
            return true;
        })
        .sort((a, b) =>
            employeeDisplayName(a).localeCompare(employeeDisplayName(b), undefined, {
                sensitivity: 'base',
            }),
        );

    const activeFilterCount =
        (department !== 'all' ? 1 : 0) +
        (employmentType !== 'all' ? 1 : 0) +
        (linkState !== 'all' ? 1 : 0);

    const clearFilters = () => {
        setDepartment('all');
        setEmploymentType('all');
        setLinkState('all');
    };

    return {
        search, setSearch,
        department, setDepartment,
        employmentType, setEmploymentType,
        linkState, setLinkState,
        activeFilterCount, clearFilters,
        visible, total: employees.length, linkedMap,
    };
}
```

Note: no `useMemo` around the derivation. React Compiler is enabled and memoizes this automatically; adding it manually violates a project rule.

- [ ] **Step 3: Typecheck**

Run: `cd frontend && pnpm typecheck`
Expected: ≤102. New files are not yet imported, so this only proves they compile.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/hr/employeeDirectory/components/EmployeeAvatar.tsx frontend/src/components/hr/employeeDirectory/useEmployeeFilters.ts
git commit -m "refactor: extract EmployeeAvatar and add useEmployeeFilters

linkedMap replaces the per-row users.some() scan, which ran
O(rows x users) on every render of the directory list."
```

---

### Task 4: Build the list surface

`EmployeeListItem`, `EmployeeList`, `DirectoryToolbar`, `FilterSheet`, `DirectoryHeader`. Still not wired into the route — the orchestrator lands in Task 5.

**Files:**
- Create: `.../components/EmployeeListItem.tsx`
- Create: `.../components/EmployeeList.tsx`
- Create: `.../components/DirectoryToolbar.tsx`
- Create: `.../components/FilterSheet.tsx`
- Create: `.../components/DirectoryHeader.tsx`

**Interfaces:**
- Consumes: `EmployeeAvatar`, `employeeDisplayName` (Task 3); `useEmployeeFilters` return shape (Task 3); `Button`, `Badge`, `Input`, `Select*`, `Dialog*` from `ui/`.
- Produces:
  - `EmployeeListItem({ employee, isSelected, isLinked, onSelect })`
  - `EmployeeList({ employees, selectedId, linkedMap, isLoading, error, hasSearch, onSelect, onClearSearch })`
  - `DirectoryToolbar({ filters, departments, resultCount, total })` where `filters` is the `useEmployeeFilters` return value
  - `FilterSheet({ open, onOpenChange, filters, departments })`
  - `DirectoryHeader({ status, onStatusChange, onAdd, onLink })` with `status: 'active' | 'inactive'`

- [ ] **Step 1: Create `EmployeeListItem.tsx`**

Row is ~64px for a comfortable tap target. The unlink button is deliberately **absent** — it moves to the profile action menu, because a destructive control does not belong in a scrolling list on a phone.

```tsx
import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EmployeeAvatar } from './EmployeeAvatar';
import { employeeDisplayName } from '../employeeName';
import type { Employee } from '@/types';

export function EmployeeListItem({
    employee,
    isSelected,
    isLinked,
    onSelect,
}: {
    employee: Employee;
    isSelected: boolean;
    isLinked: boolean;
    onSelect: (id: string) => void;
}) {
    const name = employeeDisplayName(employee);
    const meta = [employee.position, employee.department].filter(Boolean).join(' · ');

    return (
        <li role="option" aria-selected={isSelected}>
            <button
                type="button"
                onClick={() => onSelect(employee._id)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset
                    ${isSelected ? 'bg-accent' : 'hover:bg-accent/50'}`}
            >
                <EmployeeAvatar name={name} src={employee.profilePicture} className="size-10" />
                <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-foreground">{name}</span>
                    {meta && (
                        <span className="block truncate text-sm text-muted-foreground">{meta}</span>
                    )}
                </span>
                {!isLinked && (
                    <Badge variant="warning" className="shrink-0">Unlinked</Badge>
                )}
                <ChevronRight className="size-4 shrink-0 text-muted-foreground lg:hidden" aria-hidden="true" />
            </button>
        </li>
    );
}
```

Only "Unlinked" is badged. Badging every row "Linked" is noise — the normal state needs no marker, and its absence makes the exceptions visible.

- [ ] **Step 2: Create `EmployeeList.tsx`**

Distinguishes "no employees" from "no search results", and provides keyboard navigation the old `<li onClick>` list lacked.

```tsx
import { Users, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmployeeListItem } from './EmployeeListItem';
import type { Employee, User } from '@/types';

function ListSkeleton() {
    return (
        <div className="space-y-1 p-4" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                    <div className="size-10 shrink-0 animate-pulse rounded-full bg-muted" />
                    <div className="flex-1 space-y-2">
                        <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
                        <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
                    </div>
                </div>
            ))}
        </div>
    );
}

export function EmployeeList({
    employees, selectedId, linkedMap, isLoading, error, hasSearch, onSelect, onClearSearch,
}: {
    employees: Employee[];
    selectedId: string | null;
    linkedMap: Map<string, User>;
    isLoading: boolean;
    error: string | null;
    hasSearch: boolean;
    onSelect: (id: string) => void;
    onClearSearch: () => void;
}) {
    if (isLoading) return <ListSkeleton />;

    if (error) {
        return (
            <div className="p-6 text-center">
                <p className="text-sm text-destructive">{error}</p>
            </div>
        );
    }

    if (employees.length === 0) {
        return hasSearch ? (
            <div className="p-8 text-center">
                <SearchX className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
                <p className="mt-3 font-medium text-foreground">No matches</p>
                <p className="mt-1 text-sm text-muted-foreground">
                    No employee matches your search and filters.
                </p>
                <Button variant="outline" size="sm" className="mt-4" onClick={onClearSearch}>
                    Clear search &amp; filters
                </Button>
            </div>
        ) : (
            <div className="p-8 text-center">
                <Users className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
                <p className="mt-3 font-medium text-foreground">No employees yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                    Add your first employee to get started.
                </p>
            </div>
        );
    }

    // Roving arrow-key navigation over the rendered buttons.
    const handleKeyDown = (e: React.KeyboardEvent<HTMLUListElement>) => {
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        const items = Array.from(
            e.currentTarget.querySelectorAll<HTMLButtonElement>('button'),
        );
        const idx = items.indexOf(document.activeElement as HTMLButtonElement);
        if (idx === -1) return;
        e.preventDefault();
        const next = e.key === 'ArrowDown'
            ? Math.min(idx + 1, items.length - 1)
            : Math.max(idx - 1, 0);
        items[next]?.focus();
    };

    return (
        <ul role="listbox" aria-label="Employees" onKeyDown={handleKeyDown} className="divide-y divide-border">
            {employees.map((e) => (
                <EmployeeListItem
                    key={e._id}
                    employee={e}
                    isSelected={selectedId === e._id}
                    isLinked={linkedMap.has(e.employeeId)}
                    onSelect={onSelect}
                />
            ))}
        </ul>
    );
}
```

- [ ] **Step 3: Create `FilterSheet.tsx`**

```tsx
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import type { useEmployeeFilters } from '../useEmployeeFilters';

type Filters = ReturnType<typeof useEmployeeFilters>;

const EMPLOYMENT_TYPES = ['fulltime', 'intern', 'remote'];

export function FilterSheet({
    open, onOpenChange, filters, departments,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    filters: Filters;
    departments: string[];
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>Filter employees</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div>
                        <Label htmlFor="filter-dept">Department</Label>
                        <Select value={filters.department} onValueChange={filters.setDepartment}>
                            <SelectTrigger id="filter-dept" className="mt-1.5">
                                <SelectValue placeholder="All departments" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All departments</SelectItem>
                                {departments.map((d) => (
                                    <SelectItem key={d} value={d}>{d}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label htmlFor="filter-type">Employment type</Label>
                        <Select value={filters.employmentType} onValueChange={filters.setEmploymentType}>
                            <SelectTrigger id="filter-type" className="mt-1.5">
                                <SelectValue placeholder="All types" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All types</SelectItem>
                                {EMPLOYMENT_TYPES.map((t) => (
                                    <SelectItem key={t} value={t}>{t}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label htmlFor="filter-link">Account status</Label>
                        <Select
                            value={filters.linkState}
                            onValueChange={(v) => filters.setLinkState(v as Filters['linkState'])}
                        >
                            <SelectTrigger id="filter-link" className="mt-1.5">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All employees</SelectItem>
                                <SelectItem value="linked">Linked to a user</SelectItem>
                                <SelectItem value="unlinked">Not linked</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="ghost" onClick={filters.clearFilters}>Clear all</Button>
                    <Button onClick={() => onOpenChange(false)}>
                        Show {filters.visible.length} result{filters.visible.length === 1 ? '' : 's'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
```

- [ ] **Step 4: Create `DirectoryToolbar.tsx`**

Search sticks to the top of the scroll area. Filters are inline `lg+`, a sheet below.

```tsx
import { useState } from 'react';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { FilterSheet } from './FilterSheet';
import type { useEmployeeFilters } from '../useEmployeeFilters';

type Filters = ReturnType<typeof useEmployeeFilters>;

export function DirectoryToolbar({
    filters, departments,
}: {
    filters: Filters;
    departments: string[];
}) {
    const [sheetOpen, setSheetOpen] = useState(false);

    return (
        <div className="sticky top-0 z-10 border-b border-border bg-card px-4 py-3">
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <Search
                        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                        aria-hidden="true"
                    />
                    <Input
                        type="search"
                        value={filters.search}
                        onChange={(e) => filters.setSearch(e.target.value)}
                        placeholder="Search employees…"
                        aria-label="Search employees"
                        className="pl-9 pr-9"
                    />
                    {filters.search && (
                        <button
                            type="button"
                            onClick={() => filters.setSearch('')}
                            aria-label="Clear search"
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <X className="size-4" />
                        </button>
                    )}
                </div>

                <Button
                    variant="outline"
                    size="icon"
                    className="relative lg:hidden"
                    onClick={() => setSheetOpen(true)}
                    aria-label={`Filters${filters.activeFilterCount ? `, ${filters.activeFilterCount} active` : ''}`}
                >
                    <SlidersHorizontal className="size-4" />
                    {filters.activeFilterCount > 0 && (
                        <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                            {filters.activeFilterCount}
                        </span>
                    )}
                </Button>
            </div>

            {/* Inline filters, desktop only */}
            <div className="mt-2 hidden items-center gap-2 lg:flex">
                <Select value={filters.department} onValueChange={filters.setDepartment}>
                    <SelectTrigger className="h-8 flex-1 text-xs" aria-label="Filter by department">
                        <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All departments</SelectItem>
                        {departments.map((d) => (
                            <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select
                    value={filters.linkState}
                    onValueChange={(v) => filters.setLinkState(v as Filters['linkState'])}
                >
                    <SelectTrigger className="h-8 flex-1 text-xs" aria-label="Filter by account status">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="linked">Linked</SelectItem>
                        <SelectItem value="unlinked">Unlinked</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
                {filters.visible.length === filters.total
                    ? `${filters.total} employee${filters.total === 1 ? '' : 's'}`
                    : `${filters.visible.length} of ${filters.total} employees`}
            </p>

            <FilterSheet
                open={sheetOpen}
                onOpenChange={setSheetOpen}
                filters={filters}
                departments={departments}
            />
        </div>
    );
}
```

- [ ] **Step 5: Create `DirectoryHeader.tsx`**

"Add Employee" is the single primary action; "Link User" is secondary. The old build gave four buttons equal weight.

```tsx
import { UserPlus, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function DirectoryHeader({
    status, onStatusChange, onAdd, onLink,
}: {
    status: 'active' | 'inactive';
    onStatusChange: (s: 'active' | 'inactive') => void;
    onAdd: () => void;
    onLink: () => void;
}) {
    return (
        <header className="border-b border-border bg-card px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-lg font-semibold text-foreground">Employees</h1>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={onLink}>
                        <Link2 className="size-4 sm:mr-2" aria-hidden="true" />
                        <span className="sr-only sm:not-sr-only">Link user</span>
                    </Button>
                    <Button size="sm" onClick={onAdd}>
                        <UserPlus className="size-4 sm:mr-2" aria-hidden="true" />
                        <span className="sr-only sm:not-sr-only">Add employee</span>
                    </Button>
                </div>
            </div>

            <Tabs
                value={status}
                onValueChange={(v) => onStatusChange(v as 'active' | 'inactive')}
                className="mt-3"
            >
                <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:inline-grid">
                    <TabsTrigger value="active">Active</TabsTrigger>
                    <TabsTrigger value="inactive">Inactive</TabsTrigger>
                </TabsList>
            </Tabs>
        </header>
    );
}
```

- [ ] **Step 6: Typecheck and lint**

Run: `cd frontend && pnpm typecheck && pnpm lint`
Expected: typecheck ≤102, lint ≤180. Report actual numbers.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/hr/employeeDirectory/components/
git commit -m "feat: add directory list, toolbar, filter sheet and header

Rows are 64px with 44px+ tap targets; the unlink control moves off the row
into the profile menu. Adds department / employment-type / link-state
filters, inline on desktop and in a sheet on mobile."
```

---

### Task 5: Profile detail components

**Files:**
- Create: `.../components/ProfileField.tsx`
- Create: `.../components/ProfileFields.tsx`
- Create: `.../components/ProfileHeader.tsx`

**Interfaces:**
- Consumes: `EmployeeAvatar`, `employeeDisplayName` (Task 3); `validateField` from `@/schemas/employeeValidation`; `sanitizeText` from `@/utils/sanitization`.
- Produces:
  - `ProfileField({ label, name, value, type?, options?, isEditing, error, onChange })` with `type?: 'text' | 'email' | 'tel' | 'date' | 'select'`
  - `ProfileFields({ employee, draft, isEditing, errors, onFieldChange })`
  - `ProfileHeader({ employee, isEditing, isSaving, isToggling, isLinked, onEdit, onCancel, onSave, onToggleStatus, onUnlink, onBack, showBack })`

- [ ] **Step 1: Create `ProfileField.tsx`**

This replaces `renderField`. Read mode uses a definition-list pair so the label and value are visually distinct — the old `<p><strong>Label:</strong> value</p>` rendered them at identical weight.

```tsx
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { sanitizeText } from '@/utils/sanitization';

export type ProfileFieldType = 'text' | 'email' | 'tel' | 'date' | 'select';

function formatDisplay(value: unknown, type: ProfileFieldType): string {
    if (value === null || value === undefined || value === '') return '—';
    if (type === 'date') {
        const d = new Date(String(value));
        return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB');
    }
    if (typeof value === 'object') return '—';
    return sanitizeText(String(value));
}

function toDateInputValue(value: unknown): string {
    if (!value) return '';
    const d = new Date(String(value));
    return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
}

export function ProfileField({
    label, name, value, type = 'text', options = [], isEditing, error, onChange,
}: {
    label: string;
    name: string;
    value: unknown;
    type?: ProfileFieldType;
    options?: string[];
    isEditing: boolean;
    error?: string;
    onChange: (name: string, value: string) => void;
}) {
    const fieldId = `field-${name}`;
    const errorId = `${fieldId}-error`;

    if (!isEditing) {
        return (
            <div className="py-1.5">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {label}
                </dt>
                <dd className="mt-0.5 text-sm text-foreground">{formatDisplay(value, type)}</dd>
            </div>
        );
    }

    const stringValue = type === 'date' ? toDateInputValue(value) : String(value ?? '');

    return (
        <div className="py-1.5">
            <Label htmlFor={fieldId} className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {label}
            </Label>
            {type === 'select' ? (
                <Select value={stringValue} onValueChange={(v) => onChange(name, v)}>
                    <SelectTrigger id={fieldId} className="mt-1" aria-invalid={!!error} aria-describedby={error ? errorId : undefined}>
                        <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent>
                        {options.map((o) => (
                            <SelectItem key={o} value={o}>{o}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            ) : (
                <Input
                    id={fieldId}
                    type={type}
                    value={stringValue}
                    onChange={(e) => onChange(name, e.target.value)}
                    aria-invalid={!!error}
                    aria-describedby={error ? errorId : undefined}
                    className="mt-1"
                />
            )}
            {error && (
                <p id={errorId} className="mt-1 text-xs text-destructive">{error}</p>
            )}
        </div>
    );
}
```

Note the `Input`/`SelectTrigger` call sites carry only layout classes (`mt-1`, `pl-9`) — never colors. Both primitives are already tokenized.

- [ ] **Step 2: Create `ProfileFields.tsx`**

Three groups, matching today's information architecture. `aadhaarNumber` is now a normal editable field — Task 1 removed the mask that forced it to be special.

```tsx
import { ProfileField, type ProfileFieldType } from './ProfileField';
import type { Employee } from '@/types';

type FieldDef = {
    label: string;
    name: keyof Employee | string;
    type?: ProfileFieldType;
    options?: string[];
    readOnly?: boolean;
};

const GROUPS: { title: string; fields: FieldDef[] }[] = [
    {
        title: 'Contact & work',
        fields: [
            { label: 'Email', name: 'email', type: 'email' },
            { label: 'Phone', name: 'phone', type: 'tel' },
            { label: 'Employee ID', name: 'employeeId', readOnly: true },
            { label: 'Department', name: 'department', readOnly: true },
            { label: 'Company', name: 'companyName' },
            { label: 'Employment type', name: 'employmentType', type: 'select', options: ['fulltime', 'intern', 'remote'] },
            { label: 'Joining date', name: 'joiningDate', type: 'date' },
            { label: 'Office', name: 'officeAddress', type: 'select', options: ['SanikColony', 'Indore', 'N.F.C.', 'Offsite'] },
            { label: 'Supervisor', name: 'reportingSupervisor' },
        ],
    },
    {
        title: 'Personal',
        fields: [
            { label: 'Date of birth', name: 'dateOfBirth', type: 'date' },
            { label: 'Gender', name: 'gender', type: 'select', options: ['male', 'female', 'other'] },
            { label: 'Marital status', name: 'maritalStatus', type: 'select', options: ['single', 'married', 'divorced'] },
            { label: "Father's name", name: 'fatherName' },
            { label: "Father's phone", name: 'fatherPhone', type: 'tel' },
            { label: "Mother's name", name: 'motherName' },
            { label: "Mother's phone", name: 'motherPhone', type: 'tel' },
            { label: 'Address', name: 'address' },
            { label: 'Aadhaar', name: 'aadhaarNumber' },
            { label: 'PAN', name: 'panNumber' },
            { label: 'Emergency contact', name: 'emergencyContactName' },
            { label: 'Emergency number', name: 'emergencyContactNumber', type: 'tel' },
        ],
    },
    {
        title: 'Financial',
        fields: [
            { label: 'Bank', name: 'bankName' },
            { label: 'Account number', name: 'bankAccountNumber' },
            { label: 'IFSC', name: 'bankIFSCCode' },
            { label: 'Payment mode', name: 'paymentMode', type: 'select', options: ['Bank Transfer', 'Cheque', 'Cash'] },
        ],
    },
];

export function ProfileFields({
    employee, draft, isEditing, errors, onFieldChange,
}: {
    employee: Employee;
    draft: Partial<Employee> | null;
    isEditing: boolean;
    errors: Record<string, string>;
    onFieldChange: (name: string, value: string) => void;
}) {
    const source = (isEditing && draft ? draft : employee) as Record<string, unknown>;

    return (
        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {GROUPS.map((group) => (
                <section key={group.title}>
                    <h3 className="mb-2 text-sm font-semibold text-foreground">{group.title}</h3>
                    <dl className="divide-y divide-border rounded-lg border border-border bg-card px-4 py-1">
                        {group.fields.map((f) => (
                            <ProfileField
                                key={String(f.name)}
                                label={f.label}
                                name={String(f.name)}
                                value={source[String(f.name)]}
                                type={f.type}
                                options={f.options}
                                isEditing={isEditing && !f.readOnly}
                                error={errors[String(f.name)]}
                                onChange={onFieldChange}
                            />
                        ))}
                    </dl>
                </section>
            ))}
        </div>
    );
}
```

- [ ] **Step 3: Create `ProfileHeader.tsx`**

Destructive actions (deactivate, unlink) sit behind an overflow menu rather than as always-visible buttons.

```tsx
import { useState } from 'react';
import { ArrowLeft, Pencil, MoreVertical, Link2Off, UserX, UserCheck, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmployeeAvatar } from './EmployeeAvatar';
import { employeeDisplayName } from '../employeeName';
import type { Employee } from '@/types';

export function ProfileHeader({
    employee, isEditing, isSaving, isToggling, isLinked,
    onEdit, onCancel, onSave, onToggleStatus, onUnlink, onBack, showBack,
}: {
    employee: Employee;
    isEditing: boolean;
    isSaving: boolean;
    isToggling: boolean;
    isLinked: boolean;
    onEdit: () => void;
    onCancel: () => void;
    onSave: () => void;
    onToggleStatus: () => void;
    onUnlink: () => void;
    onBack: () => void;
    showBack: boolean;
}) {
    const name = employeeDisplayName(employee);
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <div className="border-b border-border bg-card px-4 py-3">
            {showBack && (
                <Button variant="ghost" size="sm" className="-ml-2 mb-2" onClick={onBack}>
                    <ArrowLeft className="mr-1.5 size-4" aria-hidden="true" />
                    Employees
                </Button>
            )}

            <div className="flex items-start gap-3">
                <EmployeeAvatar name={name} src={employee.profilePicture} className="size-14" />
                <div className="min-w-0 flex-1">
                    <h2 className="truncate text-lg font-semibold text-foreground">{name}</h2>
                    <p className="truncate text-sm text-muted-foreground">
                        {[employee.position, employee.department].filter(Boolean).join(' · ') || '—'}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <Badge variant={employee.isActive ? 'success' : 'error'}>
                            {employee.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        {!isLinked && <Badge variant="warning">No user account</Badge>}
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    {isEditing ? (
                        <>
                            <Button variant="ghost" size="sm" onClick={onCancel} disabled={isSaving}>
                                <X className="size-4 sm:mr-1.5" aria-hidden="true" />
                                <span className="sr-only sm:not-sr-only">Cancel</span>
                            </Button>
                            <Button size="sm" onClick={onSave} disabled={isSaving}>
                                <Save className="size-4 sm:mr-1.5" aria-hidden="true" />
                                <span className="sr-only sm:not-sr-only">
                                    {isSaving ? 'Saving…' : 'Save'}
                                </span>
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="outline" size="sm" onClick={onEdit}>
                                <Pencil className="size-4 sm:mr-1.5" aria-hidden="true" />
                                <span className="sr-only sm:not-sr-only">Edit</span>
                            </Button>
                            <div className="relative">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setMenuOpen((o) => !o)}
                                    aria-label="More actions"
                                    aria-expanded={menuOpen}
                                    aria-haspopup="menu"
                                >
                                    <MoreVertical className="size-4" />
                                </Button>
                                {menuOpen && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-10"
                                            aria-hidden="true"
                                            onClick={() => setMenuOpen(false)}
                                        />
                                        <div
                                            role="menu"
                                            className="absolute right-0 top-full z-20 mt-1 w-52 overflow-hidden rounded-md border border-border bg-popover py-1 shadow-md"
                                        >
                                            {isLinked && (
                                                <button
                                                    type="button"
                                                    role="menuitem"
                                                    onClick={() => { setMenuOpen(false); onUnlink(); }}
                                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-accent focus-visible:outline-none focus-visible:bg-accent"
                                                >
                                                    <Link2Off className="size-4" aria-hidden="true" />
                                                    Unlink user account
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                role="menuitem"
                                                disabled={isToggling}
                                                onClick={() => { setMenuOpen(false); onToggleStatus(); }}
                                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-destructive hover:bg-accent focus-visible:outline-none focus-visible:bg-accent disabled:opacity-50"
                                            >
                                                {employee.isActive
                                                    ? <><UserX className="size-4" aria-hidden="true" />Deactivate employee</>
                                                    : <><UserCheck className="size-4" aria-hidden="true" />Activate employee</>}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 4: Typecheck and lint**

Run: `cd frontend && pnpm typecheck && pnpm lint`
Expected: typecheck ≤102, lint ≤180. Report actual numbers.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/hr/employeeDirectory/components/
git commit -m "feat: add profile header, field groups and ProfileField

ProfileField replaces the renderField factory: one typed component instead
of ~100 lines of duplicated raw inputs, with aria-invalid and
aria-describedby wired consistently. Read mode uses dt/dd so labels and
values are no longer identical weight. Aadhaar is a normal field now."
```

---

### Task 6: Leave section with working approve/reject

**Files:**
- Create: `.../components/LeaveActionDialog.tsx`
- Rewrite: `.../LeaveSection.tsx`

**Interfaces:**
- Consumes: `useUpdateLeaveStatus` from `@/hooks/queries`; `Leave` from `@/types`; `Badge`, `Button`, `Dialog*`.
- Produces:
  - `LeaveActionDialog({ leave, action, onOpenChange, onConfirm, isPending })` with `action: 'approved' | 'rejected' | null`
  - `LeaveSection({ leaves, isLoading })` — note the prop change: `employeeProfile` is dropped because the old component never used it for anything.

- [ ] **Step 1: Confirm the mutation contract before building**

Run: `sed -n '163,180p' frontend/src/hooks/queries/useLeaves.ts` and `sed -n '37,40p' backend/validators/request.schemas.ts`

Expected: `mutate({ leaveId, status })`, and the backend schema accepts **only** `status: z.enum(['approved','rejected'])`. There is no rejection-reason field — the dialog must be confirm-only. Do not add a reason input; it would be silently discarded.

- [ ] **Step 2: Create `LeaveActionDialog.tsx`**

```tsx
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Leave } from '@/types';

function formatRange(leave: Leave): string {
    const start = new Date(leave.startDate).toLocaleDateString('en-GB');
    if (!leave.endDate || leave.endDate === leave.startDate) return start;
    return `${start} – ${new Date(leave.endDate).toLocaleDateString('en-GB')}`;
}

export function LeaveActionDialog({
    leave, action, onOpenChange, onConfirm, isPending,
}: {
    leave: Leave | null;
    action: 'approved' | 'rejected' | null;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    isPending: boolean;
}) {
    if (!leave || !action) return null;
    const approving = action === 'approved';

    return (
        <Dialog open onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{approving ? 'Approve leave request?' : 'Reject leave request?'}</DialogTitle>
                    <DialogDescription>
                        {approving
                            ? 'The employee will be notified and their attendance updated.'
                            : 'The employee will be notified that this request was rejected.'}
                    </DialogDescription>
                </DialogHeader>

                <dl className="space-y-2 rounded-lg border border-border bg-muted/40 p-3 text-sm">
                    <div className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">Type</dt>
                        <dd className="font-medium text-foreground">{leave.leaveType}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">Dates</dt>
                        <dd className="font-medium text-foreground">{formatRange(leave)}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                        <dt className="shrink-0 text-muted-foreground">Reason</dt>
                        <dd className="text-right text-foreground">{leave.reason || '—'}</dd>
                    </div>
                </dl>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                        Cancel
                    </Button>
                    <Button
                        variant={approving ? 'default' : 'destructive'}
                        onClick={onConfirm}
                        disabled={isPending}
                    >
                        {isPending ? 'Saving…' : approving ? 'Approve' : 'Reject'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
```

- [ ] **Step 3: Rewrite `LeaveSection.tsx`**

Cards below `md`, table from `md` up. The 6-column table was unusable at 375px.

```tsx
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useUpdateLeaveStatus } from '@/hooks/queries';
import { useToast } from '@/components/ui/toast';
import { LeaveActionDialog } from './components/LeaveActionDialog';
import type { Leave } from '@/types';

type LeaveAction = 'approved' | 'rejected';

function statusVariant(status: string) {
    if (status === 'approved') return 'success' as const;
    if (status === 'rejected') return 'error' as const;
    return 'warning' as const;
}

function formatRange(leave: Leave): string {
    const start = new Date(leave.startDate).toLocaleDateString('en-GB');
    if (!leave.endDate || leave.endDate === leave.startDate) return start;
    return `${start} – ${new Date(leave.endDate).toLocaleDateString('en-GB')}`;
}

export default function LeaveSection({ leaves }: { leaves: Leave[] }) {
    const { toast } = useToast();
    const updateStatus = useUpdateLeaveStatus();
    const [pendingAction, setPendingAction] = useState<{ leave: Leave; action: LeaveAction } | null>(null);

    const handleConfirm = () => {
        if (!pendingAction) return;
        const { leave, action } = pendingAction;
        updateStatus.mutate(
            { leaveId: leave._id, status: action },
            {
                onSuccess: () => {
                    toast({
                        title: action === 'approved' ? 'Leave approved' : 'Leave rejected',
                        description: `${leave.leaveType} · ${formatRange(leave)}`,
                    });
                    setPendingAction(null);
                },
                onError: (error: Error) => {
                    toast({
                        variant: 'destructive',
                        title: 'Could not update request',
                        description: error.message || 'Please try again.',
                    });
                },
            },
        );
    };

    if (leaves.length === 0) {
        return (
            <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                No leave requests yet.
            </p>
        );
    }

    const sorted = [...leaves].sort(
        (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
    );

    return (
        <>
            {/* Mobile: cards */}
            <ul className="space-y-2 md:hidden">
                {sorted.map((leave) => (
                    <li key={leave._id} className="rounded-lg border border-border bg-card p-3">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <p className="font-medium text-foreground">{leave.leaveType}</p>
                                <p className="text-sm text-muted-foreground">{formatRange(leave)}</p>
                            </div>
                            <Badge variant={statusVariant(leave.status)}>{leave.status}</Badge>
                        </div>
                        {leave.reason && (
                            <p className="mt-2 text-sm text-muted-foreground">{leave.reason}</p>
                        )}
                        {leave.status === 'pending' && (
                            <div className="mt-3 flex gap-2">
                                <Button
                                    size="sm"
                                    className="flex-1"
                                    onClick={() => setPendingAction({ leave, action: 'approved' })}
                                >
                                    Approve
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => setPendingAction({ leave, action: 'rejected' })}
                                >
                                    Reject
                                </Button>
                            </div>
                        )}
                    </li>
                ))}
            </ul>

            {/* Desktop: table */}
            <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
                <table className="min-w-full text-sm">
                    <thead className="bg-muted/50">
                        <tr>
                            <th scope="col" className="p-3 text-left font-medium text-muted-foreground">Type</th>
                            <th scope="col" className="p-3 text-left font-medium text-muted-foreground">Period</th>
                            <th scope="col" className="p-3 text-left font-medium text-muted-foreground">Status</th>
                            <th scope="col" className="p-3 text-left font-medium text-muted-foreground">Reason</th>
                            <th scope="col" className="p-3 text-right font-medium text-muted-foreground">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {sorted.map((leave) => (
                            <tr key={leave._id} className="hover:bg-accent/40">
                                <td className="p-3 whitespace-nowrap text-foreground">{leave.leaveType}</td>
                                <td className="p-3 whitespace-nowrap text-foreground">{formatRange(leave)}</td>
                                <td className="p-3"><Badge variant={statusVariant(leave.status)}>{leave.status}</Badge></td>
                                <td className="max-w-xs truncate p-3 text-muted-foreground" title={leave.reason}>
                                    {leave.reason || '—'}
                                </td>
                                <td className="p-3 text-right whitespace-nowrap">
                                    {leave.status === 'pending' && (
                                        <div className="flex justify-end gap-2">
                                            <Button size="sm" onClick={() => setPendingAction({ leave, action: 'approved' })}>
                                                Approve
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={() => setPendingAction({ leave, action: 'rejected' })}>
                                                Reject
                                            </Button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <LeaveActionDialog
                leave={pendingAction?.leave ?? null}
                action={pendingAction?.action ?? null}
                onOpenChange={(open) => { if (!open) setPendingAction(null); }}
                onConfirm={handleConfirm}
                isPending={updateStatus.isPending}
            />
        </>
    );
}
```

The old `LeaveRequestsTable` named export and the stats tiles are dropped. If `grep -rn "LeaveRequestsTable" frontend/src` finds consumers, keep a compatible export; otherwise let it go.

- [ ] **Step 4: Check for other consumers before deleting the old export**

Run: `grep -rn "LeaveRequestsTable\|LeaveSection" frontend/src --include=*.tsx`
Expected: only `EmployeeDirectory.tsx` (being rewritten in Task 7). If anything else imports it, adapt that call site in this task.

- [ ] **Step 5: Typecheck and lint**

Run: `cd frontend && pnpm typecheck && pnpm lint`
Expected: typecheck ≤102, lint ≤180. Report actual numbers.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/hr/employeeDirectory/LeaveSection.tsx frontend/src/components/hr/employeeDirectory/components/LeaveActionDialog.tsx
git commit -m "feat: make leave approve/reject actually work

The buttons were console.log stubs. They now call useUpdateLeaveStatus
behind a confirm dialog showing the request being actioned, matching the
dashboard's pending-requests pattern. Backend accepts status only, so
reject is confirm-only with no reason field.

Table becomes cards below md; six columns were unusable at 375px."
```

---

### Task 7: Rewrite the orchestrator and wire everything up

The task that replaces the monolith. All bugs from the spec's "Bugs Fixed" list are addressed here.

**Files:**
- Rewrite: `frontend/src/components/hr/employeeDirectory/EmployeeDirectory.tsx`
- Create: `.../components/EmployeeProfile.tsx`

**Interfaces:**
- Consumes: every component from Tasks 3–6.
- Produces: the route element for `/employees` and `/employees/:employeeId`. No changes to `main.tsx` — the existing routes already cover both.

- [ ] **Step 1: Create `EmployeeProfile.tsx`**

Owns edit state and the four-way tab set. Attendance and documents are rendered as-is; their internals are out of scope.

```tsx
import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ProfileHeader } from './ProfileHeader';
import { ProfileFields } from './ProfileFields';
import LeaveSection from '../LeaveSection';
import DocumentManager from '../DocumentManager';
import AttendanceSection from '../AttendanceSection';
import type { Employee, Leave, AttendanceRecord } from '@/types';

export function EmployeeProfile({
    employee, leaves, isLinked, isEditing, draft, errors, isSaving, isToggling,
    dateRange, onDateRangeChange, onEditAttendance, attendanceTrigger,
    onEdit, onCancel, onSave, onFieldChange, onToggleStatus, onUnlink, onBack, showBack,
}: {
    employee: Employee;
    leaves: Leave[];
    isLinked: boolean;
    isEditing: boolean;
    draft: Partial<Employee> | null;
    errors: Record<string, string>;
    isSaving: boolean;
    isToggling: boolean;
    dateRange: { startDate: string; endDate: string };
    onDateRangeChange: React.Dispatch<React.SetStateAction<{ startDate: string; endDate: string }>>;
    onEditAttendance: (record: AttendanceRecord) => void;
    attendanceTrigger: number;
    onEdit: () => void;
    onCancel: () => void;
    onSave: () => void;
    onFieldChange: (name: string, value: string) => void;
    onToggleStatus: () => void;
    onUnlink: () => void;
    onBack: () => void;
    showBack: boolean;
}) {
    const [tab, setTab] = useState('profile');

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <ProfileHeader
                employee={employee}
                isEditing={isEditing}
                isSaving={isSaving}
                isToggling={isToggling}
                isLinked={isLinked}
                onEdit={onEdit}
                onCancel={onCancel}
                onSave={onSave}
                onToggleStatus={onToggleStatus}
                onUnlink={onUnlink}
                onBack={onBack}
                showBack={showBack}
            />

            <Tabs value={tab} onValueChange={setTab} className="flex-1 p-4">
                <TabsList className="grid w-full grid-cols-4 sm:w-auto sm:inline-grid">
                    <TabsTrigger value="profile">Profile</TabsTrigger>
                    <TabsTrigger value="attendance">Attendance</TabsTrigger>
                    <TabsTrigger value="leave">Leave</TabsTrigger>
                    <TabsTrigger value="documents">Docs</TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="mt-4">
                    <ProfileFields
                        employee={employee}
                        draft={draft}
                        isEditing={isEditing}
                        errors={errors}
                        onFieldChange={onFieldChange}
                    />
                </TabsContent>

                <TabsContent value="attendance" className="mt-4">
                    <AttendanceSection
                        employeeProfile={employee}
                        dateRange={dateRange}
                        onDateRangeChange={onDateRangeChange}
                        onEditAttendance={onEditAttendance}
                        updateTrigger={attendanceTrigger}
                    />
                </TabsContent>

                <TabsContent value="leave" className="mt-4">
                    <LeaveSection leaves={leaves} />
                </TabsContent>

                <TabsContent value="documents" className="mt-4">
                    <DocumentManager employeeProfile={employee} onBack={() => setTab('profile')} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
```

- [ ] **Step 2: Rewrite `EmployeeDirectory.tsx`**

Read the old file's `handleSaveEmployee` first (`sed -n '208,266p'`) — the `_id` strip and `sanitizeText` calls must be preserved exactly. The `aadhaarNumber` strips are deleted, since Task 1 removed the mask that required them.

```tsx
import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import useAuth from '../../../hooks/authjwt';
import {
    useEmployees, useEmployee, useAllLeaves, useUsers,
    useUpdateEmployee, useToggleEmployeeStatus, useUnlinkEmployeeFromUser,
} from '../../../hooks/queries';
import { useDepartments } from '../../../hooks/queries';
import { useMediaQuery } from '../../../hooks/use-media-query';
import { useToast } from '../../ui/toast';
import { useConfirm } from '../../ui/confirm-dialog';
import { sanitizeText } from '../../../utils/sanitization';
import { validateUpdateEmployee, validateField } from '../../../schemas/employeeValidation';
import { useEmployeeFilters } from './useEmployeeFilters';
import { DirectoryHeader } from './components/DirectoryHeader';
import { DirectoryToolbar } from './components/DirectoryToolbar';
import { EmployeeList } from './components/EmployeeList';
import { EmployeeProfile } from './components/EmployeeProfile';
import { employeeDisplayName } from './employeeName';
import InactiveEmployees from './InactiveEmployees';
import { EditAttendanceModal } from './AttendanceSection';
import { Users } from 'lucide-react';
import type { Employee, AttendanceRecord } from '../../../types';

function monthRange() {
    const today = new Date();
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const fmt = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { startDate: fmt(first), endDate: fmt(last) };
}

export default function EmployeeDirectory() {
    const navigate = useNavigate();
    const { employeeId: selectedId = null } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const userObject = useAuth();
    const { toast } = useToast();
    const confirm = useConfirm();

    const isDesktop = useMediaQuery('(min-width: 1024px)');
    const status = searchParams.get('status') === 'inactive' ? 'inactive' : 'active';

    const [dateRange, setDateRange] = useState(monthRange);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
    const [attendanceTrigger, setAttendanceTrigger] = useState(0);
    const [isEditing, setIsEditing] = useState(false);
    const [draft, setDraft] = useState<Partial<Employee> | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const { data: employees = [], isLoading, error: employeesError } = useEmployees({ status: 'active' });
    const { data: users = [] } = useUsers();
    const { data: departments = [] } = useDepartments();
    const { data: employeeProfile, isLoading: profileLoading } = useEmployee(selectedId ?? '');

    // Scoped server-side. The previous call passed the filter as the whole
    // options object, so `params` was undefined and this fetched every leave
    // in the system on each profile view, then filtered client-side.
    const { data: leaves = [] } = useAllLeaves({
        params: employeeProfile?.employeeId ? { employeeId: employeeProfile.employeeId } : undefined,
        enabled: !!employeeProfile?.employeeId,
    });

    const updateEmployee = useUpdateEmployee();
    const toggleStatus = useToggleEmployeeStatus();
    const unlink = useUnlinkEmployeeFromUser();

    const filters = useEmployeeFilters({ employees, users });

    // Authorization is enforced by <RequireRole roles={HR_ONLY}> on the route,
    // which decodes the JWT synchronously during render. useAuth() is *not* a
    // usable authorization source here: it starts at null and only decodes the
    // token in an effect, i.e. after first paint. Gating on it made an
    // unresolved auth state render as a denial, flashing "Not authorized" for
    // a frame on every visit. Render a neutral loading state until it resolves.
    if (!userObject) {
        return <div className="p-6 text-center text-muted-foreground">Loading…</div>;
    }

    const selectEmployee = (id: string) => navigate(`/employees/${id}`);
    const goBack = () => navigate(`/employees${status === 'inactive' ? '?status=inactive' : ''}`);

    const setStatus = (next: 'active' | 'inactive') => {
        const params = new URLSearchParams(searchParams);
        if (next === 'inactive') params.set('status', 'inactive');
        else params.delete('status');
        setSearchParams(params, { replace: true });
    };

    const handleFieldChange = (name: string, value: string) => {
        setDraft((prev) => ({ ...(prev ?? {}), [name]: value }));
        const result = validateField(name as keyof Employee, value);
        setErrors((prev) => {
            if (result.valid) {
                const { [name]: _removed, ...rest } = prev;
                return rest;
            }
            return { ...prev, [name]: result.error };
        });
    };

    const handleSave = () => {
        if (!draft || !employeeProfile) return;

        // employeeId is displayed read-only and can contain slashes that fail
        // the regex, so it is never submitted.
        const { employeeId: _empId, ...editable } = draft as Record<string, unknown>;

        const validation = validateUpdateEmployee({ ...editable, _id: employeeProfile._id });
        if (!validation.success) {
            const [field, message] = Object.entries(validation.errors)[0];
            toast({ variant: 'destructive', title: 'Check this field', description: `${field}: ${message}` });
            setErrors(validation.errors);
            return;
        }

        // MongoDB rejects $set on the immutable _id.
        const { _id: _omit, ...fields } = validation.data as Record<string, unknown>;

        updateEmployee.mutate(
            {
                id: employeeProfile._id,
                ...fields,
                firstName: sanitizeText(String(fields.firstName ?? '')),
                lastName: sanitizeText(String(fields.lastName ?? '')),
                address: sanitizeText(String(fields.address ?? '')),
            } as Parameters<typeof updateEmployee.mutate>[0],
            {
                onSuccess: () => {
                    setIsEditing(false);
                    setDraft(null);
                    setErrors({});
                    toast({ title: 'Saved', description: 'Employee updated.' });
                },
                onError: (error: Error) => {
                    toast({ variant: 'destructive', title: 'Update failed', description: error.message });
                },
            },
        );
    };

    const handleToggleStatus = async () => {
        if (!employeeProfile) return;
        const name = employeeDisplayName(employeeProfile);
        const deactivating = employeeProfile.isActive === true;
        const ok = await confirm({
            title: deactivating ? 'Deactivate employee?' : 'Activate employee?',
            description: deactivating
                ? `${name} will lose access and drop off active employee lists.`
                : `${name} will regain access to the system.`,
            confirmText: deactivating ? 'Deactivate' : 'Activate',
            destructive: deactivating,
        });
        if (!ok) return;

        toggleStatus.mutate(employeeProfile._id, {
            onSuccess: () => {
                toast({ title: deactivating ? 'Employee deactivated' : 'Employee activated' });
                if (deactivating) goBack();
            },
            onError: (error: Error) => {
                toast({ variant: 'destructive', title: 'Action failed', description: error.message });
            },
        });
    };

    const handleUnlink = async () => {
        if (!employeeProfile) return;
        const linkedUser = filters.linkedMap.get(employeeProfile.employeeId);
        if (!linkedUser) return;
        const name = employeeDisplayName(employeeProfile);
        const ok = await confirm({
            title: 'Unlink user account?',
            description: `Unlink "${linkedUser.name}" from ${name}? This revokes their login access.`,
            confirmText: 'Unlink',
            destructive: true,
        });
        if (!ok) return;

        unlink.mutate({ userId: linkedUser._id }, {
            onSuccess: () => toast({ title: 'Unlinked', description: `${linkedUser.name} no longer has access.` }),
            onError: (error: Error) =>
                toast({ variant: 'destructive', title: 'Unlink failed', description: error.message }),
        });
    };

    if (status === 'inactive') {
        return (
            <div className="min-h-full bg-background">
                <DirectoryHeader
                    status={status}
                    onStatusChange={setStatus}
                    onAdd={() => navigate('/employees/add')}
                    onLink={() => navigate('/employees/link')}
                />
                <div className="p-4"><InactiveEmployees /></div>
            </div>
        );
    }

    const listPane = (
        <div className="flex min-h-0 flex-col lg:w-90 lg:shrink-0 lg:border-r lg:border-border">
            <DirectoryToolbar filters={filters} departments={departments} />
            <div className="flex-1 lg:overflow-y-auto">
                <EmployeeList
                    employees={filters.visible}
                    selectedId={selectedId}
                    linkedMap={filters.linkedMap}
                    isLoading={isLoading && employees.length === 0}
                    error={employeesError ? 'Could not load employees.' : null}
                    hasSearch={!!filters.search || filters.activeFilterCount > 0}
                    onSelect={selectEmployee}
                    onClearSearch={() => { filters.setSearch(''); filters.clearFilters(); }}
                />
            </div>
        </div>
    );

    const profilePane = profileLoading ? (
        <div className="flex-1 p-6 text-center text-muted-foreground">Loading profile…</div>
    ) : employeeProfile ? (
        <EmployeeProfile
            employee={employeeProfile}
            leaves={leaves}
            isLinked={filters.linkedMap.has(employeeProfile.employeeId)}
            isEditing={isEditing}
            draft={draft}
            errors={errors}
            isSaving={updateEmployee.isPending}
            isToggling={toggleStatus.isPending}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            onEditAttendance={(record) => { setEditingRecord(record); setEditModalOpen(true); }}
            attendanceTrigger={attendanceTrigger}
            onEdit={() => { setIsEditing(true); setDraft({ ...employeeProfile }); }}
            onCancel={() => { setIsEditing(false); setDraft(null); setErrors({}); }}
            onSave={handleSave}
            onFieldChange={handleFieldChange}
            onToggleStatus={handleToggleStatus}
            onUnlink={handleUnlink}
            onBack={goBack}
            showBack={!isDesktop}
        />
    ) : (
        <div className="flex flex-1 items-center justify-center p-10 text-center">
            <div>
                <Users className="mx-auto size-10 text-muted-foreground" aria-hidden="true" />
                <p className="mt-3 font-medium text-foreground">Select an employee</p>
                <p className="mt-1 text-sm text-muted-foreground">
                    Choose someone from the list to view their details.
                </p>
            </div>
        </div>
    );

    // Mobile is a two-screen flow: the list at /employees, the profile at
    // /employees/:id. A real route change means the PWA back gesture works.
    if (!isDesktop) {
        return (
            <div className="min-h-full bg-background">
                {selectedId ? profilePane : (
                    <>
                        <DirectoryHeader
                            status={status}
                            onStatusChange={setStatus}
                            onAdd={() => navigate('/employees/add')}
                            onLink={() => navigate('/employees/link')}
                        />
                        {listPane}
                    </>
                )}
                <EditAttendanceModal
                    isOpen={editModalOpen}
                    onClose={() => setEditModalOpen(false)}
                    record={editingRecord}
                    employeeProfile={employeeProfile}
                    onUpdate={() => { setAttendanceTrigger((n) => n + 1); setEditModalOpen(false); setEditingRecord(null); }}
                />
            </div>
        );
    }

    return (
        <div className="flex min-h-full flex-col bg-background">
            <DirectoryHeader
                status={status}
                onStatusChange={setStatus}
                onAdd={() => navigate('/employees/add')}
                onLink={() => navigate('/employees/link')}
            />
            <div className="flex min-h-0 flex-1 lg:h-[calc(100dvh-8rem)]">
                {listPane}
                <div className="flex min-w-0 flex-1 flex-col lg:overflow-y-auto">{profilePane}</div>
            </div>
            <EditAttendanceModal
                isOpen={editModalOpen}
                onClose={() => setEditModalOpen(false)}
                record={editingRecord}
                employeeProfile={employeeProfile}
                onUpdate={() => { setAttendanceTrigger((n) => n + 1); setEditModalOpen(false); setEditingRecord(null); }}
            />
        </div>
    );
}
```

`lg:w-90` needs a `--spacing`-based width; if the class does not resolve under this Tailwind v4 setup, use `lg:w-[360px]`.

- [ ] **Step 3: Verify no `position: fixed` bottom elements were introduced**

Run: `grep -n "fixed\|h-screen" frontend/src/components/hr/employeeDirectory/EmployeeDirectory.tsx frontend/src/components/hr/employeeDirectory/components/*.tsx`

Expected: only the menu-dismiss overlay in `ProfileHeader.tsx` (`fixed inset-0`, which is correct for a click-outside catcher). No `h-screen`, no fixed bottom bars — the app shell at `Sidebar.tsx:288` owns the scroll context and already renders the mobile bottom bar plus its spacer.

- [ ] **Step 4: Typecheck and lint**

Run: `cd frontend && pnpm typecheck && pnpm lint`
Expected: typecheck **below 102**, lint **below 180** — this task deletes the `as any` casts and the `renderField` factory. Report actual numbers. If either rose, fix before committing.

- [ ] **Step 5: Build**

Run: `cd frontend && pnpm build`
Expected: success. Remember this does not type-check; Step 4 is what proves types.

- [ ] **Step 6: Exercise the page in a browser**

Run: `cd frontend && pnpm dev`

At 375px width (device toolbar):
- `/employees` shows only the list; no profile below it.
- Tapping a row navigates to `/employees/:id` and shows only the profile.
- Browser back returns to the list.
- The filter button opens the sheet; the badge shows the active count.
- Search filters the list and the count updates.
- All four profile tabs render.

At desktop width:
- Two panes side by side; selecting a row updates the right pane.
- The Active/Inactive tab switches and survives a page reload (URL carries it).

Both: toggle dark mode and confirm no invisible text.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/hr/employeeDirectory/
git commit -m "feat: rebuild employee directory orchestrator

Replaces the 733-line monolith. Mobile is now a real two-screen flow
(/employees -> /employees/:id) so the PWA back gesture works, instead of
the desktop layout stacked with a max-h-96 list above the profile.

Fixes: useAllLeaves called with the filter as its options object, which
fetched every leave in the system per profile view; useEmployee passed an
argument it does not accept; window.location.href full page reload;
active/inactive tab held in state while selection lived in the URL;
selectedEmployeeId mirroring the URL param in state; per-row users.some()
scans; assorted as-any casts."
```

---

### Task 8: Bring `InactiveEmployees` and `DocumentManager` onto the new system

**Files:**
- Rewrite: `frontend/src/components/hr/employeeDirectory/InactiveEmployees.tsx`
- Modify: `frontend/src/components/hr/employeeDirectory/DocumentManager.tsx`

**Interfaces:**
- Consumes: `EmployeeAvatar`, `employeeDisplayName` (Task 3); `Badge`, `Button`, `Dialog*`.
- Produces: `InactiveEmployees()` — unchanged export, no props, still default-exported.

- [ ] **Step 1: Rewrite `InactiveEmployees.tsx`**

Reuse `EmployeeAvatar` and `employeeDisplayName` instead of the current bespoke card markup, and replace `bg-white dark:bg-gray-800` / `bg-gray-200 dark:bg-gray-700` with tokens. Keep the existing behaviour exactly: `useEmployees({ status: 'inactive' })`, the reactivate confirm, and the detail dialog. Render as cards below `md` and a table from `md` up, mirroring `LeaveSection`.

Then fix the empty-flash on tab switching (spec bug 9). `useEmployees` is shared,
so change it once in `frontend/src/hooks/queries/useEmployees.ts:14-23`:

```ts
import { useQuery, keepPreviousData } from '@tanstack/react-query';

export const useEmployees = (params?: EmployeeQueryParams) => {
  return useQuery({
    queryKey: queryKeys.employees.list(params),
    queryFn: async () => {
      const endpoint = buildEndpointWithQuery(API_ENDPOINTS.EMPLOYEES.GET_ALL, params || {});
      const { data } = await axiosInstance.get<ApiResponse<{ employees: Employee[] }>>(endpoint);
      return data.data?.employees || [];
    },
    // Active and inactive are separate query keys, so switching tabs would
    // otherwise render an empty list until the new fetch resolved.
    placeholderData: keepPreviousData,
  });
};
```

`keepPreviousData` is the TanStack Query **v5** spelling (v4's `keepPreviousData: true` boolean is gone). Confirm the existing import line before editing, and check the other call sites are fine with a brief stale render:

```bash
grep -rn "useEmployees(" frontend/src --include=*.tsx
```

Expected callers: this file, `EmployeeDirectory.tsx`, and any dashboard widgets. Showing the previous list for a moment instead of an empty one is an improvement at each.

- [ ] **Step 2: Retheme `DocumentManager.tsx`**

Replace hardcoded color pairs with tokens; make the document type grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`; ensure every icon-only button has an `aria-label`. Do not change the upload/delete mutation logic.

- [ ] **Step 3: Typecheck and lint**

Run: `cd frontend && pnpm typecheck && pnpm lint`
Expected: typecheck ≤102, lint ≤180. Report actual numbers.

- [ ] **Step 4: Exercise in the browser**

Run: `cd frontend && pnpm dev`
- Switch to the Inactive tab: list renders, no empty flash on switching back and forth.
- Reactivate an employee: confirm dialog appears, toast fires, the row leaves the list.
- Open the Documents tab on a profile at 375px: the grid is single-column and buttons are reachable.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/hr/employeeDirectory/InactiveEmployees.tsx frontend/src/components/hr/employeeDirectory/DocumentManager.tsx
git commit -m "refactor: theme InactiveEmployees and DocumentManager

Both move onto @theme tokens and reuse EmployeeAvatar. Adds
keepPreviousData so switching Active/Inactive no longer flashes empty."
```

---

### Task 9: Final verification and cleanup

**Files:**
- Modify: any file still failing the checks below.

**Interfaces:**
- Consumes: the complete feature.
- Produces: a verified branch.

- [ ] **Step 1: Confirm no hardcoded colors remain in the feature**

Run:

```bash
grep -rn "bg-white\|dark:bg-slate-8\|dark:bg-gray-8\|text-gray-5\|cyan-6\|bg-green-6\|bg-red-6" frontend/src/components/hr/employeeDirectory/
```

Expected: no hits outside `attendance/` (out of scope this pass). Fix any that appear in files this plan touched.

- [ ] **Step 2: Confirm the dead code is gone**

Run:

```bash
grep -rn "console.log\|window.location.href\|as any" frontend/src/components/hr/employeeDirectory/ --include=*.tsx | grep -v attendance/
```

Expected: no hits. Every one of these was a bug listed in the spec.

- [ ] **Step 3: Full typecheck, lint and build, both packages**

Run:

```bash
cd backend && pnpm type-check
cd ../frontend && pnpm typecheck && pnpm lint && pnpm build
```

Expected: backend clean; frontend typecheck **<102**, lint **<180**, build succeeds. **Report the actual numbers** — do not claim success without them. If either count rose above baseline, fix before proceeding.

- [ ] **Step 4: Confirm no new `set-state-in-effect` errors**

Run: `cd frontend && pnpm lint 2>&1 | grep -c "set-state-in-effect"`
Expected: no higher than before this branch. These are real cascading-render bugs.

- [ ] **Step 5: End-to-end pass at both widths**

At 375px: list → tap → profile → edit a field → save → back. Approve a pending leave and confirm the badge updates without a manual refresh. Confirm the bottom nav bar never covers content.

At desktop: same flows in the two-pane layout, plus Active/Inactive switching and a reload preserving the tab.

Both: dark mode, and keyboard-only navigation of the list (Tab to it, arrow keys to move, Enter to select).

- [ ] **Step 6: Verify the Aadhaar change end to end**

Open a profile and confirm the Aadhaar field shows the full 12 digits, not `XXXX-XXXX-1234`. Edit and save an unrelated field, then reload: the Aadhaar value must be unchanged — this proves the removed strip logic is not silently blanking it.

- [ ] **Step 7: Commit any fixes**

```bash
git add -A
git commit -m "chore: final cleanup for employee directory redesign"
```

---

## Self-Review Notes

**Spec coverage.** Every spec section maps to a task: component structure → 3–5, 7; responsive strategy → 7; mobile interaction detail → 4, 5, 6, 8; theming and a11y → 2, 4, 5, 8, 9; the nine bugs → 7 (bugs 1, 2, 4, 5, 6, 7, 8), 6 (bug 3), 8 (bug 9); Aadhaar unmasking → 1; approve/reject → 6; verification → every task plus 9.

**Deferred deliberately.** Attendance internals (`AttendanceTable`, `AttendanceAnalytics`, `EditAttendanceModal`, `TimeInput`) are out of scope per the spec; the next-session prompt lives in the spec's final section.

**Known risk.** Task 7 is the largest single change. It is kept last among the build tasks so every component it wires already type-checks in isolation, and its verification step is the most detailed in the plan.
