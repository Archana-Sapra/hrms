import { CheckCircle, XCircle, Clock, Heart, Calendar } from 'lucide-react';
import { formatClock } from '@/components/attendance/formatters';
import type { AttendanceRow } from '@/components/attendance/types';

const BASE =
    'w-full max-w-[85px] sm:max-w-[95px] px-2 sm:px-3 py-2 sm:py-3 rounded-lg text-xs sm:text-sm'
    + ' font-medium flex flex-col items-center justify-center gap-1 sm:gap-1.5'
    + ' min-h-[75px] sm:min-h-[85px] mx-auto';

function toneClass(row: AttendanceRow): string {
    if (row.status === 'weekend' || row.status === 'none') return 'bg-muted text-muted-foreground';
    if (row.status === 'holiday') return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
    if (row.status === 'leave') return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
    if (row.status === 'absent' || (!row.checkIn && !row.checkOut)) {
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
    }
    if (row.checkIn && row.checkOut) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
    if (row.checkIn && !row.checkOut) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
    return 'bg-muted text-foreground';
}

function StatusIcon({ row }: { row: AttendanceRow }) {
    const cls = 'w-4 h-4';
    if (row.status === 'weekend' || row.status === 'none') {
        return <XCircle className={`${cls} text-muted-foreground`} aria-hidden="true" />;
    }
    if (row.status === 'holiday') return <Calendar className={`${cls} text-orange-500`} aria-hidden="true" />;
    if (row.status === 'leave') return <Heart className={`${cls} text-purple-500`} aria-hidden="true" />;
    if (row.status === 'absent' || (!row.checkIn && !row.checkOut)) {
        return <XCircle className={`${cls} text-red-500`} aria-hidden="true" />;
    }
    if (row.checkIn && row.checkOut) return <CheckCircle className={`${cls} text-green-500`} aria-hidden="true" />;
    if (row.checkIn && !row.checkOut) return <Clock className={`${cls} text-yellow-500`} aria-hidden="true" />;
    return <XCircle className={`${cls} text-muted-foreground`} aria-hidden="true" />;
}

function statusText(row: AttendanceRow): string | null {
    if (row.status === 'weekend') return 'Weekend';
    if (row.status === 'none') return null;
    if (row.status === 'holiday') return row.holidayTitle || 'Holiday';
    if (row.status === 'leave') return 'Leave';
    if (row.status === 'absent' || (!row.checkIn && !row.checkOut)) return 'Absent';
    return null;
}

export function AttendanceDayCell({ row }: { row: AttendanceRow }) {
    const text = statusText(row);

    return (
        <span className={`${BASE} ${toneClass(row)}`}>
            <StatusIcon row={row} />
            {text && (
                <span className="text-xs font-medium text-center leading-tight">{text}</span>
            )}
            {row.checkIn && (
                <span className="text-xs font-mono opacity-80 text-center leading-tight">
                    <span className="block truncate">{formatClock(row.checkIn)}</span>
                    {row.checkOut && (
                        <span className="block truncate">{formatClock(row.checkOut)}</span>
                    )}
                </span>
            )}
        </span>
    );
}
