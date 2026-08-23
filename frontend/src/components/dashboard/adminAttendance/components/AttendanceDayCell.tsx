import { Minus } from 'lucide-react';
import { describeStatus } from '@/components/attendance/statusDescriptor';
import { formatClock } from '@/components/attendance/formatters';
import type { AttendanceRow } from '@/components/attendance/types';

/**
 * One employee-day. Shared by the desktop grid and the mobile list so the two
 * can never disagree about what a day looks like.
 *
 * The previous build had `getAttendanceIcon`, `getAttendanceBadgeClass` and
 * `getAttendanceStatusText` — three parallel ladders over the same fields, each
 * with its own hardcoded `bg-x-100 text-x-700 dark:bg-x-900/30` pairs. Status
 * meaning now comes from the shared `describeStatus`, and colour from the badge
 * variant, so it survives both themes.
 */
export function AttendanceDayCell({ row }: { row: AttendanceRow }) {
    // `none` means the backend returned no row for this day — the employee
    // joined later, say. Distinct from Absent, which is a real judgement.
    if (row.status === 'none') {
        return (
            <span className="flex items-center justify-center text-muted-foreground">
                <Minus className="size-4" aria-hidden="true" />
                <span className="sr-only">No record</span>
            </span>
        );
    }

    const { label, Icon } = describeStatus(row);
    const hasTimes = !!(row.checkIn || row.checkOut);

    return (
        <span className="flex flex-col items-center gap-1 text-center">
            <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="text-xs font-medium text-foreground">{label}</span>
            {hasTimes && (
                <span className="font-mono text-[11px] leading-tight text-muted-foreground">
                    {formatClock(row.checkIn)}
                    {row.checkOut ? ` – ${formatClock(row.checkOut)}` : ''}
                </span>
            )}
        </span>
    );
}
