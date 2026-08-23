import { useState } from 'react';
import { AdminAttendanceToolbar } from './adminAttendance/components/AdminAttendanceToolbar';
import { AdminAttendanceStats } from './adminAttendance/components/AdminAttendanceStats';
import { AdminAttendanceGrid } from './adminAttendance/components/AdminAttendanceGrid';
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

export default function AdminAttendanceTable() {
    const {
        monthValue, visibleDays, offset, maxOffset, range, setMonth, stepWindow,
    } = useAdminAttendanceMonth();

    const { records, isLoading, error, refetch } = useAdminAttendanceGrid(range);

    const [editTarget, setEditTarget] = useState<EditTarget | null>(null);

    const stats = windowStats(records, visibleDays);

    const handleEdit = (record: EmployeeAttendance, day: Date) => {
        setEditTarget({ row: rowFor(record, day), day, employee: record.employee });
    };

    return (
        <div className="bg-card rounded-xl shadow-lg border border-border p-4 sm:p-6 hover:shadow-xl transition-shadow duration-300">
            <div className="mb-4 sm:mb-6 space-y-3">
                <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg sm:text-xl font-bold text-foreground truncate">
                        Attendance Overview
                    </h3>
                    <AdminAttendanceToolbar
                        monthValue={monthValue}
                        onMonthChange={setMonth}
                        offset={offset}
                        maxOffset={maxOffset}
                        onStepWindow={stepWindow}
                    />
                </div>
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide text-sm">
                    <AdminAttendanceStats stats={stats} />
                </div>
            </div>

            {error ? (
                <AdminAttendanceError message={error} onRetry={() => refetch()} />
            ) : isLoading ? (
                <AdminAttendanceSkeleton />
            ) : visibleDays.length === 0 ? (
                <AdminAttendanceEmpty message="This month has not started yet." />
            ) : records.length === 0 ? (
                <AdminAttendanceEmpty message="No employees found." />
            ) : (
                <AdminAttendanceGrid
                    records={records}
                    days={visibleDays}
                    onEdit={handleEdit}
                />
            )}

            <AdminEditAttendanceModal
                target={editTarget}
                onClose={() => setEditTarget(null)}
            />
        </div>
    );
}
