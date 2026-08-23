export interface AttendanceStatistics {
    total: number;
    present: number;
    absent: number;
    halfDay: number;
    leave: number;
    late: number;
    weekend: number;
    holiday: number;
}

/**
 * A record as this feature renders it.
 *
 * Deliberately NOT `extends AttendanceRecord`. The shared `AttendanceRecord`
 * types `location` as the nested `{ checkIn?: Location; checkOut?: Location }`
 * and `status` as a closed union, while what this view needs — and what
 * `LocationMapModal` accepts — is a flat `{ latitude, longitude }` plus a
 * status that includes the derived `weekend` / `holiday` / `leave` values.
 * Extending-and-overriding those two fields is what forced the `as any` on the
 * modal call site in the previous build. A standalone shape needs no cast.
 *
 * `_id` is optional because absent days are synthesised by the backend and have
 * no stored record until someone edits one.
 */
export interface AttendanceRow {
    _id?: string;
    date: string;
    status: string;
    checkIn?: string;
    checkOut?: string;
    location: { latitude: number; longitude: number } | null;
    flags: {
        isLate?: boolean;
        isLeave?: boolean;
        isHoliday?: boolean;
        isWeekend?: boolean;
        isWFH?: boolean;
    };
    holidayTitle?: string;
}

/** Returned when the requested window starts before the employee joined and
 *  the backend clamps it forward. */
export interface EffectiveRange {
    requestedStartDate: string;
    effectiveStartDate: string;
    joiningDate?: string;
}

export type AttendanceFormValues = {
    status: string;
    checkIn: string;
    checkOut: string;
};

export const ATTENDANCE_STATUS_OPTIONS = [
    { value: 'present', label: 'Present' },
    { value: 'absent', label: 'Absent' },
    { value: 'half-day', label: 'Half Day' },
] as const;

/** Local-time YYYY-MM-DD. Never `toISOString().split('T')[0]`, which shifts the
 *  day backwards for anyone east of UTC — India included. */
export function localDateKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
