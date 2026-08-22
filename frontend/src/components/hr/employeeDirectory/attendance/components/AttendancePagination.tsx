import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Window of at most five page numbers centred on the current page. */
function pageWindow(current: number, total: number): number[] {
    const start = Math.max(1, Math.min(current - 2, total - 4));
    const count = Math.min(5, total);
    return Array.from({ length: count }, (_, i) => start + i).filter((p) => p >= 1 && p <= total);
}

export function AttendancePagination({
    page, totalPages, onPageChange,
}: {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}) {
    if (totalPages <= 1) return null;

    return (
        <nav
            className="flex items-center justify-between gap-2 pt-2"
            aria-label="Attendance pagination"
        >
            <Button
                variant="outline"
                className="h-11 sm:h-9"
                onClick={() => onPageChange(page - 1)}
                disabled={page === 1}
            >
                <ChevronLeft className="size-4 sm:mr-1" aria-hidden="true" />
                <span className="sr-only sm:not-sr-only">Previous</span>
            </Button>

            {/* Numbered pages are a desktop affordance; on a phone the count
                below carries the same information without wrapping the row. */}
            <div className="hidden items-center gap-1 sm:flex">
                {pageWindow(page, totalPages).map((p) => (
                    <Button
                        key={p}
                        variant={p === page ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => onPageChange(p)}
                        aria-label={`Page ${p}`}
                        aria-current={p === page ? 'page' : undefined}
                    >
                        {p}
                    </Button>
                ))}
            </div>

            <p className="text-sm text-muted-foreground sm:hidden" aria-live="polite">
                Page {page} of {totalPages}
            </p>

            <Button
                variant="outline"
                className="h-11 sm:h-9"
                onClick={() => onPageChange(page + 1)}
                disabled={page === totalPages}
            >
                <span className="sr-only sm:not-sr-only">Next</span>
                <ChevronRight className="size-4 sm:ml-1" aria-hidden="true" />
            </Button>
        </nav>
    );
}
