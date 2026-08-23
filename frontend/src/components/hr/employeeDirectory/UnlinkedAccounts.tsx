import { useState } from 'react';
import { Search, SearchX, UserCheck, UserPlus, Link2, Trash2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import useAuth from '../../../hooks/authjwt';
import { useToast } from '../../ui/toast';
import { useConfirm } from '../../ui/confirm-dialog';
import {
    useUsers,
    useEmployees,
    useLinkEmployeeToUser,
    useDeleteUser,
    useCreateAccount,
} from '../../../hooks/queries';
import { orphanedUsers, matchesUserSearch } from './userLinking';
import { LinkEmployeeDialog } from './components/LinkEmployeeDialog';
import { CreateAccountDialog } from './components/CreateAccountDialog';
import { formatDate } from '../../../utils/istUtils';
import type { CreateAccountData, User, UserRole } from '@/types';

const ROLE_LABELS: Record<UserRole, string> = {
    admin: 'Admin',
    hr: 'HR',
    employee: 'Employee',
};

/** "an Admin", "an HR" — both take "an", so the article ships with the label. */
const ROLE_PHRASES: Record<UserRole, string> = {
    admin: 'an Admin',
    hr: 'an HR',
    employee: 'an Employee',
};


/**
 * Accounts with no employee profile. They cannot log in (login rejects an
 * employee-role user without an employeeId), so each one is either waiting to
 * be linked or is leftover and should be deleted.
 */
export default function UnlinkedAccounts() {
    const [search, setSearch] = useState('');
    const [linkTarget, setLinkTarget] = useState<User | null>(null);
    const [createOpen, setCreateOpen] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);
    const { toast } = useToast();
    const confirm = useConfirm();
    const currentUser = useAuth();

    const { data: users = [], isLoading } = useUsers();
    const { data: employees = [] } = useEmployees({ status: 'active' });
    const link = useLinkEmployeeToUser();
    const deleteUser = useDeleteUser();
    const createAccount = useCreateAccount();

    const orphans = orphanedUsers(users);

    // Mirrors deleteUser's guards: HR only deletes employee accounts, nobody
    // deletes themselves, and the last admin stays.
    const adminCount = users.filter((u) => u.role === 'admin').length;
    const canDelete = (user: User) => {
        if (user._id === currentUser?.userId) return false;
        if (currentUser?.role !== 'admin' && user.role !== 'employee') return false;
        return !(user.role === 'admin' && adminCount <= 1);
    };
    const term = search.trim().toLowerCase();
    const visible = orphans.filter((u) => matchesUserSearch(u, term));

    // Employees that already own an account cannot receive a second one.
    const linkedEmployeeIds = new Set(
        users.map((u) => u.employeeId).filter((id): id is string => !!id),
    );

    const handleDelete = async (user: User) => {
        const ok = await confirm({
            title: `Permanently delete "${user.name}"?`,
            description:
                user.role === 'employee'
                    ? 'This cannot be undone. The account will need to be created again from scratch.'
                    : `This cannot be undone, and removes ${ROLE_PHRASES[user.role]} account along with its access.`,
            confirmText: 'Delete permanently',
            destructive: true,
        });
        if (!ok) return;

        setBusyId(user._id);
        deleteUser.mutate(user._id, {
            onSuccess: () => {
                toast({ title: 'Account deleted', description: `${user.name} has been removed.` });
                setBusyId(null);
            },
            onError: (error: Error) => {
                toast({ variant: 'destructive', title: 'Delete failed', description: error.message });
                setBusyId(null);
            },
        });
    };

    const handleCreate = (data: CreateAccountData) => {
        createAccount.mutate(data, {
            onSuccess: () => {
                toast({
                    title: 'Account created',
                    description: data.employeeId
                        ? `${data.name} can now sign in.`
                        : `${data.name} can now sign in as ${data.role}.`,
                });
                setCreateOpen(false);
            },
            onError: (error: Error) =>
                toast({ variant: 'destructive', title: 'Could not create account', description: error.message }),
        });
    };

    const handleLink = (employeeId: string, employeeName: string) => {
        if (!linkTarget) return;
        const user = linkTarget;

        setBusyId(user._id);
        link.mutate(
            { userId: user._id, employeeId },
            {
                onSuccess: () => {
                    toast({
                        title: 'Account linked',
                        description: `${user.name} can now sign in as ${employeeName}.`,
                    });
                    setLinkTarget(null);
                    setBusyId(null);
                },
                onError: (error: Error) => {
                    toast({ variant: 'destructive', title: 'Link failed', description: error.message });
                    setBusyId(null);
                },
            },
        );
    };

    if (isLoading) {
        return (
            <div className="rounded-xl border border-border bg-card">
                <div className="border-b border-border px-4 py-3">
                    <h2 className="text-sm font-semibold text-foreground">Unlinked accounts</h2>
                </div>
                <div className="p-4">
                    <div className="animate-pulse space-y-3" aria-hidden="true">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-16 rounded-lg bg-muted"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-3">
                    <h2 className="text-sm font-semibold text-foreground">Unlinked accounts</h2>
                    <span className="text-sm tabular-nums text-muted-foreground">
                        {term ? `${visible.length} of ${orphans.length}` : orphans.length}
                    </span>

                    {orphans.length > 0 && (
                        <div className="relative ml-auto w-full min-w-0 max-w-full sm:w-auto sm:max-w-64 sm:flex-1 sm:basis-64">
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
                                className="h-9 pl-9 pr-10"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch('')}
                                    aria-label="Clear search"
                                    className="absolute right-0 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    <X className="size-4" />
                                </button>
                            )}
                        </div>
                    )}

                    <Button
                        size="sm"
                        variant="outline"
                        className={`h-9 shrink-0 ${orphans.length === 0 ? 'ml-auto' : ''}`}
                        onClick={() => setCreateOpen(true)}
                    >
                        <UserPlus className="size-4" aria-hidden="true" />
                        Create account
                    </Button>
                </div>
            </div>

            <div className="p-4">
                {orphans.length === 0 ? (
                    <div className="p-8 text-center">
                        <UserCheck className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
                        <p className="mt-3 font-medium text-foreground">No unlinked accounts</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Every employee account is linked to a profile.
                        </p>
                    </div>
                ) : visible.length === 0 ? (
                    <div className="p-8 text-center">
                        <SearchX className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
                        <p className="mt-3 font-medium text-foreground">No matches</p>
                        <Button variant="outline" size="sm" className="mt-4" onClick={() => setSearch('')}>
                            Clear search
                        </Button>
                    </div>
                ) : (
                    <>
                        <ul className="space-y-3 md:hidden">
                            {visible.map((user) => (
                                <li key={user._id} className="rounded-lg border border-border bg-muted/40 p-4">
                                    <div className="flex items-start gap-3">
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-semibold text-foreground">{user.name}</p>
                                            <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                                        </div>
                                        <div className="flex shrink-0 flex-col items-end gap-1">
                                            <Badge variant="warning">No profile</Badge>
                                            <Badge variant="default">{ROLE_LABELS[user.role]}</Badge>
                                        </div>
                                    </div>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        Created {formatDate(user.createdAt, false, 'DD MMM YYYY')}
                                    </p>
                                    <div className="mt-4 flex gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-11 flex-1"
                                            disabled={busyId === user._id}
                                            onClick={() => setLinkTarget(user)}
                                        >
                                            <Link2 className="size-4" aria-hidden="true" />
                                            Link
                                        </Button>
                                        {canDelete(user) && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-11 flex-1 text-destructive"
                                                disabled={busyId === user._id}
                                                onClick={() => handleDelete(user)}
                                            >
                                                <Trash2 className="size-4" aria-hidden="true" />
                                                Delete
                                            </Button>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>

                        <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
                            <table className="min-w-full text-sm">
                                <thead className="bg-muted/50">
                                    <tr>
                                        <th scope="col" className="p-3 text-left font-medium text-muted-foreground">Account</th>
                                        <th scope="col" className="p-3 text-left font-medium text-muted-foreground">Role</th>
                                        <th scope="col" className="p-3 text-left font-medium text-muted-foreground">Created</th>
                                        <th scope="col" className="p-3 text-right font-medium text-muted-foreground">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {visible.map((user) => (
                                        <tr key={user._id} className="hover:bg-accent/40">
                                            <td className="p-3">
                                                <p className="truncate font-medium text-foreground">{user.name}</p>
                                                <p className="text-xs text-muted-foreground">{user.email}</p>
                                            </td>
                                            <td className="p-3">
                                                <Badge variant="default">{ROLE_LABELS[user.role]}</Badge>
                                            </td>
                                            <td className="whitespace-nowrap p-3 text-foreground">
                                                {formatDate(user.createdAt, false, 'DD MMM YYYY')}
                                            </td>
                                            <td className="whitespace-nowrap p-3 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        disabled={busyId === user._id}
                                                        onClick={() => setLinkTarget(user)}
                                                    >
                                                        <Link2 className="size-4" aria-hidden="true" />
                                                        Link
                                                    </Button>
                                                    {canDelete(user) && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="text-destructive"
                                                            disabled={busyId === user._id}
                                                            onClick={() => handleDelete(user)}
                                                        >
                                                            <Trash2 className="size-4" aria-hidden="true" />
                                                            Delete
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            <LinkEmployeeDialog
                open={!!linkTarget}
                onOpenChange={(open) => !open && setLinkTarget(null)}
                userName={linkTarget?.name ?? ''}
                employees={employees}
                linkedEmployeeIds={linkedEmployeeIds}
                isPending={link.isPending}
                onSelect={handleLink}
            />

            <CreateAccountDialog
                open={createOpen}
                onOpenChange={setCreateOpen}
                employees={employees}
                linkedEmployeeIds={linkedEmployeeIds}
                canCreatePrivileged={currentUser?.role === 'admin'}
                isPending={createAccount.isPending}
                onSubmit={handleCreate}
            />
        </div>
    );
}
