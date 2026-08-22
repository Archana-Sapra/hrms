import { Badge } from '@/components/ui/badge';
import { describeStatus } from '../statusDescriptor';
import type { AttendanceRow } from '../types';

export function AttendanceStatusIcon({ record }: { record: AttendanceRow }) {
    const { Icon } = describeStatus(record);
    // The badge beside it already names the status, so the icon is decorative.
    return <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />;
}

export function AttendanceStatusBadge({ record }: { record: AttendanceRow }) {
    const { label, variant } = describeStatus(record);
    return <Badge variant={variant}>{label}</Badge>;
}
