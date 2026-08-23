import { CheckCircle, AlertCircle, XCircle, Calendar, Clock } from 'lucide-react';
import type { AttendanceStatistics } from '@/components/attendance/types';

export type { AttendanceStatistics };

type Tile = {
    title: string;
    value: number;
    Icon: typeof Calendar;
    subtitle?: string;
    /** 0–100; omitted for tiles where a proportion is meaningless. */
    progress?: number;
};

function pct(part: number, whole: number): number {
    return whole > 0 ? Math.min((part / whole) * 100, 100) : 0;
}

export default function AttendanceAnalytics({
    statistics,
}: {
    statistics: AttendanceStatistics | null;
}) {
    if (!statistics) {
        return (
            <p className="rounded-xl border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
                No attendance summary for this range.
            </p>
        );
    }

    const workingDays =
        statistics.total - (statistics.weekend || 0) - (statistics.holiday || 0);

    const primary: Tile[] = [
        { title: 'Working days', value: workingDays, Icon: Calendar },
        {
            title: 'Present',
            value: statistics.present || 0,
            Icon: CheckCircle,
            progress: pct(statistics.present || 0, workingDays),
            subtitle: `${pct(statistics.present || 0, workingDays).toFixed(0)}% attendance`,
        },
        {
            title: 'Absent',
            value: statistics.absent || 0,
            Icon: XCircle,
            progress: pct(statistics.absent || 0, workingDays),
        },
        {
            title: 'Half days',
            value: statistics.halfDay || 0,
            Icon: AlertCircle,
            progress: pct(statistics.halfDay || 0, workingDays),
        },
    ];

    const secondary: Tile[] = [
        { title: 'Weekends', value: statistics.weekend || 0, Icon: Calendar },
        { title: 'Holidays', value: statistics.holiday || 0, Icon: Calendar },
        { title: 'Leave', value: statistics.leave || 0, Icon: Calendar },
        { title: 'Late', value: statistics.late || 0, Icon: Clock },
    ].filter((t) => t.value > 0);

    return (
        <div className="space-y-3">
            {/* 4-up even on a phone. At 2-up these four tiles were two tall
                rows before the toolbar, so the first record sat off-screen.
                The icon is dropped below md to buy the width. */}
            <dl className="grid grid-cols-4 gap-2 md:gap-3">
                {primary.map((tile) => (
                    <div key={tile.title} className="rounded-xl border border-border bg-card p-2 md:p-3">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <dt className="truncate text-[11px] font-medium text-muted-foreground md:text-xs">
                                    {tile.title}
                                </dt>
                                <dd className="mt-0.5 text-xl font-semibold text-foreground md:text-2xl">
                                    {tile.value}
                                </dd>
                            </div>
                            <tile.Icon
                                className="hidden size-4 shrink-0 text-muted-foreground md:block"
                                aria-hidden="true"
                            />
                        </div>
                        {tile.subtitle && (
                            <p className="mt-1 hidden truncate text-xs text-muted-foreground md:block">
                                {tile.subtitle}
                            </p>
                        )}
                        {tile.progress !== undefined && (
                            <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted md:h-1.5">
                                <div
                                    className="h-full rounded-full bg-primary transition-all"
                                    style={{ width: `${tile.progress}%` }}
                                />
                            </div>
                        )}
                    </div>
                ))}
            </dl>

            {/* Secondary counts are context, not headline figures — an inline
                run of chips instead of four more full tiles. */}
            {secondary.length > 0 && (
                <dl className="flex flex-wrap gap-x-4 gap-y-1 px-1">
                    {secondary.map((tile) => (
                        <div key={tile.title} className="flex items-baseline gap-1.5">
                            <dt className="text-xs text-muted-foreground">{tile.title}</dt>
                            <dd className="text-sm font-semibold text-foreground">{tile.value}</dd>
                        </div>
                    ))}
                </dl>
            )}
        </div>
    );
}
