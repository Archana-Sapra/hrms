import { useAdminAttendanceRange } from '@/hooks/queries';
import { localDateKey } from '@/components/attendance/types';
import type { AttendanceRow } from '@/components/attendance/types';

export interface EmployeeIdentity {
    _id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    department?: string;
}

export interface EmployeeAttendance {
    employee: EmployeeIdentity;
    name: string;
    /** Keyed by local YYYY-MM-DD. */
    byDay: Record<string, AttendanceRow>;
}

export interface WindowStats {
    total: number;
    present: number;
    absent: number;
    leave: number;
    holiday: number;
}

const str = (v: unknown): string | undefined => (typeof v === 'string' && v ? v : undefined);

function toFlags(raw: unknown): AttendanceRow['flags'] {
    if (!raw || typeof raw !== 'object') return {};
    const f = raw as Record<string, unknown>;
    return {
        isLate: f.isLate === true,
        isLeave: f.isLeave === true,
        isHoliday: f.isHoliday === true,
        isWeekend: f.isWeekend === true,
        isWFH: f.isWFH === true,
    };
}

/**
 * An attendance record wins over a derived flag; only a day with no check-in
 * falls back to leave > holiday > weekend. Mirrors the backend's own precedence
 * and `attendance/useAttendanceRecords.ts`.
 *
 * The previous build additionally re-derived weekend and holiday on the client
 * from `useEffectiveSettings`, including a hand-rolled "which Saturday of the
 * month is this" calculation. The backend already materialises every day of the
 * range with its flags, so that ladder was a second, drifting implementation of
 * the same rule. The backend is the source of truth.
 */
function resolveStatus(status: string | undefined, checkIn: string | undefined, flags: AttendanceRow['flags']): string {
    const backendStatus = status ?? 'absent';
    if (checkIn) return backendStatus;
    if (flags.isLeave || backendStatus === 'leave') return 'leave';
    if (flags.isHoliday) return 'holiday';
    if (flags.isWeekend) return 'weekend';
    return backendStatus;
}

function toRow(raw: Record<string, unknown>): AttendanceRow | null {
    const date = str(raw.date);
    if (!date) return null;

    const checkIn = str(raw.checkIn);
    const flags = toFlags(raw.flags);

    return {
        _id: str(raw._id),
        date,
        status: resolveStatus(str(raw.status), checkIn, flags),
        checkIn,
        checkOut: str(raw.checkOut),
        location: null, // The admin range endpoint does not return coordinates.
        flags,
        holidayTitle: str(raw.holidayTitle) ?? (flags.isHoliday ? 'Holiday' : undefined),
    };
}

/** A day with no row at all — the employee joined later, or the backend had
 *  nothing to say. Rendered as a neutral blank rather than a false Absent. */
export function emptyRow(day: Date): AttendanceRow {
    return { date: localDateKey(day), status: 'none', location: null, flags: {} };
}

export function rowFor(record: EmployeeAttendance, day: Date): AttendanceRow {
    return record.byDay[localDateKey(day)] ?? emptyRow(day);
}

/**
 * Counts each employee once for the visible window, by their most significant
 * status across those days: present > leave > absent > holiday. A weekend-only
 * window contributes nobody but the total, which is why weekend is not a
 * counted bucket.
 */
export function windowStats(records: EmployeeAttendance[], days: Date[]): WindowStats {
    const stats: WindowStats = { total: records.length, present: 0, absent: 0, leave: 0, holiday: 0 };
    if (days.length === 0) return stats;

    for (const record of records) {
        let present = false, leave = false, absent = false, holiday = false;

        for (const day of days) {
            const row = rowFor(record, day);
            if (row.checkIn || row.checkOut) present = true;
            else if (row.status === 'leave') leave = true;
            else if (row.status === 'holiday') holiday = true;
            else if (row.status === 'absent') absent = true;
        }

        if (present) stats.present++;
        else if (leave) stats.leave++;
        else if (absent) stats.absent++;
        else if (holiday) stats.holiday++;
    }

    return stats;
}

/**
 * Owns fetching and normalisation. Everything is derived during render rather
 * than mirrored into state through effects — the previous build held
 * `attendanceData`, `monthlyAttendanceData`, `allWorkingDays`, `workingDays`
 * and `stats` in state and re-synced them from two effects.
 *
 * No useMemo: React Compiler is enabled.
 */
export function useAdminAttendanceGrid(range: { startDate: string; endDate: string } | null) {
    // Scoped server-side: the endpoint filters by range, so the client never
    // downloads more than the month it is showing.
    const { data, isLoading, error, refetch } = useAdminAttendanceRange(
        range?.startDate ?? '',
        range?.endDate ?? '',
    );

    const records: EmployeeAttendance[] = (data?.employeeReports ?? []).map((report) => {
        const byDay: Record<string, AttendanceRow> = {};

        for (const raw of report.records ?? []) {
            const row = toRow(raw as unknown as Record<string, unknown>);
            if (!row) continue;
            const parsed = new Date(row.date);
            if (isNaN(parsed.getTime())) continue;
            byDay[localDateKey(parsed)] = row;
        }

        return {
            employee: {
                _id: report.employee._id,
                employeeId: report.employee.employeeId,
                firstName: report.employee.firstName,
                lastName: report.employee.lastName,
                department: report.employee.department,
            },
            name: [report.employee.firstName, report.employee.lastName]
                .filter(Boolean).join(' ') || 'Unknown employee',
            byDay,
        };
    });

    return {
        records,
        isLoading,
        error: error ? (error.message || 'Could not load attendance data.') : null,
        refetch,
    };
}
