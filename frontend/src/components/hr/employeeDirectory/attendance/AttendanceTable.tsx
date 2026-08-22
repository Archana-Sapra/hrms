import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { useUpdateAttendanceRecord } from '@/hooks/queries';
import LocationMapModal from '@/components/ui/LocationMapModal';
import AttendanceAnalytics from './AttendanceAnalytics';
import { AttendanceToolbar } from './components/AttendanceToolbar';
import { AttendanceCards } from './components/AttendanceCards';
import { AttendanceTableView } from './components/AttendanceTableView';
import { AttendancePagination } from './components/AttendancePagination';
import { BulkEditDialog } from './components/BulkEditDialog';
import {
    AttendanceSkeleton, AttendanceEmpty, AttendanceError, AdjustedRangeNotice,
} from './components/AttendanceStates';
import { useAttendanceRecords } from './useAttendanceRecords';
import { useAttendanceSelection } from './useAttendanceSelection';
import { useAttendanceRange } from './useAttendanceRange';
import { localDateKey } from './types';
import type { AttendanceFormValues, AttendanceRow } from './types';
import type { Employee } from '@/types';

/** Rebuild the ISO instant for a given day from the time part of a
 *  `datetime-local` string, so bulk edits land on each record's own date. */
function timeOnDate(dayKey: string, datetimeLocal: string): string | null {
    const timePart = datetimeLocal.split('T')[1];
    if (!timePart) return null;
    const d = new Date(`${dayKey}T${timePart}`);
    return isNaN(d.getTime()) ? null : d.toISOString();
}

export default function AttendanceTable({
    employeeId,
    employeeProfile,
    onEditAttendance,
}: {
    employeeId: string | undefined;
    employeeProfile: Employee | null;
    onEditAttendance: (record: AttendanceRow) => void;
}) {
    const { toast } = useToast();
    const { dateRange, setRange, stepMonth } = useAttendanceRange();
    const updateAttendance = useUpdateAttendanceRecord();

    const [locationRecord, setLocationRecord] = useState<AttendanceRow | null>(null);
    const [bulkOpen, setBulkOpen] = useState(false);

    const {
        visible, filtered, statistics, effectiveRange, isLoading, error,
        statusFilter, setStatusFilter, sortOrder, setSortOrder,
        page, setPage, totalPages, totalRecords,
    } = useAttendanceRecords({ employeeId, dateRange });

    const selection = useAttendanceSelection(filtered);

    if (!employeeId) {
        return (
            <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                No employee selected.
            </p>
        );
    }

    const handleBulkSubmit = async (values: AttendanceFormValues) => {
        const dates = Array.from(selection.selectedDates);
        if (dates.length === 0) return;

        try {
            await Promise.all(dates.map((dayKey) => {
                const record = filtered.find((r) => r.date === dayKey);
                if (!record) return Promise.resolve();

                // The record's own day, in local time — not the day the form
                // was seeded with, which is today.
                const recordDay = localDateKey(new Date(record.date));
                const absent = values.status === 'absent';

                return updateAttendance.mutateAsync({
                    recordId: record._id || 'new',
                    updateData: {
                        status: values.status,
                        employeeId,
                        date: record.date,
                        checkIn: absent ? null : timeOnDate(recordDay, values.checkIn),
                        checkOut: absent ? null : timeOnDate(recordDay, values.checkOut),
                    },
                });
            }));

            selection.clear();
            selection.setSelectionMode(false);
            setBulkOpen(false);
            toast({
                title: 'Attendance updated',
                description: `${dates.length} ${dates.length === 1 ? 'day' : 'days'} updated.`,
            });
        } catch (err) {
            toast({
                variant: 'destructive',
                title: 'Bulk update failed',
                description: err instanceof Error ? err.message : 'Please try again.',
            });
        }
    };

    return (
        <div className="space-y-4">
            <AttendanceAnalytics statistics={statistics} />

            {effectiveRange &&
                effectiveRange.requestedStartDate !== effectiveRange.effectiveStartDate && (
                    <AdjustedRangeNotice
                        requestedStartDate={effectiveRange.requestedStartDate}
                        joiningDate={effectiveRange.joiningDate}
                    />
                )}

            <AttendanceToolbar
                dateRange={dateRange}
                onRangeChange={setRange}
                onStepMonth={stepMonth}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                sortOrder={sortOrder}
                onSortOrderChange={setSortOrder}
                selectionMode={selection.selectionMode}
                onSelectionModeChange={selection.setSelectionMode}
                totalRecords={totalRecords}
            />

            {selection.selectedDates.size > 0 && (
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/40 p-3">
                    <span className="text-sm font-medium text-foreground">
                        {selection.selectedDates.size} selected
                    </span>
                    <div className="ml-auto flex gap-2">
                        <Button variant="ghost" className="h-11 sm:h-9" onClick={selection.clear}>
                            Clear
                        </Button>
                        <Button className="h-11 sm:h-9" onClick={() => setBulkOpen(true)}>
                            Update attendance
                        </Button>
                    </div>
                </div>
            )}

            {error ? (
                <AttendanceError message={error} />
            ) : isLoading ? (
                <AttendanceSkeleton />
            ) : visible.length === 0 ? (
                <AttendanceEmpty
                    hasFilter={statusFilter !== 'all'}
                    onClearFilter={() => setStatusFilter('all')}
                />
            ) : (
                <>
                    <AttendanceCards
                        records={visible}
                        selectionMode={selection.selectionMode}
                        selectedDates={selection.selectedDates}
                        onToggleSelect={selection.toggle}
                        onEdit={onEditAttendance}
                        onViewLocation={setLocationRecord}
                    />
                    <AttendanceTableView
                        records={visible}
                        selectionMode={selection.selectionMode}
                        selectedDates={selection.selectedDates}
                        allSelected={selection.allSelected}
                        onToggleSelect={selection.toggle}
                        onToggleSelectAll={selection.toggleAll}
                        onEdit={onEditAttendance}
                        onViewLocation={setLocationRecord}
                    />
                    <AttendancePagination
                        page={page}
                        totalPages={totalPages}
                        onPageChange={setPage}
                    />
                </>
            )}

            <BulkEditDialog
                open={bulkOpen}
                onOpenChange={setBulkOpen}
                selectedCount={selection.selectedDates.size}
                onSubmit={handleBulkSubmit}
                isSubmitting={updateAttendance.isPending}
            />

            {/* Mapped, not cast. AttendanceRow carries the same flat
                {latitude, longitude} the modal declares; only the absent case
                differs (null here, optional there), so it is mapped explicitly. */}
            <LocationMapModal
                isOpen={!!locationRecord}
                onClose={() => setLocationRecord(null)}
                attendanceRecord={
                    locationRecord
                        ? {
                            date: locationRecord.date,
                            checkIn: locationRecord.checkIn,
                            checkOut: locationRecord.checkOut,
                            status: locationRecord.status,
                            location: locationRecord.location ?? undefined,
                        }
                        : null
                }
                employeeProfile={employeeProfile}
            />
        </div>
    );
}
