import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type DirectoryView = 'active' | 'inactive' | 'accounts';

/** Split into pieces so desktop and mobile can place them differently. */
export function DirectoryActions({
    onAdd, count,
}: {
    onAdd: () => void;
    count?: number;
}) {
    return (
        <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold text-foreground">Employees</h1>
            {count !== undefined && (
                <span className="text-sm tabular-nums text-muted-foreground">{count}</span>
            )}

            <div className="ml-auto flex items-center gap-1.5">
                <Button
                    variant="outline"
                    size="icon"
                    className="size-9"
                    onClick={onAdd}
                    title="Add employee"
                    aria-label="Add employee"
                >
                    <UserPlus className="size-4" aria-hidden="true" />
                </Button>
            </div>
        </div>
    );
}

/** Radios, not tabs: these swap the queried dataset, they don't toggle panels. */
export function DirectoryStatusTabs({
    status, onStatusChange, className = '',
}: {
    status: DirectoryView;
    onStatusChange: (s: DirectoryView) => void;
    className?: string;
}) {
    const options: Array<{ value: DirectoryView; label: string }> = [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
        { value: 'accounts', label: 'Accounts' },
    ];

    return (
        <div
            role="radiogroup"
            aria-label="Employee status"
            className={`inline-flex shrink-0 items-center rounded-md bg-muted p-0.5 ${className}`}
        >
            {options.map((o) => (
                <button
                    key={o.value}
                    type="button"
                    role="radio"
                    aria-checked={status === o.value}
                    onClick={() => onStatusChange(o.value)}
                    className={`rounded-sm px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        status === o.value
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}

export function DirectoryHeader({
    onAdd, count,
}: {
    onAdd: () => void;
    count?: number;
}) {
    return (
        <header className="border-b border-border bg-card px-4 py-2.5">
            <DirectoryActions onAdd={onAdd} count={count} />
        </header>
    );
}
