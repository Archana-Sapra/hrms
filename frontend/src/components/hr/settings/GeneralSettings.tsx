import React from 'react';
import { RotateCcw, Save, Trash2 } from 'lucide-react';
import { GeneralSettingsData, RequestRetentionSettingsData } from './types';

interface GeneralSettingsProps {
    generalSettings: GeneralSettingsData;
    onUpdate: (newSettings: GeneralSettingsData) => void;
    onSave: () => void;
    onReset: () => void;
    loading: boolean;
    saving: boolean;
    /** Enables Save/Reset only when this section has unsaved edits. */
    isDirty?: boolean;
    /**
     * Request retention is global-only - the department endpoint does not
     * accept it. When a department scope is selected the section is read-only.
     */
    scopeIsDepartment?: boolean;
    requestRetention: RequestRetentionSettingsData;
    onUpdateRequestRetention: (next: RequestRetentionSettingsData) => void;
    onSaveRequestRetention: () => void;
    onResetRequestRetention: () => void;
    isRequestRetentionDirty?: boolean;
    onRunRegularizationCleanup: () => void;
    runningRegularizationCleanup?: boolean;
}

const RETENTION_MONTH_OPTIONS: Array<1 | 2 | 3 | 6 | 12> = [1, 2, 3, 6, 12];

