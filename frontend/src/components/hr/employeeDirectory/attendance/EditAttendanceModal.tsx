import { useState } from 'react';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useUpdateAttendanceRecord } from '@/hooks/queries';
import { AttendanceFormFields } from './components/AttendanceFormFields';
import { localDateKey } from './types';
import type { AttendanceFormValues, AttendanceRow } from './types';
import type { Employee } from '@/types';

/** `datetime-local` value for a stored instant, on the record's own day. */
function toFormTime(dayKey: string, iso: string | undefined, fallback: string): string {
    if (!iso) return fallback ? `${dayKey}T${fallback}` : '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return `${dayKey}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function seedValues(record: AttendanceRow): AttendanceFormValues {
    const dayKey = localDateKey(new Date(record.date));
    // Only present/absent/half-day are editable; derived statuses (weekend,
    // holiday, leave) fall back to present so the select has a valid value.
    const editable = ['present', 'absent', 'half-day'].includes(record.status)
        ? record.status
        : 'present';
    return {
        status: editable,
        checkIn: toFormTime(dayKey, record.checkIn, '09:30'),
        checkOut: toFormTime(dayKey, record.checkOut, '17:30'),
    };
}

export default function EditAttendanceModal({
    isOpen, onClose, record, employeeProfile,
}: {
    isOpen: boolean;
    onClose: () => void;
    record: AttendanceRow | null;
    employeeProfile: Employee | null;
}) {
    const updateAttendance = useUpdateAttendanceRecord();
    const [values, setValues] = useState<AttendanceFormValues>({
        status: 'present', checkIn: '', checkOut: '',
    });
    const [error, setError] = useState('');

    // Re-seed when a different record is opened, during render instead of in an
    // effect — an effect would cascade a second render every time the modal
    // opens, and `set-state-in-effect` flags exactly this pattern.
    const [seededFor, setSeededFor] = useState<string | null>(null);
    const recordKey = isOpen && record ? record.date : null;
    if (recordKey !== seededFor) {
        setSeededFor(recordKey);
        if (record && isOpen) {
            setValues(seedValues(record));
            setError('');
        }
    }

    if (!record) return null;

    const dayKey = localDateKey(new Date(record.date));

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
                recordId: record._id || 'new',
                updateData: {
                    status: values.status,
                    checkIn: absent ? null : toIso(values.checkIn),
                    checkOut: absent ? null : toIso(values.checkOut),
                    // An absent day has no stored record, so identify the day
                    // the row stands for.
                    ...(record._id
                        ? {}
                        : { employeeId: employeeProfile?.employeeId, date: record.date }),
                },
            },
            {
                // No manual refetch: the mutation invalidates the attendance
                // keys on success, which refreshes the list on its own.
                onSuccess: onClose,
                onError: (err: Error) =>
                    setError(err.message || 'Failed to update the attendance record.'),
            },
        );
    };

    const displayDate = new Date(record.date);
    const employeeName = [employeeProfile?.firstName, employeeProfile?.lastName]
        .filter(Boolean).join(' ');

    return (
        <Dialog
            open={isOpen}
            onOpenChange={(next) => {
                if (!next && updateAttendance.isPending) return;
                if (!next) onClose();
            }}
        >
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit attendance</DialogTitle>
                    <DialogDescription>
                        {isNaN(displayDate.getTime())
                            ? 'Update this attendance record.'
                            : displayDate.toLocaleDateString('en-GB', {
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
                    errorId="edit-attendance-error"
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
