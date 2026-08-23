import { Badge } from '@/components/ui/badge';
import type { WindowStats } from '../useAdminAttendanceGrid';

/**
 * Stat tiles: 2-up on mobile, 4-up from `sm`, per the directory convention.
 *
 * Semantic colour comes from `ui/badge` variants, which is where this codebase
 * keeps it — there is no `--color-success` token, so a `text-success` would
 * silently render as nothing. The previous build wrapped every tile in a
 * `bg-green-50 dark:bg-green-900/20` pill with matching text colour, the raw
 * pair the house style forbids.
 */
export function AdminAttendanceStats({ stats }: { stats: WindowStats }) {
    const tiles = [
        { key: 'total', label: 'Employees', value: stats.total, variant: 'default' as const },
        { key: 'present', label: 'Present', value: stats.present, variant: 'success' as const },
        { key: 'absent', label: 'Absent', value: stats.absent, variant: 'error' as const },
        { key: 'leave', label: 'On leave', value: stats.leave, variant: 'secondary' as const },
        { key: 'holiday', label: 'Holiday', value: stats.holiday, variant: 'warning' as const },
    ].filter((t) => t.key !== 'holiday' || t.value > 0);

    return (
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {tiles.map(({ key, label, value, variant }) => (
                <div key={key} className="rounded-xl border border-border bg-muted/40 p-3">
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="mt-1.5">
                        <Badge variant={variant}>{value}</Badge>
                    </dd>
                </div>
            ))}
        </dl>
    );
}
