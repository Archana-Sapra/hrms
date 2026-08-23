import {
    CheckCircle, AlertCircle, XCircle, Clock, Calendar, type LucideIcon,
} from 'lucide-react';
import type { AttendanceRow } from './types';

export type StatusDescriptor = {
    label: string;
    variant: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error';
    Icon: LucideIcon;
};

/**
 * One place that decides what a row *is*, so the icon and the badge can never
 * disagree. Previously getStatusIcon and getStatusBadge each re-derived this
 * from the same fields with two separate ladders of hardcoded colour classes.
 *
 * Status colour is semantic and stays semantic — a badge variant carries it, so
 * it survives both themes without a `bg-x-50 dark:bg-x-900/30` pair.
 */
export function describeStatus(record: AttendanceRow): StatusDescriptor {
    const { status, checkIn, checkOut, flags, holidayTitle } = record;

    if (status === 'weekend') return { label: 'Weekend', variant: 'default', Icon: Calendar };
    if (status === 'holiday') {
        return { label: holidayTitle || 'Holiday', variant: 'warning', Icon: Calendar };
    }
    if (status === 'leave') return { label: 'Leave', variant: 'secondary', Icon: Calendar };

    if (status === 'present') {
        if (flags?.isLate) return { label: 'Late Arrival', variant: 'warning', Icon: Clock };
        if (checkIn && checkOut) return { label: 'Complete', variant: 'success', Icon: CheckCircle };
        if (checkIn) return { label: 'Incomplete', variant: 'warning', Icon: AlertCircle };
    }

    if (status === 'half-day') return { label: 'Half Day', variant: 'primary', Icon: AlertCircle };
    if (status === 'absent') return { label: 'Absent', variant: 'error', Icon: XCircle };

    return { label: 'Unknown', variant: 'default', Icon: AlertCircle };
}
