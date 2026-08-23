import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { Users } from 'lucide-react';
import useAuth from '../../../hooks/authjwt';
import {
    useEmployees, useEmployee, useAllLeaves, useUsers, useDepartments,
    useUpdateEmployee, useToggleEmployeeStatus, useUnlinkEmployeeFromUser,
} from '../../../hooks/queries';
import { useMediaQuery } from '../../../hooks/use-media-query';
import { useToast } from '../../ui/toast';
import { useConfirm } from '../../ui/confirm-dialog';
import {
    validateUpdateEmployee,
    validateField,
    employeeSchema,
} from '../../../schemas/employeeValidation';
import { useEmployeeFilters } from './useEmployeeFilters';
import { DirectoryHeader, DirectoryActions, DirectoryStatusTabs } from './components/DirectoryHeader';
import { DirectoryToolbar } from './components/DirectoryToolbar';
import { EmployeeList } from './components/EmployeeList';
import { EmployeeProfile } from './components/EmployeeProfile';
import { employeeDisplayName } from './employeeName';
import InactiveEmployees from './InactiveEmployees';
import EditAttendanceModal from './attendance/EditAttendanceModal';
import type { AttendanceRow } from '@/components/attendance/types';
import type { Employee } from '../../../types';
import type { UpdateEmployeeDto } from '../../../types';

/** Fields validateField knows about. Anything else skips per-keystroke checks. */
type ValidatableField = keyof typeof employeeSchema.shape;

function isValidatableField(name: string): name is ValidatableField {
    return name in employeeSchema.shape;
}

