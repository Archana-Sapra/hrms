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

                <Button
                    variant="outline"
                    size="icon"
                    className="relative size-11 shrink-0 lg:size-9 lg:hidden"
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
