import { useState } from 'react';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useEffectiveSettings, useUpdateAttendanceRecord } from '@/hooks/queries';
import { AttendanceFormFields } from '@/components/attendance/components/AttendanceFormFields';
import { localDateKey } from '@/components/attendance/types';
import type { AttendanceFormValues, AttendanceRow } from '@/components/attendance/types';
import type { EmployeeIdentity } from '../useAdminAttendanceGrid';

export interface EditTarget {
    row: AttendanceRow;
    day: Date;
    employee: EmployeeIdentity;
}

/** `datetime-local` value for a stored instant, on the record's own day. */
function toFormTime(dayKey: string, iso: string | undefined, fallback: string): string {
    if (!iso) return fallback ? `${dayKey}T${fallback}` : '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return `${dayKey}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function seedValues(
    row: AttendanceRow,
    dayKey: string,
    hours: { start: string; end: string },
): AttendanceFormValues {
    // Only present/absent/half-day are editable; derived statuses (weekend,
    // holiday, leave, none) fall back to present so the select has a valid value.
    const editable = ['present', 'absent', 'half-day'].includes(row.status)
        ? row.status
        : 'present';
    return {
        status: editable,
        checkIn: toFormTime(dayKey, row.checkIn, hours.start),
        checkOut: toFormTime(dayKey, row.checkOut, hours.end),
    };
}

/**
 * Admin edit modal.
 *
 * Deliberately not `attendance/EditAttendanceModal.tsx` reused wholesale: this
 * one seeds default times from the department's configured business hours via
 * `useEffectiveSettings`, where the per-employee modal hardcodes 09:30/17:30.
 * The form body itself is the shared `AttendanceFormFields`, so the fields,
 * their validation wiring and the status defaults are common.
 */
export function AdminEditAttendanceModal({
    target, onClose,
}: {
    target: EditTarget | null;
    onClose: () => void;
}) {
    const updateAttendance = useUpdateAttendanceRecord();
    const [values, setValues] = useState<AttendanceFormValues>({
        status: 'present', checkIn: '', checkOut: '',
    });
    const [error, setError] = useState('');

    const { data: settings } = useEffectiveSettings(target?.employee.department, {
        enabled: !!target?.employee.department,
    });

    const hours = {
        start: settings?.attendance?.workStartTime || '09:30',
        end: settings?.attendance?.workEndTime || '17:30',
    };

    const dayKey = target ? localDateKey(target.day) : '';

    // Re-seed when a different cell is opened, during render instead of in an
    // effect — an effect would cascade a second render on every open, and
    // `set-state-in-effect` flags exactly this pattern. Keyed on employee+day
    // because the same day is editable for many employees.
    const targetKey = target ? `${target.employee._id}:${dayKey}` : null;
    const [seededFor, setSeededFor] = useState<string | null>(null);
    if (targetKey !== seededFor) {
        setSeededFor(targetKey);
        if (target) {
            setValues(seedValues(target.row, dayKey, hours));
            setError('');
        }
    }

    if (!target) return null;

    const handleSubmit = () => {
        const absent = values.status === 'absent';

        if (!absent && !values.checkIn) {
            setError('Check-in time is required unless the status is absent.');
            return;
        }
        setError('');

        const toIso = (v: string): string | null => {
            if (!v) return null;
            const d = new Date(v);
            return isNaN(d.getTime()) ? null : d.toISOString();
        };

        updateAttendance.mutate(
            {
                recordId: target.row._id || 'new',
                updateData: {
                    status: values.status,
                    checkIn: absent ? null : toIso(values.checkIn),
                    checkOut: absent ? null : toIso(values.checkOut),
                    // A day with no stored record needs identifying. `dayKey` is
                    // local-time, so the day never shifts backwards for anyone
                    // east of UTC.
                    ...(target.row._id
                        ? {}
                        : { employeeId: target.employee.employeeId, date: dayKey }),
                },
            },
            {
                // No manual refetch: the mutation invalidates the attendance
                // keys on success, which refreshes the grid on its own.
                onSuccess: onClose,
                onError: (err: Error) =>
                    setError(err.message || 'Failed to update the attendance record.'),
            },
        );
    };

    const employeeName = [target.employee.firstName, target.employee.lastName]
        .filter(Boolean).join(' ');

    return (
        <Dialog
            open
            onOpenChange={(next) => {
                if (!next && updateAttendance.isPending) return;
                if (!next) onClose();
            }}
        >
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit attendance</DialogTitle>
                    <DialogDescription>
                        {target.day.toLocaleDateString('en-GB', {
                            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                        })}
                        {employeeName ? ` · ${employeeName}` : ''}
                    </DialogDescription>
                </DialogHeader>

                <AttendanceFormFields
                    values={values}
                    onChange={setValues}
                    baseDate={dayKey}
                    error={error}
                    errorId="admin-attendance-error"
                />

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        variant="outline"
                        className="h-11 sm:h-9"
                        onClick={onClose}
                        disabled={updateAttendance.isPending}
                    >
                        Cancel
                    </Button>
                    <Button
                        className="h-11 sm:h-9"
                        onClick={handleSubmit}
                        disabled={updateAttendance.isPending}
                    >
                        {updateAttendance.isPending ? 'Saving…' : 'Save changes'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
