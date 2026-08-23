import { useState } from 'react';
import { localDateKey } from '@/components/attendance/types';
import { AdminAttendanceToolbar } from './adminAttendance/components/AdminAttendanceToolbar';
import { AdminAttendanceStats } from './adminAttendance/components/AdminAttendanceStats';
import { AdminAttendanceGrid } from './adminAttendance/components/AdminAttendanceGrid';
import { AdminAttendanceCards } from './adminAttendance/components/AdminAttendanceCards';
import {
    AdminEditAttendanceModal, type EditTarget,
} from './adminAttendance/components/AdminEditAttendanceModal';
import {
    AdminAttendanceSkeleton, AdminAttendanceError, AdminAttendanceEmpty,
} from './adminAttendance/components/AdminAttendanceStates';
import { useAdminAttendanceMonth } from './adminAttendance/useAdminAttendanceMonth';
import {
    useAdminAttendanceGrid, rowFor, windowStats, type EmployeeAttendance,
} from './adminAttendance/useAdminAttendanceGrid';

/**
 * Company-wide attendance for a month.
 *
 * Orchestration only: the month and day window come from the URL, the data and
 * every derivation from `useAdminAttendanceGrid`, and the two presentations
 * from their own components. Nothing is mirrored into state through an effect —
 * the previous build held five pieces of derived state in `useState` and
 * re-synced them from two effects, which was four of the codebase's twenty
 * `set-state-in-effect` errors.
 *
 * No `memo`/`useCallback`/`useMemo`: React Compiler is enabled.
 */
export default function AdminAttendanceTable() {
    const {
        monthValue, visibleDays, offset, maxOffset, range, setMonth, stepWindow,
    } = useAdminAttendanceMonth();

    const { records, isLoading, error, refetch } = useAdminAttendanceGrid(range);

    const [editTarget, setEditTarget] = useState<EditTarget | null>(null);

    const stats = windowStats(records, visibleDays);

    const rangeLabel = visibleDays.length
        ? `${visibleDays[0].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${visibleDays[visibleDays.length - 1].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
        : '—';

    const handleEdit = (record: EmployeeAttendance, day: Date) => {
        setEditTarget({ row: rowFor(record, day), day, employee: record.employee });
    };

    return (
        <section className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-xl font-bold text-foreground">Attendance overview</h3>
                <AdminAttendanceToolbar
                    monthValue={monthValue}
                    onMonthChange={setMonth}
                    offset={offset}
                    maxOffset={maxOffset}
                    onStepWindow={stepWindow}
                    rangeLabel={rangeLabel}
                />
            </div>

            <AdminAttendanceStats stats={stats} />

            {error ? (
                <AdminAttendanceError message={error} onRetry={() => refetch()} />
            ) : isLoading ? (
                <AdminAttendanceSkeleton />
            ) : visibleDays.length === 0 ? (
                <AdminAttendanceEmpty message="This month has not started yet." />
            ) : records.length === 0 ? (
                <AdminAttendanceEmpty message="No employees found." />
            ) : (
                <>
                    {/* Below md the axis inverts to a per-employee day list; a
                        company-by-day grid cannot fit at 375px. */}
                    <AdminAttendanceCards
                        records={records}
                        days={visibleDays}
                        onEdit={handleEdit}
                    />
                    <AdminAttendanceGrid
                        records={records}
                        days={visibleDays}
                        onEdit={handleEdit}
                    />
                    <p className="text-xs text-muted-foreground">
                        Showing {visibleDays.length}{' '}
                        {visibleDays.length === 1 ? 'day' : 'days'} to{' '}
                        {localDateKey(visibleDays[visibleDays.length - 1])}.
                    </p>
                </>
            )}

            <AdminEditAttendanceModal
                target={editTarget}
                onClose={() => setEditTarget(null)}
            />
        </section>
    );
}
