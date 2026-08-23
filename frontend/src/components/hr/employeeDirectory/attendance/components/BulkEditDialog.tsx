import { useState } from 'react';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AttendanceFormFields } from '@/components/attendance/components/AttendanceFormFields';
import { defaultFormValues } from '@/components/attendance/attendanceForm';
import { localDateKey } from '@/components/attendance/types';
import type { AttendanceFormValues } from '@/components/attendance/types';

export function BulkEditDialog({
    open, onOpenChange, selectedCount, onSubmit, isSubmitting,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedCount: number;
    onSubmit: (values: AttendanceFormValues) => void;
    isSubmitting: boolean;
}) {
    const [values, setValues] = useState<AttendanceFormValues>(defaultFormValues);
    const [error, setError] = useState('');

    // Reset the form when the dialog opens, during render rather than in an
    // effect — an effect here would cascade an extra render on every open.
    const [wasOpen, setWasOpen] = useState(open);
    if (open !== wasOpen) {
        setWasOpen(open);
        if (open) {
            setValues(defaultFormValues());
            setError('');
        }
    }

    const handleSubmit = () => {
        if (values.status !== 'absent' && !values.checkIn) {
            setError('Check-in time is required unless the status is absent.');
            return;
        }
        setError('');
        onSubmit(values);
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => { if (!next && isSubmitting) return; onOpenChange(next); }}
        >
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Update attendance</DialogTitle>
                    <DialogDescription>
                        Applies the same status and times to {selectedCount} selected{' '}
                        {selectedCount === 1 ? 'day' : 'days'}.
                    </DialogDescription>
                </DialogHeader>

                <AttendanceFormFields
                    values={values}
                    onChange={setValues}
                    baseDate={localDateKey(new Date())}
                    error={error}
                    errorId="bulk-attendance-error"
                />

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        variant="outline"
                        className="h-11 sm:h-9"
                        onClick={() => onOpenChange(false)}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button className="h-11 sm:h-9" onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? 'Saving…' : 'Save changes'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
