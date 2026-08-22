import { useState } from 'react';
import { useEmployeeAttendanceWithAbsents } from '@/hooks/queries';
import type { DateRange } from './useAttendanceRange';
import type { AttendanceStatistics, AttendanceRow, EffectiveRange } from './types';

export const RECORDS_PER_PAGE = 7;

export type StatusFilter =
    | 'all' | 'present' | 'absent' | 'half-day' | 'weekend' | 'holiday' | 'leave';

export type SortOrder = 'asc' | 'desc';

/** Shape the backend actually sends: same fields as AttendanceRow but every
 *  value untrusted, so it is narrowed rather than cast. */
type RawRecord = {
    _id?: unknown;
    date?: unknown;
    status?: unknown;
    checkIn?: unknown;
    checkOut?: unknown;
    holidayTitle?: unknown;
    location?: unknown;
    flags?: unknown;
};

const str = (v: unknown): string | undefined => (typeof v === 'string' && v ? v : undefined);

/** Coordinates arrive as either numbers or numeric strings depending on how the
 *  record was written. Anything that is not a finite number is dropped, so a
 *  half-populated location can never reach the map as NaN. */
function toCoord(v: unknown): number | null {
    const n = typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) : NaN;
    return Number.isFinite(n) ? n : null;
}

function toLocation(raw: unknown): AttendanceRow['location'] {
    if (!raw || typeof raw !== 'object') return null;
    const loc = raw as Record<string, unknown>;
    // Records store either a flat {latitude, longitude} or the nested
    // {checkIn: {...}} form; accept both and normalise to flat.
    const source =
        loc.latitude !== undefined || loc.longitude !== undefined
            ? loc
            : (loc.checkIn as Record<string, unknown> | undefined);
    if (!source) return null;
    const latitude = toCoord(source.latitude);
    const longitude = toCoord(source.longitude);
    return latitude !== null && longitude !== null ? { latitude, longitude } : null;
}

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
 * An attendance record wins over a derived flag. Only when there is no check-in
 * does the day fall back to leave > holiday > weekend, which mirrors the
 * backend's own precedence.
 */
function resolveStatus(raw: RawRecord, checkIn: string | undefined): string {
    const backendStatus = str(raw.status) ?? 'absent';
    if (checkIn) return backendStatus;

    const flags = toFlags(raw.flags);
    if (flags.isLeave || backendStatus === 'leave') return 'leave';
    if (flags.isHoliday) return 'holiday';
    if (flags.isWeekend) return 'weekend';
    return backendStatus;
}

function toRow(raw: RawRecord): AttendanceRow | null {
    const date = str(raw.date);
    if (!date) return null; // A record with no date cannot be keyed or sorted.

    const checkIn = str(raw.checkIn);
    const flags = toFlags(raw.flags);

    return {
        _id: str(raw._id),
        date,
        status: resolveStatus(raw, checkIn),
        checkIn,
        checkOut: str(raw.checkOut),
        location: toLocation(raw.location),
        flags,
        holidayTitle: str(raw.holidayTitle) ?? (flags.isHoliday ? 'Holiday' : undefined),
    };
}

function isStatistics(raw: unknown): raw is AttendanceStatistics {
    return !!raw && typeof raw === 'object' && typeof (raw as { total?: unknown }).total === 'number';
}

function toEffectiveRange(raw: unknown): EffectiveRange | null {
    if (!raw || typeof raw !== 'object') return null;
    const r = raw as Record<string, unknown>;
    const requestedStartDate = str(r.requestedStartDate);
    const effectiveStartDate = str(r.effectiveStartDate);
    if (!requestedStartDate || !effectiveStartDate) return null;
    return { requestedStartDate, effectiveStartDate, joiningDate: str(r.joiningDate) };
}

/**
 * Owns fetching and every derivation over the result. All of this is computed
 * during render rather than mirrored into state via effects — the previous
 * build kept `allAttendanceData` / `displayedData` in state and re-synced them
 * from three effects, which is a cascading-render pattern.
 *
 * No useMemo: React Compiler is enabled.
 */
export function useAttendanceRecords({
    employeeId,
    dateRange,
}: {
    employeeId: string | undefined;
    dateRange: DateRange;
}) {
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
    const [page, setPage] = useState(1);

    // Scoped server-side: params are the FIRST argument of this hook, so the
    // backend filters by employee and range instead of the client doing it.
    const { data, isLoading, error } = useEmployeeAttendanceWithAbsents(
        {
            employeeId: employeeId ?? '',
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
        },
        { enabled: !!employeeId },
    );

    const payload = (data?.data ?? null) as Record<string, unknown> | null;
    const rawRecords = Array.isArray(payload?.records) ? (payload.records as RawRecord[]) : [];

    const records = rawRecords
        .map(toRow)
        .filter((r): r is AttendanceRow => r !== null);

    const statistics = isStatistics(payload?.statistics) ? payload.statistics : null;
    const effectiveRange = toEffectiveRange(payload?.dateRange);

    const filtered = statusFilter === 'all'
        ? records
        : records.filter((r) => r.status === statusFilter);

    const sorted = [...filtered].sort((a, b) => {
        const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
        return sortOrder === 'desc' ? -diff : diff;
    });

    const totalRecords = sorted.length;
    const totalPages = Math.max(1, Math.ceil(totalRecords / RECORDS_PER_PAGE));

    // Clamp rather than reset-in-an-effect. Narrowing the filter can strand the
    // page past the end; deriving the clamp keeps it correct without a render
    // cascade, and the user's page is preserved when the list grows again.
    const safePage = Math.min(page, totalPages);
    const visible = sorted.slice((safePage - 1) * RECORDS_PER_PAGE, safePage * RECORDS_PER_PAGE);

    const changeFilter = (next: StatusFilter) => {
        setStatusFilter(next);
        setPage(1);
    };

    return {
        records,
        visible,
        statistics,
        effectiveRange,
        isLoading,
        error: error ? 'Could not load attendance records.' : null,
        statusFilter,
        setStatusFilter: changeFilter,
        sortOrder,
        setSortOrder,
        page: safePage,
        setPage,
        totalPages,
        totalRecords,
        /** Every record matching the current filter, across all pages —
         *  what "select all" must operate on. */
        filtered,
    };
}
