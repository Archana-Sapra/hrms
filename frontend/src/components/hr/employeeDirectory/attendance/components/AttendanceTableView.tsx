import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AttendanceStatusBadge, AttendanceStatusIcon } from './AttendanceStatus';
import { formatClock, formatDay, formatShortDate } from '../formatters';
import type { AttendanceRow } from '../types';

/** Desktop presentation: a real table with real header semantics. */
export function AttendanceTableView({
    records, selectionMode, selectedDates, allSelected,
    onToggleSelect, onToggleSelectAll, onEdit, onViewLocation,
}: {
    records: AttendanceRow[];
    selectionMode: boolean;
    selectedDates: Set<string>;
    allSelected: boolean;
    onToggleSelect: (date: string, selected: boolean) => void;
    onToggleSelectAll: (selected: boolean) => void;
    onEdit: (record: AttendanceRow) => void;
    onViewLocation: (record: AttendanceRow) => void;
}) {
    return (
        <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
            <table className="min-w-full text-sm">
                <caption className="sr-only">
                    Attendance records, one row per day in the selected range
                </caption>
                <thead className="bg-muted/50">
                    <tr>
                        {selectionMode && (
                            <th scope="col" className="p-3 text-left">
                                <Checkbox
                                    checked={allSelected}
                                    onCheckedChange={(v) => onToggleSelectAll(v === true)}
                                    aria-label="Select all matching records"
                                />
                            </th>
                        )}
                        <th scope="col" className="p-3 text-left font-medium text-muted-foreground">Date</th>
                        <th scope="col" className="p-3 text-left font-medium text-muted-foreground">Day</th>
                        <th scope="col" className="p-3 text-left font-medium text-muted-foreground">Status</th>
                        <th scope="col" className="p-3 text-left font-medium text-muted-foreground">Check in</th>
                        <th scope="col" className="p-3 text-left font-medium text-muted-foreground">Check out</th>
                        <th scope="col" className="p-3 text-right font-medium text-muted-foreground">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border">
                    {records.map((record) => (
                        <tr key={record.date} className="hover:bg-accent/40">
                            {selectionMode && (
                                <td className="p-3">
                                    <Checkbox
                                        checked={selectedDates.has(record.date)}
                                        onCheckedChange={(v) => onToggleSelect(record.date, v === true)}
                                        aria-label={`Select ${formatShortDate(record.date)}`}
                                    />
                                </td>
                            )}
                            <td className="whitespace-nowrap p-3">
                                <span className="flex items-center gap-2">
                                    <AttendanceStatusIcon record={record} />
                                    <span className="font-medium text-foreground">
                                        {formatShortDate(record.date)}
                                    </span>
                                </span>
                            </td>
                            <td className="whitespace-nowrap p-3 text-muted-foreground">
                                {formatDay(record.date)}
                            </td>
                            <td className="p-3"><AttendanceStatusBadge record={record} /></td>
                            <td className="whitespace-nowrap p-3 font-mono text-foreground">
                                {formatClock(record.checkIn)}
                            </td>
                            <td className="whitespace-nowrap p-3 font-mono text-foreground">
                                {formatClock(record.checkOut)}
                            </td>
                            <td className="whitespace-nowrap p-3 text-right">
                                {/* Always rendered, disabled when there is no
                                    fix — a button that appears on some rows and
                                    not others reads as a missing feature. */}
                                <span className="flex justify-end gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        disabled={!record.location}
                                        onClick={() => onViewLocation(record)}
                                        aria-label={
                                            record.location
                                                ? `View check-in location for ${formatShortDate(record.date)}`
                                                : `No location recorded for ${formatShortDate(record.date)}`
                                        }
                                    >
                                        <MapPin className="size-4" aria-hidden="true" />
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => onEdit(record)}>
                                        Edit
                                    </Button>
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
