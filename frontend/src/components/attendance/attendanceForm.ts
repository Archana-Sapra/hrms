import { localDateKey } from './types';
import type { AttendanceFormValues } from './types';

/**
 * Applies the house defaults when the status changes. Present seeds a standard
 * day only where a time is missing; half-day always forces the early checkout;
 * absent clears both, since an absent day with times is contradictory.
 *
 * Its own module so the component file exports only components.
 */
export function applyStatusDefaults(
    values: AttendanceFormValues,
    status: string,
    baseDate: string,
): AttendanceFormValues {
    const next = { ...values, status };
    switch (status) {
        case 'present':
            if (!next.checkIn) next.checkIn = `${baseDate}T09:30`;
            if (!next.checkOut) next.checkOut = `${baseDate}T17:30`;
            break;
        case 'half-day':
            if (!next.checkIn) next.checkIn = `${baseDate}T09:30`;
            next.checkOut = `${baseDate}T13:30`;
            break;
        case 'absent':
            next.checkIn = '';
            next.checkOut = '';
            break;
    }
    return next;
}

export function defaultFormValues(date: Date = new Date()): AttendanceFormValues {
    const baseDate = localDateKey(date);
    return { status: 'present', checkIn: `${baseDate}T09:30`, checkOut: `${baseDate}T17:30` };
}
