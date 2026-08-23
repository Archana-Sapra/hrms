import { useState } from 'react';
import { Search, SearchX, Users, Link2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmployeeAvatar } from './EmployeeAvatar';
import { employeeDisplayName } from '../employeeName';
import { matchesEmployeeSearch } from '../employeeSearch';
import type { Employee } from '@/types';

export function LinkEmployeeDialog({
    open, onOpenChange, userName, employees, linkedEmployeeIds, isPending, onSelect,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    userName: string;
    employees: Employee[];
    linkedEmployeeIds: Set<string>;
    isPending: boolean;
    onSelect: (employeeId: string, employeeName: string) => void;
}) {
    const [search, setSearch] = useState('');

    const candidates = employees.filter((e) => !linkedEmployeeIds.has(e.employeeId));
    const term = search.trim().toLowerCase();
    const visible = candidates.filter((e) => matchesEmployeeSearch(e, term));

    const close = (next: boolean) => {
        if (!next) setSearch('');
        onOpenChange(next);
    };

    return (
        <Dialog open={open} onOpenChange={close}>
            <DialogContent className="max-h-[85vh] max-w-lg gap-0 overflow-hidden p-0">
                <DialogHeader className="border-b border-border p-6 pr-14 text-left">
                    <DialogTitle className="text-base font-semibold text-foreground">
                        Link to an employee
                    </DialogTitle>
                    <DialogDescription>
                        Choose the employee profile that belongs to {userName}.
                    </DialogDescription>
                </DialogHeader>

                {candidates.length > 0 && (
                    <div className="border-b border-border p-4">
                        <div className="relative">
                            <Search
                                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                                aria-hidden="true"
                            />
                            <Input
                                type="search"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search name, email or ID…"
                                aria-label="Search employees by name, email or employee ID"
                                className="h-11 pl-9"
                            />
                        </div>
                    </div>
                )}

                <div className="max-h-96 overflow-y-auto p-4">
                    {candidates.length === 0 ? (
                        <div className="p-6 text-center">
                            <Users className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
                            <p className="mt-3 font-medium text-foreground">No available employees</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Every active employee already has an account.
                            </p>
                        </div>
                    ) : visible.length === 0 ? (
                        <div className="p-6 text-center">
                            <SearchX className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
                            <p className="mt-3 font-medium text-foreground">No matches</p>
                            <Button variant="outline" size="sm" className="mt-4" onClick={() => setSearch('')}>
                                Clear search
                            </Button>
                        </div>
                    ) : (
                        <ul className="space-y-2">
                            {visible.map((employee) => {
                                const name = employeeDisplayName(employee);
                                return (
                                    <li key={employee._id}>
                                        <button
                                            type="button"
                                            disabled={isPending}
                                            onClick={() => onSelect(employee.employeeId, name)}
                                            className="flex min-h-11 w-full items-center gap-3 rounded-lg border border-border p-3 text-left hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                                        >
                                            <EmployeeAvatar name={name} src={employee.profilePicture} className="size-9" />
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate font-medium text-foreground">{name}</p>
                                                <p className="truncate text-sm text-muted-foreground">
                                                    ID: {employee.employeeId}
                                                </p>
                                            </div>
                                            <Link2 className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
