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

    // Arrow-key navigation over the row buttons. Scoped to direct children so
    // it stays correct if a row ever gains a nested control; Enter and Space
    // are the button's own default activation and are left alone.
    const handleKeyDown = (e: React.KeyboardEvent<HTMLUListElement>) => {
        const keys = ['ArrowDown', 'ArrowUp', 'Home', 'End'];
        if (!keys.includes(e.key)) return;
        const items = Array.from(
            e.currentTarget.querySelectorAll<HTMLButtonElement>(':scope > li > button'),
        );
        if (items.length === 0) return;
        const idx = items.indexOf(document.activeElement as HTMLButtonElement);
        if (idx === -1) return;
        e.preventDefault();
        const next = e.key === 'ArrowDown' ? Math.min(idx + 1, items.length - 1)
            : e.key === 'ArrowUp' ? Math.max(idx - 1, 0)
            : e.key === 'Home' ? 0
            : items.length - 1;
        items[next]?.focus();
    };

    return (
        <ul aria-label="Employees" onKeyDown={handleKeyDown} className="divide-y divide-border">
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
