import { useState } from 'react';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DirectoryStatusTabs } from './DirectoryHeader';
import { FilterSheet } from './FilterSheet';
import { employmentTypeLabel } from '../employmentTypes';
import type { useEmployeeFilters } from '../useEmployeeFilters';

type Filters = ReturnType<typeof useEmployeeFilters>;

const LINK_STATE_LABELS: Record<string, string> = {
    linked: 'Linked to a user',
    unlinked: 'Not linked',
};

export function DirectoryToolbar({
    filters, departments, status, onStatusChange,
}: {
    filters: Filters;
    departments: string[];
    status: 'active' | 'inactive';
    onStatusChange: (s: 'active' | 'inactive') => void;
}) {
    const [sheetOpen, setSheetOpen] = useState(false);

    const activeChips = [
        filters.department !== 'all' && {
            key: 'department',
            label: filters.department,
            onClear: () => filters.setDepartment('all'),
        },
        filters.employmentType !== 'all' && {
            key: 'employmentType',
            label: employmentTypeLabel(filters.employmentType),
            onClear: () => filters.setEmploymentType('all'),
        },
        filters.linkState !== 'all' && {
            key: 'linkState',
            label: LINK_STATE_LABELS[filters.linkState] ?? filters.linkState,
            onClear: () => filters.setLinkState('all'),
        },
    ].filter((c): c is { key: string; label: string; onClear: () => void } => Boolean(c));

    // Only meaningful while a search or filter is narrowing the list. Shown
    // unconditionally it was a permanent line restating the header's count.
    const isNarrowed = !!filters.search.trim() || activeChips.length > 0;

    return (
        <div className="sticky top-0 z-10 border-b border-border bg-card px-4 py-2.5">
            <div className="flex items-center gap-2">
                <div className="relative min-w-0 flex-1">
                    <Search
                        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                        aria-hidden="true"
                    />
                    <Input
                        type="search"
                        value={filters.search}
                        onChange={(e) => filters.setSearch(e.target.value)}
                        placeholder="Search name, email or ID…"
                        aria-label="Search employees by name, email or employee ID"
                        className="h-9 pl-9 pr-10"
                    />
                    {filters.search && (
                        <button
                            type="button"
                            onClick={() => filters.setSearch('')}
                            aria-label="Clear search"
                            className="absolute right-0 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <X className="size-4" />
                        </button>
                    )}
                </div>

                {/* Reachable at every width. The sheet is the single place all
                    three filters are set; the chips below are the single place
                    they are displayed. */}
                <Button
                    variant="outline"
                    size="icon"
                    className="relative size-9 shrink-0"
                    onClick={() => setSheetOpen(true)}
                    aria-label={`Filters${filters.activeFilterCount ? `, ${filters.activeFilterCount} active` : ''}`}
                >
                    <SlidersHorizontal className="size-4" />
                    {filters.activeFilterCount > 0 && (
                        <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium tabular-nums text-primary-foreground">
                            {filters.activeFilterCount}
                        </span>
                    )}
                </Button>
            </div>

            {/* Status and the narrowed-count share one row: both describe what
                the list is currently showing. */}
            <div className="mt-2 flex items-center gap-2">
                <DirectoryStatusTabs status={status} onStatusChange={onStatusChange} />
                {isNarrowed && (
                    <span
                        className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground"
                        aria-live="polite"
                    >
                        {filters.visible.length} of {filters.total}
                    </span>
                )}
            </div>

            {activeChips.length > 0 && (
                <ul className="mt-2 flex flex-wrap items-center gap-1.5">
                    {activeChips.map((chip) => (
                        <li key={chip.key}>
                            <button
                                type="button"
                                onClick={chip.onClear}
                                aria-label={`Remove filter: ${chip.label}`}
                                className="flex items-center gap-1 rounded-full border border-border py-0.5 pl-2.5 pr-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                {chip.label}
                                <X className="size-3" aria-hidden="true" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            <FilterSheet
                open={sheetOpen}
                onOpenChange={setSheetOpen}
                filters={filters}
                departments={departments}
            />
        </div>
    );
}
