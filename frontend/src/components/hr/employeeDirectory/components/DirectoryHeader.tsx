import { UserPlus, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

/**
 * Directory chrome, split so desktop and mobile can place the pieces
 * differently.
 *
 * On desktop the status tabs and actions both live inside the list rail — a
 * full-width header row spanning both panes left a dead strip above the detail
 * pane with the buttons stranded far right.
 */

/**
 * One primary action plus a compact icon action, rather than two equal buttons.
 *
 * Adding an employee is routine; linking a user account is occasional. Giving
 * them equal weight made a 360px rail feel cramped and set two actions
 * competing directly above the search field. Link stays one tap away as an
 * icon — a dropdown would have cost two taps for a single item.
 */
export function DirectoryActions({
    onAdd, onLink,
}: {
    onAdd: () => void;
    onLink: () => void;
}) {
    return (
        <div className="flex items-stretch gap-2">
            <Button size="sm" className="h-9 flex-1" onClick={onAdd}>
                <UserPlus className="mr-2 size-4" aria-hidden="true" />
                Add employee
            </Button>

            {/* `title` gives the hover tooltip, `aria-label` the accessible
                name — a chain icon alone does not say "link a user account". */}
            <Button
                variant="outline"
                size="icon"
                className="size-9 shrink-0"
                onClick={onLink}
                title="Link user account"
                aria-label="Link user account"
            >
                <Link2 className="size-4" aria-hidden="true" />
            </Button>
        </div>
    );
}

export function DirectoryStatusTabs({
    status, onStatusChange, className = '',
}: {
    status: 'active' | 'inactive';
    onStatusChange: (s: 'active' | 'inactive') => void;
    className?: string;
}) {
    return (
        <Tabs
            value={status}
            onValueChange={(v) => onStatusChange(v as 'active' | 'inactive')}
            className={className}
        >
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="inactive">Inactive</TabsTrigger>
            </TabsList>
        </Tabs>
    );
}

/** Mobile header: actions and tabs stacked. No page title — the bottom nav
 *  already says where you are, and the heading only cost vertical space. */
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
            <div className="flex items-center justify-between gap-3">
                <h1 className="text-base font-semibold text-foreground">Employees</h1>
                {/* shrink-0 so the split button keeps its intrinsic width here
                    instead of stretching as it does in the desktop rail. */}
                <div className="shrink-0">
                    <DirectoryActions onAdd={onAdd} onLink={onLink} />
                </div>
            </div>
            <DirectoryStatusTabs
                status={status}
                onStatusChange={onStatusChange}
                className="mt-3"
            />
        </header>
    );
}
