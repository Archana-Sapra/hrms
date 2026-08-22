import { useState } from 'react';
import { ChevronLeft, ChevronRight, ArrowDownWideNarrow, ArrowUpWideNarrow, Check, CheckSquare, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import EnhancedDatePicker from '@/components/ui/enhanced-datepicker';
import { localDateKey } from '../types';
import { monthRange, isWholeMonth } from '../useAttendanceRange';
import type { DateRange } from '../useAttendanceRange';
import type { SortOrder, StatusFilter } from '../useAttendanceRecords';

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'All statuses' },
    { value: 'present', label: 'Present' },
    { value: 'absent', label: 'Absent' },
    { value: 'half-day', label: 'Half day' },
    { value: 'weekend', label: 'Weekend' },
    { value: 'holiday', label: 'Holiday' },
    { value: 'leave', label: 'Leave' },
];

/** `YYYY-MM-DD` → Date at local midnight. Parsing the bare string would be
 *  read as UTC and land on the previous day for IST users. */
function toDate(value: string): Date | null {
    if (!value) return null;
    const d = new Date(`${value}T00:00:00`);
    return isNaN(d.getTime()) ? null : d;
}

/** Attendance cannot exist for a day that has not happened. Without this cap a
 *  range ending at month-end reports every remaining day as Absent, which both
 *  inflates the absent count and deflates the attendance percentage. */
