import React, { useState } from 'react';
import { useToast } from '../ui/toast';
import { useConfirm } from '../ui/confirm-dialog';
import useAuth from '../../hooks/authjwt';

import {
    useGlobalSettings,
    useDepartmentSettings,
    useUpdateGlobalSettings,
    useUpdateDepartmentSettings,
    useDepartments,
    useRescheduleHrReport,
    useTestHrReport,
    useTestNotification,
    useRunRegularizationCleanup,
} from '../../hooks/queries';

import SettingsLayout from './settings/SettingsLayout';
import AttendanceSettings from './settings/AttendanceSettings';
import DepartmentManagement from './settings/DepartmentManagement';
import AppearanceSettings from './settings/AppearanceSettings';
import NotificationSettings from './settings/NotificationSettings';
import GeneralSettings from './settings/GeneralSettings';
import GeofenceSection from './settings/GeofenceSection';
import type { GeofenceSettings as GeofenceSettingsType } from './settings/types';
import {
    useSettingsForm,
    DEPARTMENT_SECTIONS,
    type SettingsSection,
} from './settings/useSettingsForm';

const SettingsPage: React.FC = () => {
    const user = useAuth();
    const { toast } = useToast();
    const confirm = useConfirm();
    const [activeSection, setActiveSection] = useState('attendance');
    const [selectedDepartment, setSelectedDepartment] = useState('');
    const [isTestingHrReport, setIsTestingHrReport] = useState(false);
    const [testingNotification, setTestingNotification] = useState(false);

    const canManageSettings = !!user && (user.role === 'admin' || user.role === 'hr');

    // Queries
    const { data: globalSettingsData, isLoading: globalSettingsLoading } = useGlobalSettings({
        enabled: canManageSettings && !selectedDepartment
    });

    const { data: departmentSettingsData, isLoading: departmentSettingsLoading } = useDepartmentSettings(
        selectedDepartment,
        { enabled: canManageSettings && !!selectedDepartment }
    );

    const { data: departments = [] } = useDepartments({ enabled: canManageSettings });

    // Mutations
    const updateGlobalSettingsMutation = useUpdateGlobalSettings();
    const updateDepartmentSettingsMutation = useUpdateDepartmentSettings();
    const rescheduleHrReportMutation = useRescheduleHrReport();
    const testHrReportMutation = useTestHrReport();
    const testNotificationMutation = useTestNotification();
    const runRegularizationCleanupMutation = useRunRegularizationCleanup();

    const loading = selectedDepartment ? departmentSettingsLoading : globalSettingsLoading;
    const saving = updateGlobalSettingsMutation.isPending || updateDepartmentSettingsMutation.isPending;

    const {
        formData,
        dirty,
        setSection,
        patchSection,
        resetSection,
        markSaved,
    } = useSettingsForm({
        serverData: selectedDepartment ? departmentSettingsData : globalSettingsData,
        scopeKey: selectedDepartment || 'global',
    });

    const showError = (err: unknown, title: string) => {
        const message = err instanceof Error ? err.message : 'Action failed';
        toast({ variant: 'destructive', title, description: message });
    };

    /**
     * Save only the section the user is editing. Sending the whole document
     * from every tab is what allowed concurrent editors to clobber each other.
     */
    const saveSection = async (section: SettingsSection) => {
        try {
            if (selectedDepartment) {
                if (!DEPARTMENT_SECTIONS.includes(section)) {
                    toast({
                        variant: 'warning',
                        title: 'Global Setting',
                        description: 'Notifications are configured globally. Switch scope to "Global" to change them.'
                    });
                    return;
                }
                await updateDepartmentSettingsMutation.mutateAsync({
                    departmentName: selectedDepartment,
                    settings: { [section]: formData[section] }
                });
                markSaved([section]);
                toast({
                    variant: 'success',
                    title: 'Settings Saved',
                    description: `Department settings updated for ${selectedDepartment}.`
                });
                return;
            }

            await updateGlobalSettingsMutation.mutateAsync({ [section]: formData[section] });
            markSaved([section]);

            // The report's schedule lives in the notifications section, so only
            // that save needs to rebuild the cron job. Runs on disable too.
            if (section === 'notifications') {
                await rescheduleHrReportMutation.mutateAsync();
            }

            toast({
                variant: 'success',
                title: 'Settings Saved',
                description: 'Global settings updated successfully!'
            });
        } catch (err) {
            showError(err, 'Save Failed');
        }
    };

    const handleResetSection = async (section: SettingsSection) => {
        if (!dirty[section]) return;
        const confirmed = await confirm({
            title: 'Discard changes?',
            description: 'Discard unsaved changes in this section?',
            confirmText: 'Discard',
            destructive: true,
        });
        if (confirmed) {
            resetSection(section);
        }
    };

    const handleDepartmentChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        // Read the value before awaiting — the select is controlled, so it
        // snaps back to `selectedDepartment` while the dialog is open.
        const next = e.target.value;
        if (dirty.attendance || dirty.notifications || dirty.general || dirty.requestRetention) {
            const confirmed = await confirm({
                title: 'Discard unsaved changes?',
                description: 'You have unsaved changes. Switch scope and discard them?',
                confirmText: 'Switch and discard',
                destructive: true,
            });
            if (!confirmed) {
                return;
            }
        }
        setSelectedDepartment(next);
    };

    // --- Attendance handlers ---
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        const [section, field] = name.split('.');

        if (section !== 'attendance' || !field) return;

        let nextValue: string | number | boolean;
        if (type === 'checkbox') {
            nextValue = checked;
        } else if (type === 'number') {
            // An emptied number input parses to NaN, which serialises to null
            // and would wipe the stored value. Treat it as 0 instead.
            const parsed = parseFloat(value);
            nextValue = Number.isNaN(parsed) ? 0 : parsed;
        } else {
            nextValue = value;
        }

        patchSection('attendance', { [field]: nextValue } as never);
    };

    const handleWorkingDayChange = (day: number, isWorking: boolean) => {
        const workingDays = new Set(formData.attendance.workingDays);
        const nonWorkingDays = new Set(formData.attendance.nonWorkingDays ?? []);

        if (isWorking) {
            workingDays.add(day);
            nonWorkingDays.delete(day);
        } else {
            workingDays.delete(day);
            nonWorkingDays.add(day);
        }

        patchSection('attendance', {
            workingDays: [...workingDays].sort((a, b) => a - b),
            nonWorkingDays: [...nonWorkingDays].sort((a, b) => a - b)
        });
    };

    const handleSaturdayHolidayChange = (saturdayNumber: number, isHoliday: boolean) => {
        const holidays = new Set(formData.attendance.saturdayHolidays);
        if (isHoliday) {
            holidays.add(saturdayNumber);
        } else {
            holidays.delete(saturdayNumber);
        }
        patchSection('attendance', { saturdayHolidays: [...holidays].sort((a, b) => a - b) });
    };

    const handleUpdateGeofence = (geofence: GeofenceSettingsType) => {
        patchSection('general', { geofence });
    };

    // --- Testing handlers ---
    const handleTestDailyHrAttendanceReport = async () => {
        if (formData.notifications.hrEmails.length === 0) {
            toast({
                variant: 'destructive',
                title: 'Configuration Required',
                description: 'Please configure HR emails first'
            });
            return;
        }

        setIsTestingHrReport(true);
        try {
            await testHrReportMutation.mutateAsync();
            toast({
                variant: 'success',
                title: 'Test Report Sent',
                description: `Test report sent successfully to ${formData.notifications.hrEmails.length} HR email(s)!`
            });
        } catch (err) {
            showError(err, 'Test Failed');
        } finally {
            setIsTestingHrReport(false);
        }
    };

    const handleTestNotification = async () => {
        if (!canManageSettings) {
            toast({
                variant: 'destructive',
                title: 'Access Denied',
                description: 'Only admin and HR users can test notifications'
            });
            return;
        }

        setTestingNotification(true);
        try {
            // Exercise each notification type in turn; the last response carries
            // the service-readiness details we report below.
            await testNotificationMutation.mutateAsync('hr');
            await testNotificationMutation.mutateAsync('milestone');
            const responseData = await testNotificationMutation.mutateAsync('holiday');

            if (!responseData?.success) {
                toast({
                    variant: 'destructive',
                    title: 'Test Failed',
                    description: `Server returned: ${responseData?.message || 'Unknown response format'}`
                });
                return;
            }

            const statusInfo: string[] = [];
            if (responseData.details?.emailReady) statusInfo.push('Email ✓');
            if (responseData.details?.pushReady) statusInfo.push('Push ✓');

            if (statusInfo.length === 0) {
                toast({
                    variant: 'warning',
                    title: 'Test Completed',
                    description: 'No notification services are configured.'
                });
            } else {
                toast({
                    variant: 'success',
                    title: 'All Tests Successful',
                    description: `All notification tests passed! Services ready: ${statusInfo.join(', ')}.`
                });
            }
        } catch (err) {
            showError(err, 'Test Failed');
        } finally {
            setTestingNotification(false);
        }
    };

    const handleRunRegularizationCleanup = async () => {
        const months = formData.requestRetention.regularization.retentionMonths;
        const confirmed = await confirm({
            title: 'Delete old regularization requests?',
            description: `This immediately and permanently deletes all regularization requests older than ${months} month${months === 1 ? '' : 's'}, including any still pending review. This cannot be undone.`,
            confirmText: 'Delete now',
            destructive: true,
        });
        if (!confirmed) return;

        try {
            const result = await runRegularizationCleanupMutation.mutateAsync(months);
            toast({
                variant: 'success',
                title: 'Cleanup Complete',
                description: `Deleted ${result?.deletedCount ?? 0} regularization request(s).`
            });
        } catch (err) {
            showError(err, 'Cleanup Failed');
        }
    };

    const renderContent = () => {
        switch (activeSection) {
            case 'attendance':
                return (
                    <AttendanceSettings
                        formData={formData}
                        selectedDepartment={selectedDepartment}
                        departments={departments}
                        loading={loading}
                        saving={saving}
                        isDirty={dirty.attendance}
                        onInputChange={handleInputChange}
                        onWorkingDayChange={handleWorkingDayChange}
                        onSaturdayHolidayChange={handleSaturdayHolidayChange}
                        onSave={() => saveSection('attendance')}
                        onReset={() => handleResetSection('attendance')}
                        onDepartmentChange={handleDepartmentChange}
                    />
                );
            case 'departments':
                return (
                    <DepartmentManagement
                        enabled={canManageSettings}
                        onDepartmentRenamed={(oldName, newName) => {
                            if (selectedDepartment === oldName) setSelectedDepartment(newName);
                        }}
                        onDepartmentDeleted={(name) => {
                            if (selectedDepartment === name) setSelectedDepartment('');
                        }}
                    />
                );
            case 'notifications':
                return (
                    <NotificationSettings
                        notifications={formData.notifications}
                        onUpdate={(next) => setSection('notifications', next)}
                        onTestNotification={handleTestNotification}
                        testingNotification={testingNotification}
                        onTestHrReport={handleTestDailyHrAttendanceReport}
                        testingHrReport={isTestingHrReport}
                        onSave={() => saveSection('notifications')}
                        onReset={() => handleResetSection('notifications')}
                        loading={loading}
                        saving={saving}
                        isDirty={dirty.notifications}
                        scopeIsDepartment={!!selectedDepartment}
                    />
                );
            case 'general':
                return (
                    <GeneralSettings
                        generalSettings={formData.general}
                        onUpdate={(next) => setSection('general', next)}
                        onSave={() => saveSection('general')}
                        onReset={() => handleResetSection('general')}
                        loading={loading}
                        saving={saving}
                        isDirty={dirty.general}
                        scopeIsDepartment={!!selectedDepartment}
                        requestRetention={formData.requestRetention}
                        onUpdateRequestRetention={(next) => setSection('requestRetention', next)}
                        onSaveRequestRetention={() => saveSection('requestRetention')}
                        onResetRequestRetention={() => handleResetSection('requestRetention')}
                        isRequestRetentionDirty={dirty.requestRetention}
                        onRunRegularizationCleanup={handleRunRegularizationCleanup}
                        runningRegularizationCleanup={runRegularizationCleanupMutation.isPending}
                    />
                );
            case 'appearance':
                return <AppearanceSettings />;
            case 'geofence':
                return (
                    <GeofenceSection
                        geofenceSettings={formData.general.geofence}
                        onUpdateGeofence={handleUpdateGeofence}
                        onSave={() => saveSection('general')}
                        onReset={() => handleResetSection('general')}
                        loading={loading}
                        saving={saving}
                        enabled={canManageSettings && activeSection === 'geofence'}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <SettingsLayout
            activeSection={activeSection}
            onSectionChange={setActiveSection}
        >
            {renderContent()}
        </SettingsLayout>
    );
};

export default SettingsPage;
