import { Label } from '@/components/ui/label';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import TimeInput from '../TimeInput';
import { applyStatusDefaults } from '../attendanceForm';
import { ATTENDANCE_STATUS_OPTIONS } from '../types';
import type { AttendanceFormValues } from '../types';

export function AttendanceFormFields({
    values, onChange, baseDate, error, errorId,
}: {
    values: AttendanceFormValues;
    onChange: (next: AttendanceFormValues) => void;
    baseDate: string;
    error?: string;
    errorId?: string;
}) {
    return (
        <div className="space-y-4">
            <div>
                <Label htmlFor="attendance-status">Status</Label>
                <Select
                    value={values.status}
                    onValueChange={(v) => onChange(applyStatusDefaults(values, v, baseDate))}
                >
                    <SelectTrigger id="attendance-status" className="mt-1 h-11 sm:h-9">
                        <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                        {ATTENDANCE_STATUS_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {values.status !== 'absent' && (
                <>
                    <div>
                        <Label className="block">Check in time</Label>
                        <TimeInput
                            label="Check in time"
                            value={values.checkIn}
                            onChange={(checkIn) => onChange({ ...values, checkIn })}
                            className="mt-1"
                            invalid={!!error}
                            describedById={error ? errorId : undefined}
                        />
                    </div>
                    <div>
                        <Label className="block">Check out time</Label>
                        <TimeInput
                            label="Check out time"
                            value={values.checkOut}
                            onChange={(checkOut) => onChange({ ...values, checkOut })}
                            className="mt-1"
                        />
                    </div>
                </>
            )}

            {error && (
                <p id={errorId} className="text-sm text-destructive" role="alert">
                    {error}
                </p>
            )}
        </div>
    );
}
