import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ProfileHeader } from './ProfileHeader';
import { ProfileFields } from './ProfileFields';
import LeaveSection from '../LeaveSection';
import DocumentManager from '../DocumentManager';
import AttendanceTable from '../attendance/AttendanceTable';
import type { AttendanceRow } from '@/components/attendance/types';
import type { Employee, Leave } from '@/types';

export function EmployeeProfile({
    employee, leaves, isLinked, isEditing, draft, errors, isSaving, isToggling,
    onEditAttendance,
    onEdit, onCancel, onSave, onFieldChange, onToggleStatus, onUnlink, onBack, showBack,
}: {
    employee: Employee;
    leaves: Leave[];
    isLinked: boolean;
    isEditing: boolean;
    draft: Partial<Employee> | null;
    errors: Record<string, string>;
    isSaving: boolean;
    isToggling: boolean;
    onEditAttendance: (record: AttendanceRow) => void;
    onEdit: () => void;
    onCancel: () => void;
    onSave: () => void;
    onFieldChange: (name: string, value: string) => void;
    onToggleStatus: () => void;
    onUnlink: () => void;
    onBack: () => void;
    showBack: boolean;
}) {
    const [tab, setTab] = useState('profile');

    // DocumentManager declares its own narrower profile shape with firstName and
    // lastName required, while Employee has both optional. It is out of scope to
    // change, so satisfy its contract here rather than casting.
    const documentProfile = {
        employeeId: employee.employeeId,
        firstName: employee.firstName ?? '',
        lastName: employee.lastName ?? '',
    };

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <ProfileHeader
                employee={employee}
                isEditing={isEditing}
                isSaving={isSaving}
                isToggling={isToggling}
                isLinked={isLinked}
                onEdit={onEdit}
                onCancel={onCancel}
                onSave={onSave}
                onToggleStatus={onToggleStatus}
                onUnlink={onUnlink}
                onBack={onBack}
                showBack={showBack}
            />

            {/* No `flex-1`: the tab panel sizes to its content. Stretching it to
                fill the parent left dead space below every short tab, since the
                panels vary a lot in height (Attendance is one page of rows,
                Profile is a long form). */}
            <Tabs value={tab} onValueChange={setTab} className="p-4">
                {/* Full-width on every breakpoint. `sm:w-auto sm:inline-grid`
                    squashed four tabs into the left third of a wide pane. */}
                <TabsList className="grid h-11 w-full grid-cols-4">
                    <TabsTrigger value="profile">Profile</TabsTrigger>
                    <TabsTrigger value="attendance">Attendance</TabsTrigger>
                    <TabsTrigger value="leave">Leave</TabsTrigger>
                    <TabsTrigger value="documents">Docs</TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="mt-4">
                    <ProfileFields
                        employee={employee}
                        draft={draft}
                        isEditing={isEditing}
                        errors={errors}
                        onFieldChange={onFieldChange}
                    />
                </TabsContent>

                <TabsContent value="attendance" className="mt-4">
                    {/* The date range is read from the URL by AttendanceTable
                        itself, so it is no longer threaded from the orchestrator. */}
                    <AttendanceTable
                        employeeId={employee.employeeId}
                        employeeProfile={employee}
                        onEditAttendance={onEditAttendance}
                    />
                </TabsContent>

                <TabsContent value="leave" className="mt-4">
                    <LeaveSection leaves={leaves} />
                </TabsContent>

                <TabsContent value="documents" className="mt-4">
                    <DocumentManager employeeProfile={documentProfile} onBack={() => setTab('profile')} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
