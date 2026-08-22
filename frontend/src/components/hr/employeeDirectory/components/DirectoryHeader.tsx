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
