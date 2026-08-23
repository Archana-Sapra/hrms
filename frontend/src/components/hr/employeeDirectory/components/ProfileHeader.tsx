import { useState } from 'react';
import { ArrowLeft, Pencil, MoreVertical, Link2, Link2Off, UserX, UserCheck, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { EmployeeAvatar } from './EmployeeAvatar';
import { employeeDisplayName } from '../employeeName';
import type { Employee } from '@/types';

export function ProfileHeader({
    employee, isEditing, isSaving, isToggling, isLinked,
    onEdit, onCancel, onSave, onToggleStatus, onLink, onUnlink, onBack, showBack,
}: {
    employee: Employee;
    isEditing: boolean;
    isSaving: boolean;
    isToggling: boolean;
    isLinked: boolean;
    onEdit: () => void;
    onCancel: () => void;
    onSave: () => void;
    onToggleStatus: () => void;
    onLink: () => void;
    onUnlink: () => void;
    onBack: () => void;
    showBack: boolean;
}) {
    const name = employeeDisplayName(employee);
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <div className="border-b border-border bg-card px-4 py-3">
            {showBack && (
                <Button variant="ghost" size="sm" className="-ml-2 mb-2" onClick={onBack}>
                    <ArrowLeft className="mr-1.5 size-4" aria-hidden="true" />
                    Employees
                </Button>
            )}

            {/* items-center, not items-start: the avatar is 56px tall, so
                top-aligning pinned the status pill, Edit and the overflow
                button to the top edge and left them visually adrift from the
                name they belong to. */}
            <div className="flex items-center gap-3">
                <EmployeeAvatar name={name} src={employee.profilePicture} className="size-14" />
                <div className="min-w-0 flex-1">
                    <h2 className="truncate text-lg font-semibold text-foreground">{name}</h2>
                    <p className="truncate text-sm text-muted-foreground">
                        {[employee.position, employee.department].filter(Boolean).join(' · ') || '—'}
                    </p>
                </div>

                {/* Status sits with the actions, not under the name: it is
                    controlled from the overflow menu beside it, and as a third
                    line under the role it read as body content. h-9 matches the
                    buttons so the row shares one baseline. */}
                <div className="flex shrink-0 items-center gap-2">
                    <div className="hidden items-center gap-1.5 sm:flex">
                        {!isLinked && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-9 text-amber-700 dark:text-amber-400"
                                onClick={onLink}
                            >
                                <Link2 className="size-4 mr-1.5" aria-hidden="true" />
                                Link account
                            </Button>
                        )}
                        <Badge
                            variant={employee.isActive ? 'success' : 'error'}
                            className="h-9 rounded-md px-3"
                        >
                            {employee.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                    </div>
                    {isEditing ? (
                        <>
                            <Button variant="ghost" size="sm" className="h-9" onClick={onCancel} disabled={isSaving}>
                                <X className="size-4 sm:mr-1.5" aria-hidden="true" />
                                <span className="sr-only sm:not-sr-only">Cancel</span>
                            </Button>
                            <Button size="sm" className="h-9" onClick={onSave} disabled={isSaving}>
                                <Save className="size-4 sm:mr-1.5" aria-hidden="true" />
                                <span className="sr-only sm:not-sr-only">
                                    {isSaving ? 'Saving…' : 'Save'}
                                </span>
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="outline" size="sm" className="h-9" onClick={onEdit}>
                                <Pencil className="size-4 sm:mr-1.5" aria-hidden="true" />
                                <span className="sr-only sm:not-sr-only">Edit</span>
                            </Button>
                            <Popover open={menuOpen} onOpenChange={setMenuOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        aria-label="More actions"
                                    >
                                        <MoreVertical className="size-4" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent align="end" className="w-52 p-1">
                                    {isLinked ? (
                                        <button
                                            type="button"
                                            onClick={() => { setMenuOpen(false); onUnlink(); }}
                                            className="flex h-11 w-full items-center gap-2 rounded-sm px-3 text-left text-sm text-foreground hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                                        >
                                            <Link2Off className="size-4" aria-hidden="true" />
                                            Unlink user account
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => { setMenuOpen(false); onLink(); }}
                                            className="flex h-11 w-full items-center gap-2 rounded-sm px-3 text-left text-sm text-foreground hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                                        >
                                            <Link2 className="size-4" aria-hidden="true" />
                                            Link user account
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        disabled={isToggling}
                                        onClick={() => { setMenuOpen(false); onToggleStatus(); }}
                                        className="flex h-11 w-full items-center gap-2 rounded-sm px-3 text-left text-sm text-destructive hover:bg-accent focus-visible:bg-accent focus-visible:outline-none disabled:opacity-50"
                                    >
                                        {employee.isActive
                                            ? <><UserX className="size-4" aria-hidden="true" />Deactivate employee</>
                                            : <><UserCheck className="size-4" aria-hidden="true" />Activate employee</>}
                                    </button>
                                </PopoverContent>
                            </Popover>
                        </>
                    )}
                </div>
            </div>

            {/* Below sm the action row has no width to spare, so status moves
                to its own line rather than being dropped. */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5 sm:hidden">
                <Badge variant={employee.isActive ? 'success' : 'error'}>
                    {employee.isActive ? 'Active' : 'Inactive'}
                </Badge>
                {!isLinked && (
                    <button
                        type="button"
                        onClick={onLink}
                        className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <Badge variant="warning">No user account — link</Badge>
                    </button>
                )}
            </div>
        </div>
    );
}
