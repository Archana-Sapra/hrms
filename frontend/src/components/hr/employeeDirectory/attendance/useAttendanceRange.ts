import { useSearchParams } from 'react-router';

export type DateRange = { startDate: string; endDate: string };

const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * Month-to-date, the default window when the URL says nothing.
 *
 * Deliberately NOT the whole calendar month. The backend materialises one row
 * per day in the range and marks any day without a check-in Absent, so ending
 * at month-end reports every *future* day of the month as an absence —
 * inflating the absent count and deflating the attendance percentage for the
 * whole first half of every month.
 */
export function currentMonthRange(): DateRange {
    const today = new Date();
    return {
        startDate: fmt(new Date(today.getFullYear(), today.getMonth(), 1)),
        endDate: fmt(today),
    };
}

/**
 * The range for a whole calendar month, clamped so it never runs past today —
 * a future day has no attendance and would be reported Absent.
 * Returns null for a month that has not started yet.
 */
export function monthRange(year: number, month: number): DateRange | null {
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const first = new Date(year, month, 1);
    if (first > todayMidnight) return null;

    const last = new Date(year, month + 1, 0);
    return {
        startDate: fmt(first),
        endDate: fmt(last > todayMidnight ? todayMidnight : last),
    };
}

/** True when `range` covers exactly its own calendar month (to today's cap),
 *  i.e. the stepper can label it as a month rather than "Custom". */
export function isWholeMonth(range: DateRange): boolean {
    const start = new Date(`${range.startDate}T00:00:00`);
    if (isNaN(start.getTime()) || start.getDate() !== 1) return false;
    const expected = monthRange(start.getFullYear(), start.getMonth());
    return !!expected
        && expected.startDate === range.startDate
        && expected.endDate === range.endDate;
}

/** Reject anything that is not YYYY-MM-DD naming a real day, so a hand-edited
 *  URL cannot put the query into a state the backend will reject. */
function validDate(value: string | null): string | null {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const d = new Date(`${value}T00:00:00`);
    return isNaN(d.getTime()) || fmt(d) !== value ? null : value;
}

/**
 * Date range lives in the URL (`?from=&to=`), not component state, so the view
 * is shareable and the back button steps through ranges. Falls back to the
 * current month when the params are absent or malformed.
 */
export function useAttendanceRange() {
    const [searchParams, setSearchParams] = useSearchParams();
    const fallback = currentMonthRange();

    // Clamp to today. A bookmarked or hand-edited URL must not be able to ask
    // for days that have not happened — the backend would report them Absent.
    const todayKey = fmt(new Date());
    const clamp = (value: string) => (value > todayKey ? todayKey : value);

    const startDate = clamp(validDate(searchParams.get('from')) ?? fallback.startDate);
    const endDate = clamp(validDate(searchParams.get('to')) ?? fallback.endDate);

    // `replace: false` so each range change is its own history entry — that is
    // the whole point of putting it in the URL. Other params (status, filters)
    // are carried through untouched.
    const setRange = (next: Partial<DateRange>) => {
        const params = new URLSearchParams(searchParams);
        const from = next.startDate ?? startDate;
        const to = next.endDate ?? endDate;
        params.set('from', from);
        params.set('to', to);
        setSearchParams(params);
    };

    // Steps whole months. Both ends move together, so this cannot go through
    // the partial-merge path above (which would briefly hold a start from one
    // month and an end from another and refetch on that invalid range).
    const stepMonth = (delta: number) => {
        const start = new Date(`${startDate}T00:00:00`);
        if (isNaN(start.getTime())) return;
        const next = monthRange(start.getFullYear(), start.getMonth() + delta);
        if (next) setRange(next);
    };

    return { dateRange: { startDate, endDate }, setRange, stepMonth };
}