const GeneralSettings: React.FC<GeneralSettingsProps> = ({
    generalSettings,
    onUpdate,
    onSave,
    onReset,
    loading,
    saving,
    isDirty = false,
    scopeIsDepartment = false,
    requestRetention,
    onUpdateRequestRetention,
    onSaveRequestRetention,
    onResetRequestRetention,
    isRequestRetentionDirty = false,
    onRunRegularizationCleanup,
    runningRegularizationCleanup = false
}) => {
    const handleChange = (field: keyof GeneralSettingsData, value: string) => {
        onUpdate({ ...generalSettings, [field]: value });
    };

    const updateRegularizationRetention = (field: 'enabled' | 'retentionMonths', value: boolean | number) => {
        onUpdateRequestRetention({
            regularization: {
                ...requestRetention.regularization,
                [field]: value
            }
        });
    };

    return (
        <div className="space-y-6">
            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2">
                {isDirty && (
                    <span className="mr-auto text-sm text-amber-600 dark:text-amber-400">
                        Unsaved changes
                    </span>
                )}
                <button
                    onClick={onReset}
                    disabled={loading || saving || !isDirty}
                    className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Discard changes and reload"
                >
                    <RotateCcw className="w-4 h-4" />
                    <span className="hidden sm:inline">Reset</span>
                </button>
                <button
                    onClick={onSave}
                    disabled={saving || loading || !isDirty}
                    className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                >
                    <Save className="w-4 h-4" />
                    <span>{saving ? 'Saving...' : 'Save'}</span>
                </button>
            </div>

            {/* Location Settings */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Check-in Location Settings</h3>
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <input
                            type="radio"
                            id="location-na"
                            name="general.locationSetting"
                            value="na"
                            checked={generalSettings.locationSetting === 'na'}
                            onChange={() => handleChange('locationSetting', 'na')}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="location-na" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            <span className="block">N/A - No Location Required</span>
                            <span className="block text-xs text-slate-500 dark:text-slate-400">Check-in without location tracking</span>
                        </label>
                    </div>
                    <div className="flex items-center gap-3">
                        <input
                            type="radio"
                            id="location-optional"
                            name="general.locationSetting"
                            value="optional"
                            checked={generalSettings.locationSetting === 'optional'}
                            onChange={() => handleChange('locationSetting', 'optional')}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="location-optional" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            <span className="block">Optional - Allow Check-in Without Location</span>
                            <span className="block text-xs text-slate-500 dark:text-slate-400">Try to get location, but allow check-in even if permission is denied</span>
                        </label>
                    </div>
                    <div className="flex items-center gap-3">
                        <input
                            type="radio"
                            id="location-mandatory"
                            name="general.locationSetting"
                            value="mandatory"
                            checked={generalSettings.locationSetting === 'mandatory'}
                            onChange={() => handleChange('locationSetting', 'mandatory')}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="location-mandatory" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            <span className="block">Mandatory - Location Required</span>
                            <span className="block text-xs text-slate-500 dark:text-slate-400">Check-in not allowed if location permission is denied or unavailable</span>
                        </label>
                    </div>
                </div>
            </div>

            {/* Task Report Settings */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Check-out Task Report Settings</h3>
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <input
                            type="radio"
                            id="task-na"
                            name="general.taskReportSetting"
                            value="na"
                            checked={generalSettings.taskReportSetting === 'na'}
                            onChange={() => handleChange('taskReportSetting', 'na')}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="task-na" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            <span className="block">N/A - Direct Check-out</span>
                            <span className="block text-xs text-slate-500 dark:text-slate-400">Check-out without task report prompt</span>
                        </label>
                    </div>
                    <div className="flex items-center gap-3">
                        <input
                            type="radio"
                            id="task-optional"
                            name="general.taskReportSetting"
                            value="optional"
                            checked={generalSettings.taskReportSetting === 'optional'}
                            onChange={() => handleChange('taskReportSetting', 'optional')}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="task-optional" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            <span className="block">Optional - Prompt After Check-out</span>
                            <span className="block text-xs text-slate-500 dark:text-slate-400">Allow check-out, then ask if employee wants to submit task report</span>
                        </label>
                    </div>
                    <div className="flex items-center gap-3">
                        <input
                            type="radio"
                            id="task-mandatory"
                            name="general.taskReportSetting"
                            value="mandatory"
                            checked={generalSettings.taskReportSetting === 'mandatory'}
                            onChange={() => handleChange('taskReportSetting', 'mandatory')}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="task-mandatory" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            <span className="block">Mandatory - Required for Check-out</span>
                            <span className="block text-xs text-slate-500 dark:text-slate-400">Check-out not allowed without submitting task report</span>
                        </label>
                    </div>
                </div>
            </div>

            {scopeIsDepartment && (
                <div className="p-4 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 text-sm">
                    Regularization request retention is configured globally and cannot be overridden
                    per department. Switch the scope to &ldquo;Global&rdquo; on the Attendance tab to
                    change it.
                </div>
            )}

            {/* Regularization Request Auto-Delete */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4">
                    <div>
                        <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100">Regularization Request Auto-Delete</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            Permanently deletes regularization requests older than the selected period,
                            including any still pending review.
                        </p>
                    </div>
                    <input
                        type="checkbox"
                        checked={requestRetention.regularization.enabled}
                        onChange={(e) => updateRegularizationRetention('enabled', e.target.checked)}
                        disabled={scopeIsDepartment}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                </div>

                <div className="space-y-3 pl-4 border-l-2 border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-3">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 min-w-[120px]">
                            Delete requests older than:
                        </label>
                        <select
                            value={requestRetention.regularization.retentionMonths}
                            onChange={(e) => updateRegularizationRetention('retentionMonths', Number(e.target.value))}
                            disabled={scopeIsDepartment}
                            className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-slate-100"
                        >
                            {RETENTION_MONTH_OPTIONS.map((months) => (
                                <option key={months} value={months}>
                                    {months} {months === 1 ? 'month' : 'months'}
                                </option>
                            ))}
                        </select>
                    </div>
                    {requestRetention.regularization.enabled && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Runs automatically once a day.
                        </p>
                    )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-slate-200 dark:border-slate-700">
                    {isRequestRetentionDirty && !scopeIsDepartment && (
                        <span className="mr-auto text-sm text-amber-600 dark:text-amber-400">
                            Unsaved changes
                        </span>
                    )}
                    <button
                        onClick={onResetRequestRetention}
                        disabled={loading || saving || !isRequestRetentionDirty || scopeIsDepartment}
                        className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Discard changes and reload"
                    >
                        <RotateCcw className="w-4 h-4" />
                        <span className="hidden sm:inline">Reset</span>
                    </button>
                    <button
                        onClick={onSaveRequestRetention}
                        disabled={saving || loading || !isRequestRetentionDirty || scopeIsDepartment}
                        className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                    >
                        <Save className="w-4 h-4" />
                        <span>{saving ? 'Saving...' : 'Save'}</span>
                    </button>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-700">
                    <button
                        type="button"
                        onClick={onRunRegularizationCleanup}
                        disabled={runningRegularizationCleanup || scopeIsDepartment}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {runningRegularizationCleanup ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                <span>Running...</span>
                            </>
                        ) : (
                            <>
                                <Trash2 className="w-4 h-4" />
                                <span>Run Now</span>
                            </>
                        )}
                    </button>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                        Immediately deletes requests older than {requestRetention.regularization.retentionMonths}{' '}
                        {requestRetention.regularization.retentionMonths === 1 ? 'month' : 'months'}, using the
                        period selected above (even if unsaved). Works regardless of whether auto-delete is
                        enabled. This cannot be undone.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default GeneralSettings;
