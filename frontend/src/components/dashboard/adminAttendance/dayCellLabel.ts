import { describeStatus } from '@/components/attendance/statusDescriptor';
import type { AttendanceRow } from '@/components/attendance/types';

/**
 * Accessible name for a day cell button, naming the employee and the day so the
 * label stands alone out of context — a grid of "Edit" buttons tells a screen
 * reader user nothing about which cell they are on.
 *
 * Its own module, not a sibling of the component that uses it: exporting a
 * non-component alongside a component trips react-refresh/only-export-components.
 */
export function dayCellLabel(row: AttendanceRow, employeeName: string, dayLabel: string): string {
    if (row.status === 'none') return `No record for ${employeeName} on ${dayLabel}. Add attendance`;
    const { label } = describeStatus(row);
    return `${label} — ${employeeName} on ${dayLabel}. Edit attendance`;
}
