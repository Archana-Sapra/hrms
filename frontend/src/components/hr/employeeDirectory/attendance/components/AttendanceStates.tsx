import { CalendarX, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AttendanceSkeleton() {
    return (
        <div className="space-y-2" aria-busy="true" aria-label="Loading attendance records">
            {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-3">
                    <div className="flex items-center gap-3">
                        <div className="size-9 shrink-0 animate-pulse rounded-full bg-muted" />
                        <div className="flex-1 space-y-2">
                            <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
                            <div className="h-3 w-1/4 animate-pulse rounded bg-muted" />
                        </div>
                        <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
                    </div>
                </div>
            ))}
        </div>
    );
}

export function AttendanceEmpty({
    hasFilter, onClearFilter,
}: {
    hasFilter: boolean;
    onClearFilter: () => void;
}) {
    return (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <CalendarX className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
            <p className="mt-3 font-medium text-foreground">No records found</p>
            <p className="mt-1 text-sm text-muted-foreground">
                {hasFilter
                    ? 'No attendance matches this status in the selected range.'
                    : 'There is no attendance data for the selected date range.'}
            </p>
            {hasFilter && (
                <Button variant="outline" className="mt-4 h-11 sm:h-9" onClick={onClearFilter}>
                    Clear status filter
                </Button>
            )}
        </div>
    );
}

export function AttendanceError({ message }: { message: string }) {
    return (
        <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-border bg-card p-4"
        >
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
            <p className="text-sm text-destructive">{message}</p>
        </div>
    );
}

/** Shown when the backend clamps the requested window forward to the
 *  employee's joining date. */
export function AdjustedRangeNotice({
    requestedStartDate, joiningDate,
}: {
    requestedStartDate: string;
    joiningDate?: string;
}) {
    const fmt = (v: string) => {
        const d = new Date(v);
        return isNaN(d.getTime()) ? v : d.toLocaleDateString('en-GB');
    };
    return (
        <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 p-3">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
                Showing records from the joining date
                {joiningDate ? ` (${fmt(joiningDate)})` : ''} onwards. You asked for{' '}
                {fmt(requestedStartDate)}.
            </p>
        </div>
    );
}