function today(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** What the stepper shows: a month name when the range is exactly a month,
 *  otherwise the literal span. */
function rangeLabel(range: DateRange): string {
    const start = toDate(range.startDate);
    if (!start) return 'Select range';
    if (isWholeMonth(range)) {
        return start.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    }
    const end = toDate(range.endDate);
    const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    return end ? `${fmt(start)} – ${fmt(end)}` : fmt(start);
}

function monthsAgo(delta: number): DateRange | null {
    const now = new Date();
    return monthRange(now.getFullYear(), now.getMonth() - delta);
}

export function AttendanceToolbar({
    dateRange, onRangeChange, onStepMonth,
    statusFilter, onStatusFilterChange,
    sortOrder, onSortOrderChange,
    selectionMode, onSelectionModeChange,
    totalRecords,
}: {
    dateRange: DateRange;
    onRangeChange: (next: Partial<DateRange>) => void;
    onStepMonth: (delta: number) => void;
    statusFilter: StatusFilter;
    onStatusFilterChange: (next: StatusFilter) => void;
    sortOrder: SortOrder;
    onSortOrderChange: (next: SortOrder) => void;
    selectionMode: boolean;
    onSelectionModeChange: (next: boolean) => void;
    totalRecords: number;
}) {
    const [pickerOpen, setPickerOpen] = useState(false);
    const [showCustom, setShowCustom] = useState(false);

    // The next month is unreachable once it would start after today.
    const nextDisabled = (() => {
        const start = toDate(dateRange.startDate);
        if (!start) return true;
        return monthRange(start.getFullYear(), start.getMonth() + 1) === null;
    })();

    const presets: { label: string; range: DateRange | null }[] = [
        { label: 'This month', range: monthsAgo(0) },
        { label: 'Last month', range: monthsAgo(1) },
        {
            label: 'Last 3 months',
            range: (() => {
                const from = monthsAgo(2);
                const to = monthsAgo(0);
                return from && to ? { startDate: from.startDate, endDate: to.endDate } : null;
            })(),
        },
    ];

    const applyPreset = (range: DateRange) => {
        onRangeChange(range);
        setPickerOpen(false);
        setShowCustom(false);
    };

    return (
        // No card chrome. This is a control strip, not content — a bordered box
        // gave it the same visual weight as the records below it.
        <div className="space-y-2">
            {/* Primary row: the range owns it. */}
            <div className="flex items-center gap-1">
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-11 shrink-0 sm:size-9"
                    onClick={() => onStepMonth(-1)}
                    aria-label="Previous month"
                >
                    <ChevronLeft className="size-4" aria-hidden="true" />
                </Button>

                <Popover
                    open={pickerOpen}
                    onOpenChange={(open) => { setPickerOpen(open); if (!open) setShowCustom(false); }}
                >
                    <PopoverTrigger asChild>
                        <Button
                            variant="ghost"
                            className="h-11 min-w-0 flex-1 justify-center gap-1.5 text-base font-semibold sm:h-9 sm:text-sm"
                        >
                            <span className="truncate">{rangeLabel(dateRange)}</span>
                            <ChevronDown className="size-4 shrink-0 opacity-60" aria-hidden="true" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-1" align="center">
                        {!showCustom ? (
                            <div role="menu">
                                {presets.map((p) => {
                                    const active = !!p.range
                                        && p.range.startDate === dateRange.startDate
                                        && p.range.endDate === dateRange.endDate;
                                    return (
                                        <button
                                            key={p.label}
                                            type="button"
                                            role="menuitem"
                                            disabled={!p.range}
                                            onClick={() => p.range && applyPreset(p.range)}
                                            className="flex w-full items-center gap-2 rounded-sm px-3 py-2.5 text-left text-sm text-foreground hover:bg-accent focus-visible:bg-accent focus-visible:outline-none disabled:opacity-50"
                                        >
                                            <Check
                                                className={`size-4 shrink-0 ${active ? 'opacity-100' : 'opacity-0'}`}
                                                aria-hidden="true"
                                            />
                                            {p.label}
                                        </button>
                                    );
                                })}
                                <div className="my-1 h-px bg-border" />
                                <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => setShowCustom(true)}
                                    className="flex w-full items-center gap-2 rounded-sm px-3 py-2.5 text-left text-sm text-foreground hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                                >
                                    <span className="size-4 shrink-0" aria-hidden="true" />
                                    Custom range…
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3 p-2">
                                {/* Wrapping labels: EnhancedDatePicker takes no
                                    `id`, so htmlFor would point at nothing. */}
                                <Label className="block text-xs font-medium text-muted-foreground">
                                    From
                                    <EnhancedDatePicker
                                        value={toDate(dateRange.startDate)}
                                        onChange={(d) => d && onRangeChange({ startDate: localDateKey(d) })}
                                        maxDate={toDate(dateRange.endDate) ?? today()}
                                        className="mt-1"
                                    />
                                </Label>
                                <Label className="block text-xs font-medium text-muted-foreground">
                                    To
                                    <EnhancedDatePicker
                                        value={toDate(dateRange.endDate)}
                                        onChange={(d) => d && onRangeChange({ endDate: localDateKey(d) })}
                                        minDate={toDate(dateRange.startDate) ?? undefined}
                                        maxDate={today()}
                                        className="mt-1"
                                    />
                                </Label>
                                <Button
                                    variant="secondary"
                                    className="h-9 w-full"
                                    onClick={() => { setPickerOpen(false); setShowCustom(false); }}
                                >
                                    Done
                                </Button>
                            </div>
                        )}
                    </PopoverContent>
                </Popover>

                <Button
                    variant="ghost"
                    size="icon"
                    className="size-11 shrink-0 sm:size-9"
                    onClick={() => onStepMonth(1)}
                    disabled={nextDisabled}
                    aria-label="Next month"
                >
                    <ChevronRight className="size-4" aria-hidden="true" />
                </Button>
            </div>

            {/* Secondary row: filters and mode, deliberately lighter than the
                range above and separated from it by a rule. */}
            <div className="flex items-center gap-2 border-t border-border pt-2">
                <Select
                    value={statusFilter}
                    onValueChange={(v) => onStatusFilterChange(v as StatusFilter)}
                >
                    <SelectTrigger
                        className="h-9 min-w-0 flex-1 border-0 bg-transparent text-xs shadow-none sm:w-40 sm:flex-none"
                        aria-label="Filter by status"
                    >
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {STATUS_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Button
                    variant="ghost"
                    size="icon"
                    className="size-9 shrink-0"
                    onClick={() => onSortOrderChange(sortOrder === 'desc' ? 'asc' : 'desc')}
                    aria-label={`Sort by date, currently ${sortOrder === 'desc' ? 'newest' : 'oldest'} first`}
                >
                    {sortOrder === 'desc'
                        ? <ArrowDownWideNarrow className="size-4" aria-hidden="true" />
                        : <ArrowUpWideNarrow className="size-4" aria-hidden="true" />}
                </Button>

                <Button
                    variant={selectionMode ? 'secondary' : 'ghost'}
                    size="icon"
                    className="size-9 shrink-0"
                    onClick={() => onSelectionModeChange(!selectionMode)}
                    aria-pressed={selectionMode}
                    aria-label={selectionMode ? 'Exit selection mode' : 'Select multiple records'}
                >
                    <CheckSquare className="size-4" aria-hidden="true" />
                </Button>

                <p className="ml-auto shrink-0 text-xs text-muted-foreground" aria-live="polite">
                    {totalRecords} record{totalRecords === 1 ? '' : 's'}
                </p>
            </div>
        </div>
    );
}
