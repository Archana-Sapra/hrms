import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { recentMonths } from '../useAdminAttendanceMonth';

/**
 * Month picker plus the day-window stepper.
 *
 * The stepper only appears from `md` up: below that the layout is a per-employee
 * day list rather than a windowed grid, so there is no window to step.
 */
export function AdminAttendanceToolbar({
    monthValue, onMonthChange, offset, maxOffset, onStepWindow, rangeLabel,
}: {
    monthValue: string;
    onMonthChange: (value: string) => void;
    offset: number;
    maxOffset: number;
    onStepWindow: (delta: number) => void;
    rangeLabel: string;
}) {
    return (
        <div className="flex flex-wrap items-center gap-2">
            <Select value={monthValue} onValueChange={onMonthChange}>
                <SelectTrigger className="h-11 w-[150px] sm:h-9" aria-label="Month">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {recentMonths(12).map((m) => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <div className="hidden items-center gap-1 md:flex">
                <Button
                    variant="outline"
                    size="icon"
                    className="size-9"
                    onClick={() => onStepWindow(1)}
                    disabled={offset >= maxOffset}
                    aria-label="Show earlier days"
                >
                    <ChevronLeft className="size-4" aria-hidden="true" />
                </Button>
                <span className="min-w-[9rem] text-center text-sm text-muted-foreground" aria-live="polite">
                    {rangeLabel}
                </span>
                <Button
                    variant="outline"
                    size="icon"
                    className="size-9"
                    onClick={() => onStepWindow(-1)}
                    disabled={offset <= 0}
                    aria-label="Show later days"
                >
                    <ChevronRight className="size-4" aria-hidden="true" />
                </Button>
            </div>
        </div>
    );
}
