import { Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AdminAttendanceSkeleton() {
    return (
        <div className="space-y-2" role="status" aria-label="Loading attendance">
            {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
            ))}
        </div>
    );
}

export function AdminAttendanceError({
    message, onRetry,
}: {
    message: string;
    onRetry: () => void;
}) {
    return (
        <div className="rounded-xl border border-border p-8 text-center" role="alert">
            <p className="text-sm text-destructive">{message}</p>
            <Button variant="outline" className="mt-3 h-11 sm:h-9" onClick={onRetry}>
                Try again
            </Button>
        </div>
    );
}

export function AdminAttendanceEmpty({ message }: { message: string }) {
    return (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <Users className="mx-auto size-10 text-muted-foreground opacity-40" aria-hidden="true" />
            <p className="mt-3 font-medium text-foreground">{message}</p>
        </div>
    );
}
