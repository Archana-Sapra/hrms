import { localDateKey } from '@/components/attendance/types';
import { AttendanceDayCell } from './AttendanceDayCell';
import { dayCellLabel } from '../dayCellLabel';
import { rowFor, type EmployeeAttendance } from '../useAdminAttendanceGrid';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function AdminAttendanceGrid({
    records, days, onEdit,
}: {
    records: EmployeeAttendance[];
    days: Date[];
    onEdit: (record: EmployeeAttendance, day: Date) => void;
}) {
    return (
        <div className="overflow-x-auto rounded-lg border border-border">
            <div className="max-h-[500px] overflow-y-auto">
                <table className="w-full table-fixed">
                    <caption className="sr-only">
                        Attendance by employee for the selected days
                    </caption>
                    <colgroup>
                        <col className="w-40 sm:w-56" />
                        {days.map((day) => (
                            <col key={localDateKey(day)} className="w-[88px] sm:w-auto" />
                        ))}
                    </colgroup>
                    <thead className="sticky top-0 z-10">
                        <tr className="bg-muted border-b border-border">
                            <th
                                scope="col"
                                className="text-left py-2 sm:py-4 px-2 sm:px-4 font-semibold text-foreground text-xs sm:text-sm"
                            >
                                Employee
                            </th>
                            {days.map((day) => {
                                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                                return (
                                    <th
                                        key={localDateKey(day)}
                                        scope="col"
                                        className={`text-center py-2 sm:py-4 px-1 sm:px-2 font-semibold text-xs sm:text-sm ${
                                            isWeekend ? 'text-muted-foreground' : 'text-foreground'
                                        }`}
                                    >
                                        <div className="flex flex-col items-center">
                                            <span>{DAYS[day.getDay()]}</span>
                                            <span className="text-xs text-muted-foreground">
                                                {String(day.getDate()).padStart(2, '0')} {MONTHS[day.getMonth()]}
                                            </span>
                                        </div>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {records.map((record) => (
                            <tr key={record.employee._id} className="bg-card transition-colors">
                                <th scope="row" className="py-2 sm:py-4 px-2 sm:px-4 text-left">
                                    <div
                                        className="font-medium text-sm sm:text-base text-foreground leading-tight truncate"
                                        title={record.name}
                                    >
                                        {record.name}
                                    </div>
                                    {record.employee.employeeId && (
                                        <div className="text-xs sm:text-sm text-muted-foreground leading-tight mt-0.5 font-normal truncate">
                                            ID: {record.employee.employeeId}
                                        </div>
                                    )}
                                </th>
                                {days.map((day) => {
                                    const row = rowFor(record, day);
                                    const dayLabel = day.toLocaleDateString('en-GB', {
                                        weekday: 'short', day: 'numeric', month: 'short',
                                    });
                                    return (
                                        <td key={localDateKey(day)} className="py-2 sm:py-4 px-1 sm:px-2">
                                            <button
                                                type="button"
                                                onClick={() => onEdit(record, day)}
                                                title={dayCellLabel(row, record.name, dayLabel)}
                                                aria-label={dayCellLabel(row, record.name, dayLabel)}
                                                className="flex w-full justify-center rounded-lg p-1 sm:p-2 hover:opacity-80 transition-opacity focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
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
