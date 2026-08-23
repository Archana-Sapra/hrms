import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { recentMonths } from '../useAdminAttendanceMonth';

export function AdminAttendanceToolbar({
    monthValue, onMonthChange, offset, maxOffset, onStepWindow,
}: {
    monthValue: string;
    onMonthChange: (value: string) => void;
    offset: number;
    maxOffset: number;
    onStepWindow: (delta: number) => void;
}) {
    return (
        <div className="flex items-center gap-1 shrink-0">
            <Button
                variant="outline"
                size="icon"
                className="size-8 shrink-0"
                onClick={() => onStepWindow(1)}
                disabled={offset >= maxOffset}
                title="Previous 4 days"
                aria-label="Previous 4 days"
            >
                <ChevronLeft className="size-4" aria-hidden="true" />
            </Button>

            <Select value={monthValue} onValueChange={onMonthChange}>
                <SelectTrigger className="h-8 w-26 px-2" aria-label="Month">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {recentMonths(12).map((m) => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Button
                variant="outline"
                size="icon"
                className="size-8 shrink-0"
                onClick={() => onStepWindow(-1)}
                disabled={offset <= 0}
                title="Next 4 days"
                aria-label="Next 4 days"
            >
                <ChevronRight className="size-4" aria-hidden="true" />
            </Button>
        </div>
    );
}
