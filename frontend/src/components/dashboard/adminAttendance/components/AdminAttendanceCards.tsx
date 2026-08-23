import { ChevronDown, Pencil } from 'lucide-react';
import { localDateKey } from '@/components/attendance/types';
import { formatClock, formatDay } from '@/components/attendance/formatters';
import { AttendanceStatusBadge } from '@/components/attendance/components/AttendanceStatus';
import { dayCellLabel } from '../dayCellLabel';
import { rowFor, type EmployeeAttendance } from '../useAdminAttendanceGrid';

/**
 * Mobile presentation, below `md`.
 *
 * The axis is inverted rather than shrunk. A company-by-day grid cannot fit at
 * 375px — five employees across four days is twenty cells on a screen three
 * cells wide, which is why the previous build simply overflowed horizontally.
 * Here each employee is a disclosure holding that employee's days as rows, so
 * the page scrolls in one direction only.
 *
 * Native `<details>` rather than a JS disclosure: it is keyboard- and
 * screen-reader-operable for free, and there is no accordion primitive in
 * `ui/` to reuse.
 */
export function AdminAttendanceCards({
    records, days, onEdit,
}: {
    records: EmployeeAttendance[];
    days: Date[];
    onEdit: (record: EmployeeAttendance, day: Date) => void;
}) {
    return (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border md:hidden">
            {records.map((record) => {
                // Summarise the window so a collapsed row still says something.
                const presentCount = days.filter((d) => {
                    const row = rowFor(record, d);
                    return !!(row.checkIn || row.checkOut);
                }).length;

                return (
                    <li key={record.employee._id} className="bg-card">
                        <details className="group">
                            <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 p-3 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                                <div className="min-w-0 flex-1">
                                    <span className="block truncate font-medium text-foreground">
                                        {record.name}
                                    </span>
                                    <span className="block text-xs text-muted-foreground">
                                        {record.employee.employeeId
                                            ? `${record.employee.employeeId} · `
                                            : ''}
                                        Present {presentCount} of {days.length}
                                    </span>
                                </div>
                                <ChevronDown
                                    className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                                    aria-hidden="true"
                                />
                            </summary>

                            <ul className="divide-y divide-border border-t border-border">
                                {days.map((day) => {
                                    const row = rowFor(record, day);
                                    const key = localDateKey(day);
                                    const dayLabel = day.toLocaleDateString('en-GB', {
                                        weekday: 'short', day: 'numeric', month: 'short',
                                    });
                                    const hasTimes = !!(row.checkIn || row.checkOut);

                                    return (
                                        <li key={key} className="flex items-center gap-3 bg-muted/30 py-2 pl-3 pr-1">
                                            <div className="w-16 shrink-0">
                                                <span className="block text-sm font-medium text-foreground">
                                                    {day.getDate()} {day.toLocaleDateString('en-GB', { month: 'short' })}
                                                </span>
                                                <span className="block text-xs text-muted-foreground">
                                                    {formatDay(key)}
                                                </span>
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                {row.status === 'none' ? (
                                                    <span className="text-sm text-muted-foreground">No record</span>
                                                ) : (
                                                    <AttendanceStatusBadge record={row} />
                                                )}
                                                {hasTimes && (
                                                    <span className="mt-1 block font-mono text-xs text-muted-foreground">
                                                        {formatClock(row.checkIn)}
                                                        {row.checkOut ? ` – ${formatClock(row.checkOut)}` : ''}
                                                    </span>
                                                )}
                                            </div>

                                            {/* size-11 keeps the 44px touch target. */}
                                            <button
                                                type="button"
                                                onClick={() => onEdit(record, day)}
                                                aria-label={dayCellLabel(row, record.name, dayLabel)}
                                                className="flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                            >
                                                <Pencil className="size-4" aria-hidden="true" />
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </details>
                    </li>
                );
            })}
        </ul>
    );
}
