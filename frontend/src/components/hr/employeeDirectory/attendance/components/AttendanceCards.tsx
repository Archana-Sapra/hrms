import { MapPin, Pencil, LogIn, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AttendanceStatusBadge } from './AttendanceStatus';
import { formatClock, formatDay, formatShortDate } from '../formatters';
import type { AttendanceRow } from '../types';

/**
 * Mobile presentation: one compact row per day, not a full card.
 *
 * The earlier card devoted a labelled block to check-in and check-out even when
 * both were empty, plus a full-width Edit button, so a single day filled half a
 * phone screen and a week required constant scrolling. Times now sit inline and
 * only appear when they exist; actions are icon buttons on the same row.
 */
export function AttendanceCards({
    records, selectionMode, selectedDates, onToggleSelect, onEdit, onViewLocation,
}: {
    records: AttendanceRow[];
    selectionMode: boolean;
    selectedDates: Set<string>;
    onToggleSelect: (date: string, selected: boolean) => void;
    onEdit: (record: AttendanceRow) => void;
    onViewLocation: (record: AttendanceRow) => void;
}) {
    return (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border md:hidden">
            {records.map((record) => {
                const label = `${formatShortDate(record.date)}, ${formatDay(record.date)}`;
                const hasTimes = !!(record.checkIn || record.checkOut);

                return (
                    <li key={record.date} className="flex items-center gap-3 bg-card p-3">
                        {selectionMode && (
                            <Checkbox
                                checked={selectedDates.has(record.date)}
                                onCheckedChange={(v) => onToggleSelect(record.date, v === true)}
                                aria-label={`Select ${label}`}
                            />
                        )}

                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-foreground">
                                    {formatShortDate(record.date)}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {formatDay(record.date)}
                                </span>
                            </div>

                            <div className="mt-1 flex items-center gap-3">
                                <AttendanceStatusBadge record={record} />
                                {/* Times only when there are any — an empty day
                                    says so with its badge, not two em dashes. */}
                                {hasTimes && (
                                    <span className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            <LogIn className="size-3" aria-hidden="true" />
                                            <span className="sr-only">Check in </span>
                                            {formatClock(record.checkIn)}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <LogOut className="size-3" aria-hidden="true" />
                                            <span className="sr-only">Check out </span>
                                            {formatClock(record.checkOut)}
                                        </span>
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* size-11 keeps the 44px touch target without the
                            full-width buttons that bloated the old card. */}
                        <div className="flex shrink-0 items-center gap-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-11"
                                disabled={!record.location}
                                onClick={() => onViewLocation(record)}
                                aria-label={
                                    record.location
                                        ? `View check-in location for ${label}`
                                        : `No location recorded for ${label}`
                                }
                            >
                                <MapPin className="size-4" aria-hidden="true" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-11"
                                onClick={() => onEdit(record)}
                                aria-label={`Edit attendance for ${label}`}
                            >
                                <Pencil className="size-4" aria-hidden="true" />
                            </Button>
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}
