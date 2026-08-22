import { UserPlus, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

/**
 * Directory chrome, split so desktop and mobile can place the pieces
 * differently.
 *
 * On desktop the status tabs belong inside the list rail — a full-width header
 * row holding only two tabs left a wide dead strip across the detail pane. The
 * actions stay top-right where a page-level action belongs.
 *
 * `variant="actions"` renders just the buttons, `variant="tabs"` just the
 * status switch, and `variant="full"` renders both stacked for mobile.
 */
export function DirectoryActions({
    onAdd, onLink,
}: {
    onAdd: () => void;
    onLink: () => void;
}) {
    return (
        <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-9" onClick={onLink}>
                <Link2 className="size-4 sm:mr-2" aria-hidden="true" />
                <span className="sr-only sm:not-sr-only">Link user</span>
            </Button>
            <Button size="sm" className="h-9" onClick={onAdd}>
                <UserPlus className="size-4 sm:mr-2" aria-hidden="true" />
                <span className="sr-only sm:not-sr-only">Add employee</span>
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
                <DirectoryActions onAdd={onAdd} onLink={onLink} />
            </div>
            <DirectoryStatusTabs
                status={status}
                onStatusChange={onStatusChange}
                className="mt-3"
            />
        </header>
    );
}
