import { UserPlus, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Directory chrome.
 *
 * The rail previously stacked four full-width bands — actions, status tabs,
 * search, then chips and a count — so roughly 200px of a 360px-wide rail was
 * consumed before the first employee row. The list is the subject of the page;
 * it now starts as close to the top as the controls allow.
 *
 * The pieces stay split so desktop and mobile can place them differently.
 */

/**
 * Title, live count and actions on a single row.
 *
 * "Add employee" was a full-width filled button — the loudest element on
 * screen for a routine action, competing with the employee names. Both actions
 * are now icon buttons of equal, secondary weight, with accessible names.
 */
export function DirectoryActions({
    onAdd, onLink, count,
}: {
    onAdd: () => void;
    onLink: () => void;
    count?: number;
}) {
    return (
        <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold text-foreground">Employees</h1>
            {count !== undefined && (
                <span className="text-sm tabular-nums text-muted-foreground">{count}</span>
            )}

            {/* `title` gives the hover tooltip, `aria-label` the accessible
                name — a chain icon alone does not say "link a user account". */}
            <div className="ml-auto flex items-center gap-1.5">
                <Button
                    variant="outline"
                    size="icon"
                    className="size-9"
                    onClick={onLink}
                    title="Link user account"
                    aria-label="Link user account"
                >
                    <Link2 className="size-4" aria-hidden="true" />
                </Button>
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

/**
 * Active/Inactive as a compact segmented control.
 *
 * This was a full-width two-column TabsList, a whole band spending 44px to
 * express one binary. It is not a tab set in the ARIA sense either — the two
 * states swap the queried dataset rather than toggling panels within a page —
 * so radios in a group carry the meaning more honestly and announce as
 * "Active, 1 of 2" rather than as tabs with no controlled tabpanel.
 */
export function DirectoryStatusTabs({
    status, onStatusChange, className = '',
}: {
    status: 'active' | 'inactive';
    onStatusChange: (s: 'active' | 'inactive') => void;
    className?: string;
}) {
    const options: Array<{ value: 'active' | 'inactive'; label: string }> = [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
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

/** Mobile header. No page title of its own — the bottom nav already says where
 *  you are, so the title row carries the count and actions instead. */
export function DirectoryHeader({
    onAdd, onLink, count,
}: {
    onAdd: () => void;
    onLink: () => void;
    count?: number;
}) {
    return (
        <header className="border-b border-border bg-card px-4 py-2.5">
            <DirectoryActions onAdd={onAdd} onLink={onLink} count={count} />
        </header>
    );
}
