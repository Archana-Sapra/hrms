import { localDateKey } from '@/components/attendance/types';
import { formatDay } from '@/components/attendance/formatters';
import { AttendanceDayCell } from './AttendanceDayCell';
import { dayCellLabel } from '../dayCellLabel';
import { rowFor, type EmployeeAttendance } from '../useAdminAttendanceGrid';

/**
 * Desktop presentation, from `md` up: employees down, the day window across.
 *
 * Real table semantics — `scope="col"` on the day headers and `scope="row"` on
 * the employee cell — so a screen reader announces "Priya Sharma, Tue 12 Aug"
 * for a cell instead of reading a wall of unlabelled buttons. The previous build
 * used a bare `<table>` with no scopes and made each cell a click-handling
 * `<div>`, unreachable by keyboard.
 */
export function AdminAttendanceGrid({
    records, days, onEdit,
}: {
    records: EmployeeAttendance[];
    days: Date[];
    onEdit: (record: EmployeeAttendance, day: Date) => void;
}) {
    return (
        <div className="hidden overflow-hidden rounded-xl border border-border md:block">
            <div className="max-h-128 overflow-y-auto">
                <table className="w-full border-collapse">
                    <caption className="sr-only">
                        Attendance by employee for the selected days
                    </caption>
                    <thead className="sticky top-0 z-10 bg-muted">
                        <tr className="border-b border-border">
                            <th
                                scope="col"
                                className="px-4 py-3 text-left text-sm font-semibold text-foreground"
                            >
                                Employee
                            </th>
                            {days.map((day) => (
                                <th
                                    key={localDateKey(day)}
                                    scope="col"
                                    className="min-w-28 px-2 py-3 text-center text-sm font-semibold text-foreground"
                                >
                                    <span className="block">{formatDay(localDateKey(day))}</span>
                                    <span className="block text-xs font-normal text-muted-foreground">
                                        {day.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                    </span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {records.map((record) => (
                            <tr key={record.employee._id} className="bg-card">
                                <th scope="row" className="px-4 py-3 text-left align-middle">
                                    <span className="block text-sm font-medium text-foreground">
                                        {record.name}
                                    </span>
                                    {record.employee.employeeId && (
                                        <span className="block text-xs font-normal text-muted-foreground">
                                            {record.employee.employeeId}
                                        </span>
                                    )}
                                </th>
                                {days.map((day) => {
                                    const row = rowFor(record, day);
                                    const dayLabel = day.toLocaleDateString('en-GB', {
                                        weekday: 'short', day: 'numeric', month: 'short',
                                    });
                                    return (
                                        <td key={localDateKey(day)} className="p-1 align-middle">
                                            <button
                                                type="button"
                                                onClick={() => onEdit(record, day)}
                                                title={dayCellLabel(row, record.name, dayLabel)}
                                                aria-label={dayCellLabel(row, record.name, dayLabel)}
                                                className="flex min-h-16 w-full items-center justify-center rounded-lg p-2 transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                            >
                                                <AttendanceDayCell row={row} />
                                            </button>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