export default function EmployeeDirectory() {
    const navigate = useNavigate();
    const { employeeId: selectedId = null } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const userObject = useAuth();
    const { toast } = useToast();
    const confirm = useConfirm();

    const isDesktop = useMediaQuery('(min-width: 1024px)');
    const status = searchParams.get('status') === 'inactive' ? 'inactive' : 'active';

    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<AttendanceRow | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [draft, setDraft] = useState<Partial<Employee> | null>(null);
    const [draftFor, setDraftFor] = useState<string | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const { data: employees = [], isLoading, error: employeesError } = useEmployees({ status: 'active' });
    const { data: users = [] } = useUsers();
    const { data: departments = [] } = useDepartments();
    const { data: employeeProfile, isLoading: profileLoading } = useEmployee(selectedId ?? '');

    // Scoped server-side. The previous call passed the filter as the whole
    // options object, so `params` was undefined and this fetched every leave
    // in the system on each profile view, then filtered client-side.
    const { data: leaves = [] } = useAllLeaves({
        params: employeeProfile?.employeeId ? { employeeId: employeeProfile.employeeId } : undefined,
        enabled: !!employeeProfile?.employeeId,
    });

    const updateEmployee = useUpdateEmployee();
    const toggleStatus = useToggleEmployeeStatus();
    const unlink = useUnlinkEmployeeFromUser();

    const filters = useEmployeeFilters({ employees, users });

    // Authorization is enforced by <RequireRole roles={HR_ONLY}> on the route,
    // which decodes the JWT synchronously during render. useAuth() is *not* a
    // usable authorization source here: it starts at null and only decodes the
    // token in an effect, i.e. after first paint. Gating on it made an
    // unresolved auth state render as a denial, flashing "Not authorized" for
    // a frame on every visit. Render a neutral loading state until it resolves.
    if (!userObject) {
        return <div className="p-6 text-center text-muted-foreground">Loading…</div>;
    }

    const selectEmployee = (id: string) => navigate(`/employees/${id}`);

    // Carry the whole query string back, not just `status` — search and filters
    // are URL-persistable and must survive leaving a profile.
    const goBack = () => {
        const query = searchParams.toString();
        navigate(`/employees${query ? `?${query}` : ''}`);
    };

    const setStatus = (next: 'active' | 'inactive') => {
        const params = new URLSearchParams(searchParams);
        if (next === 'inactive') params.set('status', 'inactive');
        else params.delete('status');
        setSearchParams(params, { replace: true });
    };

    const handleFieldChange = (name: string, value: string) => {
        setDraft((prev) => ({ ...(prev ?? {}), [name]: value }));

        if (!isValidatableField(name)) return;
        const result = validateField(name, value);
        setErrors((prev) => {
            if (result.valid) {
                const { [name]: _removed, ...rest } = prev;
                return rest;
            }
            return { ...prev, [name]: result.error ?? 'Invalid value' };
        });
    };

    const handleSave = () => {
        if (!draft || !employeeProfile) return;
        // Never PUT a draft that was opened for a different employee.
        if (draftFor !== employeeProfile._id) return;

        // employeeId is displayed read-only and can contain slashes that fail
        // the regex, so it is never submitted.
        const { employeeId: _empId, ...editable } = draft as Record<string, unknown>;

        const validation = validateUpdateEmployee({ ...editable, _id: employeeProfile._id });
        if (!validation.success) {
            const fieldErrors = validation.errors ?? {};
            const first = Object.entries(fieldErrors)[0];
            toast({
                variant: 'destructive',
                title: 'Check this field',
                description: first ? `${first[0]}: ${first[1]}` : 'Some values are invalid.',
            });
            setErrors(fieldErrors);
            return;
        }

        // MongoDB rejects $set on the immutable _id.
        const { _id: _omit, ...fields } = (validation.data ?? {}) as Record<string, unknown>;

        // No sanitizeText on the payload. It escapes for HTML *attribute*
        // contexts, so persisting its output stored "O&#x27;Brien" for O'Brien
        // and re-escaped the entity on every subsequent save. Zod has already
        // validated these fields, React escapes on render, and Mongoose
        // parameterises the write — escaping here only corrupted the data.
        updateEmployee.mutate(
            {
                ...(fields as UpdateEmployeeDto),
                id: employeeProfile._id,
            },
            {
                onSuccess: () => {
                    setIsEditing(false);
                    setDraft(null);
                    setDraftFor(null);
                    setErrors({});
                    toast({ title: 'Saved', description: 'Employee updated.' });
                },
                onError: (error: Error) => {
                    toast({ variant: 'destructive', title: 'Update failed', description: error.message });
                },
            },
        );
    };

    const handleToggleStatus = async () => {
        if (!employeeProfile) return;
        const name = employeeDisplayName(employeeProfile);
        const deactivating = employeeProfile.isActive === true;
        const ok = await confirm({
            title: deactivating ? 'Deactivate employee?' : 'Activate employee?',
            description: deactivating
                ? `${name} will lose access and drop off active employee lists.`
                : `${name} will regain access to the system.`,
            confirmText: deactivating ? 'Deactivate' : 'Activate',
            destructive: deactivating,
        });
        if (!ok) return;

        toggleStatus.mutate(employeeProfile._id, {
            onSuccess: () => {
                toast({ title: deactivating ? 'Employee deactivated' : 'Employee activated' });
                if (deactivating) goBack();
            },
            onError: (error: Error) => {
                toast({ variant: 'destructive', title: 'Action failed', description: error.message });
            },
        });
    };

    const handleUnlink = async () => {
        if (!employeeProfile) return;
        const linkedUser = filters.linkedMap.get(employeeProfile.employeeId);
        if (!linkedUser) return;
        const name = employeeDisplayName(employeeProfile);
        const ok = await confirm({
            title: 'Unlink user account?',
            description: `Unlink "${linkedUser.name}" from ${name}? This revokes their login access.`,
            confirmText: 'Unlink',
            destructive: true,
        });
        if (!ok) return;

        unlink.mutate({ userId: linkedUser._id }, {
            onSuccess: () => toast({ title: 'Unlinked', description: `${linkedUser.name} no longer has access.` }),
            onError: (error: Error) =>
                toast({ variant: 'destructive', title: 'Unlink failed', description: error.message }),
        });
    };

    // The inactive view is a separate dataset, so it keeps its own header. The
    // status control travels with it rather than living only in the active
    // list's toolbar, otherwise there would be no way back to Active.
    if (status === 'inactive') {
        return (
            <div className="min-h-full bg-background">
                <DirectoryHeader
                    onAdd={() => navigate('/employees/add')}
                    onLink={() => navigate('/employees/link')}
                />
                <div className="border-b border-border bg-card px-4 pb-2.5">
                    <DirectoryStatusTabs status={status} onStatusChange={setStatus} />
                </div>
                <div className="p-4"><InactiveEmployees /></div>
            </div>
        );
    }

    const listPane = (
        <div className="flex min-h-0 flex-col lg:w-90 lg:shrink-0 lg:border-r lg:border-border">
            {/* Desktop only: page actions live in the rail, not in a full-width
                header. A header spanning both panes left a dead strip above the
                detail pane with the buttons stranded far right. The status
                switch now sits in the toolbar beside the result count. */}
            <div className="hidden shrink-0 border-b border-border bg-card px-4 py-2.5 lg:block">
                <DirectoryActions
                    onAdd={() => navigate('/employees/add')}
                    onLink={() => navigate('/employees/link')}
                    count={filters.total}
                />
            </div>
            <DirectoryToolbar
                filters={filters}
                departments={departments}
                status={status}
                onStatusChange={setStatus}
            />
            <div className="flex-1 lg:overflow-y-auto">
                <EmployeeList
                    employees={filters.visible}
                    selectedId={selectedId}
                    linkedMap={filters.linkedMap}
                    isLoading={isLoading}
                    error={employeesError ? 'Could not load employees.' : null}
                    hasSearch={!!filters.search || filters.activeFilterCount > 0}
                    showDepartment={filters.department === 'all'}
                    onSelect={selectEmployee}
                    onClearSearch={() => { filters.setSearch(''); filters.clearFilters(); }}
                />
            </div>
        </div>
    );

    // The draft belongs to the employee it was opened for. Selecting another
    // employee mid-edit must not carry A's values onto B's form — and must
    // never let handleSave PUT them to B's _id.
    const draftIsForThisEmployee = !!employeeProfile && draftFor === employeeProfile._id;

    // Prefer cached data over the loading branch: after a save the mutation
    // invalidates the query, and branching on profileLoading first would flash
    // "Loading profile…" over a record we already hold.
    const profilePane = employeeProfile ? (
        <EmployeeProfile
            employee={employeeProfile}
            leaves={leaves}
            isLinked={filters.linkedMap.has(employeeProfile.employeeId)}
            isEditing={isEditing && draftIsForThisEmployee}
            draft={draftIsForThisEmployee ? draft : null}
            errors={draftIsForThisEmployee ? errors : {}}
            isSaving={updateEmployee.isPending}
            isToggling={toggleStatus.isPending}
            onEditAttendance={(record) => { setEditingRecord(record); setEditModalOpen(true); }}
            onEdit={() => {
                setIsEditing(true);
                // Employee.address may be the legacy object form, but
                // updateEmployeeSchema only accepts a string. Seeding the raw
                // object makes validation fail on save for a field the user
                // never touched, with a message that does not match what the
                // (correctly flattened) input displays.
                setDraft({
                    ...employeeProfile,
                    address:
                        typeof employeeProfile.address === 'object' && employeeProfile.address
                            ? Object.values(employeeProfile.address)
                                  .filter((v): v is string => typeof v === 'string' && v.trim() !== '')
                                  .join(', ')
                            : employeeProfile.address,
                });
                setDraftFor(employeeProfile._id);
            }}
            onCancel={() => {
                setIsEditing(false);
                setDraft(null);
                setDraftFor(null);
                setErrors({});
            }}
            onSave={handleSave}
            onFieldChange={handleFieldChange}
            onToggleStatus={handleToggleStatus}
            onUnlink={handleUnlink}
            onBack={goBack}
            showBack={!isDesktop}
        />
    ) : profileLoading ? (
        <div className="flex-1 p-6 text-center text-muted-foreground">Loading profile…</div>
    ) : (
        <div className="flex h-full flex-1 items-center justify-center p-10 text-center">
            <div>
                <Users className="mx-auto size-10 text-muted-foreground" aria-hidden="true" />
                <p className="mt-3 font-medium text-foreground">Select an employee</p>
                <p className="mt-1 text-sm text-muted-foreground">
                    Choose someone from the list to view their details.
                </p>
            </div>
        </div>
    );

    // No onUpdate / refresh counter: useUpdateAttendanceRecord invalidates the
    // attendance query keys on success, so the list refetches on its own.
    const attendanceModal = (
        <EditAttendanceModal
            isOpen={editModalOpen}
            onClose={() => { setEditModalOpen(false); setEditingRecord(null); }}
            record={editingRecord}
            employeeProfile={employeeProfile ?? null}
        />
    );

    // Mobile is a two-screen flow: the list at /employees, the profile at
    // /employees/:id. A real route change means the PWA back gesture works.
    //
    // Sized to its content, not `min-h-full`: the shell (Sidebar.tsx:288) is the
    // h-dvh scroll container and already appends the bottom-bar spacer. Forcing
    // full height here made every short tab — Attendance especially — stretch to
    // the viewport and leave dead space below the content.
    if (!isDesktop) {
        return (
            <div className="bg-background">
                {selectedId ? profilePane : (
                    <>
                        <DirectoryHeader
                            onAdd={() => navigate('/employees/add')}
                            onLink={() => navigate('/employees/link')}
                            count={filters.total}
                        />
                        {listPane}
                    </>
                )}
                {attendanceModal}
            </div>
        );
    }

    // h-full with internal overflow, not min-h-full: the page fills its parent
    // (Sidebar.tsx:288, itself h-dvh) so each pane scrolls independently.
    // Previously the whole page scrolled, which pushed the "Select an employee"
    // empty state out of view instead of centring it. h-full rather than h-dvh
    // so this stays correct if the shell's own height ever changes.
    return (
        <div className="flex h-full flex-col overflow-hidden bg-background">
            <div className="flex min-h-0 flex-1">
                {listPane}
                <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">{profilePane}</div>
            </div>
            {attendanceModal}
        </div>
    );
}
