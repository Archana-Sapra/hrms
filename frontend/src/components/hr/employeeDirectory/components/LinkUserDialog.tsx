import { useState } from 'react';
import { Search, SearchX, UserX, Link2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { orphanedUsers, matchesUserSearch } from '../userLinking';
import type { User } from '@/types';

export function LinkUserDialog({
    open, onOpenChange, employeeName, users, isPending, onSelect,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    employeeName: string;
    users: User[];
    isPending: boolean;
    onSelect: (user: User) => void;
}) {
    const [search, setSearch] = useState('');

    const candidates = orphanedUsers(users);
    const term = search.trim().toLowerCase();
    const visible = candidates.filter((u) => matchesUserSearch(u, term));

    const close = (next: boolean) => {
        if (!next) setSearch('');
        onOpenChange(next);
    };

    return (
        <Dialog open={open} onOpenChange={close}>
            <DialogContent className="max-h-[85vh] max-w-lg gap-0 overflow-hidden p-0">
                <DialogHeader className="border-b border-border p-6 pr-14 text-left">
                    <DialogTitle className="text-base font-semibold text-foreground">
                        Link a user account
                    </DialogTitle>
                    <DialogDescription>
                        Choose the account that belongs to {employeeName}. They will be able to
                        sign in to the employee portal.
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
                                placeholder="Search name or email…"
                                aria-label="Search unlinked accounts by name or email"
                                className="h-11 pl-9"
                            />
                        </div>
                    </div>
                )}

                <div className="max-h-96 overflow-y-auto p-4">
                    {candidates.length === 0 ? (
                        <div className="p-6 text-center">
                            <UserX className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
                            <p className="mt-3 font-medium text-foreground">No unlinked accounts</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Every employee account is already linked to a profile.
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
                            {visible.map((user) => (
                                <li key={user._id}>
                                    <button
                                        type="button"
                                        disabled={isPending}
                                        onClick={() => onSelect(user)}
                                        className="flex min-h-11 w-full items-center gap-3 rounded-lg border border-border p-3 text-left hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-medium text-foreground">{user.name}</p>
                                            <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                                        </div>
                                        <Link2 className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
