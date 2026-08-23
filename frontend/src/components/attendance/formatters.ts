import { formatTime, formatDate } from '@/utils/istUtils';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Its own module, not a sibling of the components that use it: exporting a
 *  non-component alongside a component trips react-refresh/only-export-components. */
export function formatClock(value: string | undefined): string {
    if (!value) return '—';
    const d = new Date(value);
    return isNaN(d.getTime()) ? '—' : formatTime(d);
}

export function formatDay(date: string): string {
    const d = new Date(date);
    return isNaN(d.getTime()) ? '' : DAYS[d.getDay()];
}

export function formatShortDate(date: string): string {
    const d = new Date(date);
    return isNaN(d.getTime()) ? '—' : formatDate(d, true);
}
