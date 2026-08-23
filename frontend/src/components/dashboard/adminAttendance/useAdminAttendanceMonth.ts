import { useSearchParams } from 'react-router';
import { localDateKey } from '@/components/attendance/types';

/** How many day columns the desktop grid shows at once. */
export const WINDOW_SIZE = 4;

export type MonthKey = { year: number; month: number };

function isValidMonthKey(value: string | null): MonthKey | null {
    if (!value || !/^\d{4}-\d{2}$/.test(value)) return null;
    const [y, m] = value.split('-').map(Number);
    if (m < 1 || m > 12) return null;
    return { year: y, month: m - 1 };
}

function monthParam({ year, month }: MonthKey): string {
    return `${year}-${String(month + 1).padStart(2, '0')}`;
}

/**
 * Every day of the month up to and including today.
 *
 * Clamped for the same reason `attendance/useAttendanceRange.ts` clamps: the
 * backend materialises one row per requested day and marks any day without a
 * check-in Absent, so including future days inflates the absent count for the
 * whole first half of every month. Returns [] for a month that has not started.
 */
export function daysInMonthToDate({ year, month }: MonthKey): Date[] {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const first = new Date(year, month, 1);
    if (first > today) return [];

    const monthEnd = new Date(year, month + 1, 0);
    const last = monthEnd > today ? today : monthEnd;

    const days: Date[] = [];
    for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d));
    return days;
}

/** The last `count` months, newest first — the month picker's options. */
export function recentMonths(count: number): { value: string; label: string }[] {
    const now = new Date();
    return Array.from({ length: count }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        return {
            value: monthParam({ year: d.getFullYear(), month: d.getMonth() }),
            label: d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
        };
    });
}

/**
 * Month and day-window live in the URL (`?month=YYYY-MM&d=<offset>`), so the
 * view is shareable and the back button steps through months.
 *
 * `offset` counts day columns back from the most recent day of the month. The
 * previous build kept the window itself in state and re-derived it from two
 * effects that each wrote state — the source of three of this file's four
 * `set-state-in-effect` errors. Here the window is derived during render from
 * one number, so there is nothing to synchronise.
 */
export function useAdminAttendanceMonth() {
    const [searchParams, setSearchParams] = useSearchParams();

    const now = new Date();
    const monthKey =
        isValidMonthKey(searchParams.get('month'))
        ?? { year: now.getFullYear(), month: now.getMonth() };

    const days = daysInMonthToDate(monthKey);

    // Clamp rather than reset-in-an-effect. A hand-edited or stale `d` must not
    // be able to scroll the window off either end of the month.
    const maxOffset = Math.max(0, days.length - WINDOW_SIZE);
    const rawOffset = Number(searchParams.get('d'));
    const offset = Number.isFinite(rawOffset)
        ? Math.min(Math.max(0, Math.trunc(rawOffset)), maxOffset)
        : 0;

    // Offset 0 is the most recent window, so it sits at the end of the month.
    const end = days.length - offset;
    const visibleDays = days.slice(Math.max(0, end - WINDOW_SIZE), end);

    const setParams = (next: { month?: MonthKey; offset?: number }) => {
        const params = new URLSearchParams(searchParams);
        if (next.month) {
            params.set('month', monthParam(next.month));
            // A new month has its own day count, so a carried-over offset would
            // point somewhere arbitrary. Start at the most recent window.
            params.set('d', '0');
        }
        if (next.offset !== undefined) params.set('d', String(next.offset));
        setSearchParams(params);
    };

    return {
        monthKey,
        monthValue: monthParam(monthKey),
        days,
        visibleDays,
        offset,
        maxOffset,
        /** ISO range covering the month to date — what the query asks for. */
        range: days.length
            ? { startDate: localDateKey(days[0]), endDate: localDateKey(days[days.length - 1]) }
            : null,
        setMonth: (value: string) => {
            const parsed = isValidMonthKey(value);
            if (parsed) setParams({ month: parsed });
        },
        stepWindow: (delta: number) =>
            setParams({ offset: Math.min(Math.max(0, offset + delta), maxOffset) }),
    };
}
