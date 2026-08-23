import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { employeeDisplayName } from '../employeeName';
import type { CreateAccountData, Employee, UserRole } from '@/types';

const EMPTY = { name: '', email: '', password: '', role: 'employee' as UserRole, employeeId: '' };

/** Radix Select rejects an empty-string item value, so "no profile" needs a sentinel. */
const UNLINKED = '__unlinked__';

export function CreateAccountDialog({
    open, onOpenChange, employees, linkedEmployeeIds, canCreatePrivileged, isPending, onSubmit,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    employees: Employee[];
    linkedEmployeeIds: Set<string>;
    canCreatePrivileged: boolean;
    isPending: boolean;
    onSubmit: (data: CreateAccountData) => void;
}) {
    const [form, setForm] = useState(EMPTY);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const available = employees.filter((e) => !linkedEmployeeIds.has(e.employeeId));

    const set = (field: keyof typeof EMPTY, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        setErrors((prev) => {
            const { [field]: _removed, ...rest } = prev;
            return rest;
        });
    };

    const close = (next: boolean) => {
        if (!next) {
            setForm(EMPTY);
            setErrors({});
        }
        onOpenChange(next);
    };

    // Mirrors registerSchema: the server is the authority, this only avoids a
    // round trip for the obvious cases.
    const validate = () => {
        const next: Record<string, string> = {};
        if (!form.name.trim()) next.name = 'Name is required.';
        if (!form.email.trim()) next.email = 'Email is required.';
        else if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = 'Enter a valid email.';
        if (form.password.length < 6) next.password = 'Password must be at least 6 characters.';
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const submit = () => {
        if (!validate()) return;
        onSubmit({
            name: form.name.trim(),
            email: form.email.trim(),
            password: form.password,
            role: form.role,
            ...(form.employeeId ? { employeeId: form.employeeId } : {}),
        });
    };

    return (
        <Dialog open={open} onOpenChange={close}>
            <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
                <DialogHeader className="text-left">
                    <DialogTitle className="text-base font-semibold text-foreground">
                        Create an account
                    </DialogTitle>
                    <DialogDescription>
                        Link a profile now so they can sign in straight away, or leave it unlinked
                        and link it from this tab later.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div>
                        <Label htmlFor="account-name">Name</Label>
                        <Input
                            id="account-name"
                            value={form.name}
                            onChange={(e) => set('name', e.target.value)}
                            aria-invalid={!!errors.name}
                            className="mt-1 h-11"
                        />
                        {errors.name && <p className="mt-1 text-sm text-destructive">{errors.name}</p>}
                    </div>

                    <div>
                        <Label htmlFor="account-email">Email</Label>
                        <Input
                            id="account-email"
                            type="email"
                            autoComplete="off"
                            value={form.email}
                            onChange={(e) => set('email', e.target.value)}
                            aria-invalid={!!errors.email}
                            className="mt-1 h-11"
                        />
                        {errors.email && <p className="mt-1 text-sm text-destructive">{errors.email}</p>}
                    </div>

                    <div>
                        <Label htmlFor="account-password">Temporary password</Label>
                        <Input
                            id="account-password"
                            type="password"
                            autoComplete="new-password"
                            value={form.password}
                            onChange={(e) => set('password', e.target.value)}
                            aria-invalid={!!errors.password}
                            className="mt-1 h-11"
                        />
                        {errors.password
                            ? <p className="mt-1 text-sm text-destructive">{errors.password}</p>
                            : <p className="mt-1 text-sm text-muted-foreground">
                                Share this with them and ask them to change it after signing in.
                            </p>}
                    </div>

                    <div>
                        <Label htmlFor="account-role">Role</Label>
                        <Select value={form.role} onValueChange={(v) => set('role', v)}>
                            <SelectTrigger id="account-role" className="mt-1 h-11 w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="employee">Employee</SelectItem>
                                {canCreatePrivileged && <SelectItem value="hr">HR</SelectItem>}
                                {canCreatePrivileged && <SelectItem value="admin">Admin</SelectItem>}
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label htmlFor="account-employee">
                            Employee profile
                            <span className="ml-1 font-normal text-muted-foreground">(optional)</span>
                        </Label>
                        {available.length === 0 ? (
                            <p className="mt-1 text-sm text-muted-foreground">
                                No employee is waiting for an account. You can create this account
                                now and link it from this tab once their profile exists.
                            </p>
                        ) : (
                            <Select
                                value={form.employeeId || UNLINKED}
                                onValueChange={(v) => set('employeeId', v === UNLINKED ? '' : v)}
                            >
                                <SelectTrigger id="account-employee" className="mt-1 h-11 w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={UNLINKED}>Leave unlinked</SelectItem>
                                    {available.map((e) => (
                                        <SelectItem key={e._id} value={e.employeeId}>
                                            {employeeDisplayName(e)} ({e.employeeId})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" className="h-11" onClick={() => close(false)} disabled={isPending}>
                        Cancel
                    </Button>
                    <Button className="h-11" onClick={submit} disabled={isPending}>
                        {isPending ? 'Creating…' : 'Create account'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
