import { useState } from 'react';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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

    const LINK_STATE_LABELS: Record<string, string> = {
        linked: 'Linked to a user',
        unlinked: 'Not linked',
    };

    const activeChips = [
        filters.department !== 'all' && {
            key: 'department',
            label: filters.department,
            onClear: () => filters.setDepartment('all'),
        },
        filters.employmentType !== 'all' && {
            key: 'employmentType',
            label: filters.employmentType,
            onClear: () => filters.setEmploymentType('all'),
        },
        filters.linkState !== 'all' && {
            key: 'linkState',
            label: LINK_STATE_LABELS[filters.linkState] ?? filters.linkState,
            onClear: () => filters.setLinkState('all'),
        },
    ].filter((c): c is { key: string; label: string; onClear: () => void } => Boolean(c));

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
                        className="pl-9 pr-11"
                    />
                    {filters.search && (
                        <button
                            type="button"
                            onClick={() => filters.setSearch('')}
                            aria-label="Clear search"
                            className="absolute right-0 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <X className="size-4" />
                        </button>
                    )}
                </div>

                {/* Reachable at every width, not just below lg. The desktop
                    inline row below carries department and account status only;
                    a third select would crowd the 360px rail, so employment
                    type lives in the sheet and the sheet must stay openable. */}
                <Button
                    variant="outline"
                    size="icon"
                    className="relative size-11 shrink-0 lg:size-9"
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

            {/* One place to set filters (the sheet), one place to see them (the
                chips). The desktop inline selects that used to sit here
                duplicated both — they repeated department and account status
                already shown as chips, and covered only two of the three
                filters, which is how employment type became unreachable. */}
            {activeChips.length > 0 && (
                <ul className="mt-2 flex flex-wrap items-center gap-1.5">
                    {activeChips.map((chip) => (
                        <li key={chip.key}>
                            <button
                                type="button"
                                onClick={chip.onClear}
                                aria-label={`Remove filter: ${chip.label}`}
                                className="flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                {chip.label}
                                <X className="size-3" aria-hidden="true" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}

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
