import React, { useState, useEffect, useCallback, useReducer, useRef, lazy, Suspense } from "react";
import useAuth from "../hooks/authjwt";
import {
    useProfile,
    useMyAttendance,
    useEmployeeAttendanceWithAbsents,
    useHolidays,
    useAnnouncements,
    useMyLeaves,
    useMyHelpInquiries,
    useMyRegularizations,
    useMissingCheckouts,
    useEffectiveSettings,
    useCheckIn,
    useCheckOut,
    useRequestWFH,
    useRequestLeave,
    useSubmitHelpInquiry,
    useAdminDashboard,
} from "../hooks/queries";
import { useCreateExpense } from "../hooks/queries/useExpenses";
import LeaveRequestModal from "./LeaveRequestModal";
import HelpDeskModal, { type HelpDeskData } from "./HelpDeskModal";
import ExpenseModal from "./ExpenseModal";
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from "./ui/toast";
import RegularizationModal from "./dashboard/RegularizationModal";
import TaskReportModal from "./dashboard/TaskReportModal";
import WFHRequestModal from "./dashboard/WFHRequestModal";
import AbsentEmployeesModal from "./AbsentEmployeesModal";
import PresentEmployeesModal from "./PresentEmployeesModal";
import NonWorkingDayWarningModal from "./dashboard/NonWorkingDayWarningModal";
import NewYearBanner from './ui/NewYearBanner';
import IndependenceDayBanner from './ui/IndependenceDayBanner';
import ChristmasBanner from './ui/ChristmasBanner';

// Subcomponents
import Header from './dashboard/Header';

const AttendanceStats = lazy(() => import('./dashboard/AttendanceStats'));
const EmployeeAttendanceTable = lazy(() => import('./dashboard/EmployeeAttendanceTable'));
const LeaveRequestsTable = lazy(() => import('./dashboard/LeaveRequestsTable'));
const UpdatesSidebar = lazy(() => import('./dashboard/UpdatesSidebar'));
const AdminStats = lazy(() => import('./dashboard/AdminStats'));
const AdminAttendanceTable = lazy(() => import('./dashboard/AdminAttendanceTable'));
const AdminPendingRequests = lazy(() => import('./dashboard/AdminPendingRequests'));
const MissingCheckoutAlert = lazy(() => import('./dashboard/MissingCheckoutAlert'));
const AlertsSection = lazy(() => import('./dashboard/AlertsSection'));

import { getNonWorkingDayWarning, type NonWorkingDayWarning } from "@/utils/workingDay";

// Types
import { Holiday, Leave, HelpInquiry, RegularizationRequest, Employee, EffectiveSettings, Location, LeaveRequestDto, CreateHelpInquiryDto } from "@/types";


interface DashboardModals {
    showLeaveModal: boolean;
    showHelpModal: boolean;
    showRegularizationModal: boolean;
    showTaskReportModal: boolean;
    showAbsentEmployeesModal: boolean;
    showPresentEmployeesModal: boolean;
    showWFHModal: boolean;
    showNonWorkingDayWarning: boolean;
    showExpenseModal: boolean;
}

interface DashboardLoading {
    locationLoading: boolean;
    checkInLoading?: boolean;
    checkOutLoading?: boolean;
    wfhRequestLoading?: boolean;
    [key: string]: boolean | undefined;
}

interface DashboardAppState {
    isCheckedIn: boolean;
    dailyCycleComplete: boolean;
    regularizationPrefillData: any | null;
    taskReportSetting: 'na' | 'optional' | 'mandatory';
    pendingWFHContext: any | null;
    checkoutLocationRequired: boolean;
    wfhRequestPending: boolean;
    nonWorkingDayWarningData: NonWorkingDayWarning | null;
    pendingCheckInData?: any | null;
}

interface DashboardState {
    modals: DashboardModals;
    loading: DashboardLoading;
    app: DashboardAppState;
}

type DashboardAction =
    | { type: 'SET_MODAL'; modal: keyof DashboardModals; value: boolean }
    | { type: 'SET_LOADING'; field: keyof DashboardLoading; value: boolean }
    | { type: 'SET_APP_STATE'; field: keyof DashboardAppState; value: any };

// Local interface to match AttendanceStats requirements
interface DashboardAttendanceReport {
    attendancePercentage?: {
        totalWorkingDays: number;
        presentDays: number;
        absentDays: number;
        percentage: number;
    };
    statistics?: {
        weekend: number;
        holiday: number;
        halfDay: number;
        leave: number;
    };
}

// Component loading skeleton
const ComponentSkeleton = () => (
    <div className="animate-pulse bg-card rounded-xl p-6 border border-border shadow-sm">
        <div className="flex items-center justify-between mb-4">
            <div className="h-6 bg-muted rounded w-1/3"></div>
            <div className="h-4 bg-muted rounded w-16"></div>
        </div>
        <div className="space-y-3">
            <div className="h-4 bg-muted rounded w-full"></div>
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
        </div>
    </div>
);

const dashboardInitialState: DashboardState = {
    modals: {
        showLeaveModal: false,
        showHelpModal: false,
        showRegularizationModal: false,
        showTaskReportModal: false,
        showAbsentEmployeesModal: false,
        showPresentEmployeesModal: false,
        showWFHModal: false,
        showNonWorkingDayWarning: false,
        showExpenseModal: false,
    },
    loading: {
        locationLoading: false,
        checkInLoading: false,
        checkOutLoading: false,
        wfhRequestLoading: false,
    },
    app: {
        isCheckedIn: false,
        dailyCycleComplete: false,
        regularizationPrefillData: null,
        taskReportSetting: 'na',
        pendingWFHContext: null,
        checkoutLocationRequired: false,
        wfhRequestPending: false,
        nonWorkingDayWarningData: null,
        pendingCheckInData: null,
    }
};

const dashboardReducer = (state: DashboardState, action: DashboardAction): DashboardState => {
    switch (action.type) {
        case 'SET_MODAL':
            return {
                ...state,
                modals: { ...state.modals, [action.modal]: action.value }
            };

        case 'SET_LOADING':
            return {
                ...state,
                loading: { ...state.loading, [action.field]: action.value }
            };

        case 'SET_APP_STATE':
            return {
                ...state,
                app: { ...state.app, [action.field]: action.value }
            };

        default:
            return state;
    }
};

const HRMSDashboard: React.FC = () => {
    const user = useAuth();
    const username = user?.name || "User";
    const isAdmin = user?.role === 'admin' || user?.role === 'hr';
    const today = new Date().toISOString().slice(0, 10);

    // React Query Hooks
    const { data: profileData } = useProfile({ enabled: !!user?.employeeId });
    const { data: todayAttendance } = useMyAttendance({
        startDate: today,
        endDate: today,
        limit: 1
    }, { enabled: !!user?.employeeId });

    const { data: holidays = [], isFetched: holidaysFetched, refetch: refetchHolidays } = useHolidays();
    const { data: announcements = [] } = useAnnouncements();
    const { data: myLeaves = [] } = useMyLeaves({ enabled: !isAdmin });
    const { data: myHelpInquiries = [] } = useMyHelpInquiries({ enabled: !isAdmin });
    const { data: myRegularizations = [] } = useMyRegularizations({ enabled: !isAdmin });
    const { data: missingCheckouts = [] } = useMissingCheckouts();
    const { data: adminSummary } = useAdminDashboard({ enabled: !!isAdmin });

    // Mutations
    const checkInMutation = useCheckIn();
    const checkOutMutation = useCheckOut();
    const requestWFHMutation = useRequestWFH();
    const requestLeaveMutation = useRequestLeave();
    const submitHelpInquiryMutation = useSubmitHelpInquiry();
    const createExpenseMutation = useCreateExpense();

    // Monthly attendance
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const lastDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
    const formatDateForAPI = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    const monthStartDate = formatDateForAPI(firstDayOfMonth);
    const monthEndDate = formatDateForAPI(lastDayOfMonth);

    const { data: monthAttendanceDataRaw, isLoading: attendanceLoading } = useEmployeeAttendanceWithAbsents(
        {
            employeeId: user?.employeeId,
            startDate: monthStartDate,
            endDate: monthEndDate
        },
        { enabled: !!user?.employeeId && !isAdmin }
    );

    // The hook returns { success, data: { attendancePercentage, statistics, records, ... } }
    // Extract the actual report data for AttendanceStats
    const monthAttendanceData = monthAttendanceDataRaw?.data as DashboardAttendanceReport | undefined;

    const { data: effectiveSettings, refetch: refetchSettings } = useEffectiveSettings();

    const [dashboardState, dispatch] = useReducer(dashboardReducer, dashboardInitialState);
    const pendingRequestsRef = useRef<HTMLDivElement>(null);
    const [updatesActiveTab, setUpdatesActiveTab] = useState<"policies" | "holidays" | "announcements">("policies");

    const { modals, loading, app } = dashboardState;

    const {
        showLeaveModal,
        showHelpModal,
        showRegularizationModal,
        showTaskReportModal,
        showAbsentEmployeesModal,
        showPresentEmployeesModal,
        showWFHModal,
        showNonWorkingDayWarning,
        showExpenseModal
    } = modals;

    const {
        locationLoading,
        checkInLoading,
        checkOutLoading,
        wfhRequestLoading
    } = loading;

    const {
        isCheckedIn,
        dailyCycleComplete,
        regularizationPrefillData,
        taskReportSetting,
        pendingWFHContext,
        checkoutLocationRequired,
        wfhRequestPending,
        nonWorkingDayWarningData
    } = app;

    const setModal = useCallback((modal: keyof DashboardModals, value: boolean) =>
        dispatch({ type: 'SET_MODAL', modal, value }), []);

    const setLoading = useCallback((field: keyof DashboardLoading, value: boolean) =>
        dispatch({ type: 'SET_LOADING', field, value }), []);

    const setAppState = useCallback((field: keyof DashboardAppState, value: any) =>
        dispatch({ type: 'SET_APP_STATE', field, value }), []);

    const scrollToPendingRequests = useCallback(() => {
        if (pendingRequestsRef.current) {
            pendingRequestsRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    }, []);

    const switchToHolidaysTab = useCallback(() => {
        setUpdatesActiveTab("holidays");
    }, []);

    const getLocationCoordinates = useCallback(async ({ required = false, manageLoading = false }: { required?: boolean, manageLoading?: boolean } = {}) => {
        if (!navigator.geolocation) {
            if (required) {
                throw new Error("Location is required but this device does not support geolocation.");
            }
            return null;
        }

        if (manageLoading) {
            setLoading('locationLoading', true);
        }

        try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(
                    resolve,
                    reject,
                    {
                        enableHighAccuracy: true,
                        timeout: 20000,
                        maximumAge: 0
                    }
                );
            });

            return {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                capturedAt: new Date(position.timestamp).toISOString()
            };
        } catch (error: any) {
            let locationError = "Unable to capture location.";
            if (error.code !== undefined) {
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        locationError = "Location permission denied.";
                        break;
                    case error.POSITION_UNAVAILABLE:
                        locationError = "Location unavailable.";
                        break;
                    case error.TIMEOUT:
                        locationError = "Location request timed out.";
                        break;
                    default:
                        locationError = error.message || locationError;
                }
            } else if (error.message) {
                locationError = error.message;
            }

            if (required) {
                throw new Error(locationError);
            }

            console.warn("Geolocation warning:", locationError);
            return null;
        } finally {
            if (manageLoading) {
                setLoading('locationLoading', false);
            }
        }
    }, [setLoading]);

    const handleAbsentEmployeesClick = useCallback(() => {
        setModal('showAbsentEmployeesModal', true);
    }, [setModal]);

    const handlePresentEmployeesClick = useCallback(() => {
        setModal('showPresentEmployeesModal', true);
    }, [setModal]);

    const handleUpdatesTabChange = useCallback((tabId: "policies" | "holidays" | "announcements") => {
        setUpdatesActiveTab(tabId);
    }, []);

    const { theme, toggleTheme } = useTheme();
    const { toast } = useToast();

    const employeeFirstName = (profileData as unknown as Employee)?.firstName || username;

    useEffect(() => {
        if (todayAttendance && todayAttendance.length > 0) {
            const record = todayAttendance[0];
            setAppState('isCheckedIn', !!record.checkIn && !record.checkOut);
            setAppState('dailyCycleComplete', !!record.checkIn && !!record.checkOut);
        } else {
            setAppState('isCheckedIn', false);
            setAppState('dailyCycleComplete', false);
        }
    }, [todayAttendance, setAppState]);

    /**
     * Settings and holidays drive both the non-working-day warning and geofence
     * enforcement. On a cold cache they are still in flight, so resolve them
     * before deciding rather than falling back to defaults and failing open.
     */
    const resolveCheckInContext = async (): Promise<{
        settings: EffectiveSettings | Partial<EffectiveSettings>;
        holidaysData: Holiday[];
    }> => {
        const [settings, holidaysData] = await Promise.all([
            effectiveSettings ?? refetchSettings().then(r => r.data).catch(() => undefined),
            holidaysFetched ? holidays : refetchHolidays().then(r => r.data).catch(() => undefined),
        ]);

        return { settings: settings ?? {}, holidaysData: holidaysData ?? [] };
    };

    const handleCheckIn = async (skipNonWorkingDayCheck = false) => {
        setLoading('checkInLoading', true);
        let locationData: Location | undefined;

        try {
            const { settings, holidaysData } = await resolveCheckInContext();
            const locationSetting = settings.general?.locationSetting || 'na';
            const geofenceSettings = settings.general?.geofence || {};
            const requireLocation =
                locationSetting === 'mandatory' ||
                (geofenceSettings?.enabled === true && geofenceSettings?.enforceCheckIn === true);

            if (!skipNonWorkingDayCheck) {
                const nonWorkingDayWarning = getNonWorkingDayWarning(settings, holidaysData);
                if (nonWorkingDayWarning) {
                    setAppState('nonWorkingDayWarningData', nonWorkingDayWarning);
                    setModal('showNonWorkingDayWarning', true);
                    setLoading('checkInLoading', false);
                    return;
                }
            }

            try {
                const result = await getLocationCoordinates({
                    required: requireLocation,
                    manageLoading: requireLocation || locationSetting !== 'na'
                });
                locationData = result || undefined;
            } catch (locError: any) {
                console.warn("Location fetch failed:", locError);

                if (requireLocation && geofenceSettings?.allowWFHBypass) {
                    toast({
                        variant: "warning",
                        title: "Location Required",
                        description: "Unable to get your location. You can request Work From Home instead.",
                        duration: 5000
                    });

                    setAppState('pendingWFHContext', {
                        geofence: {
                            canRequestWFH: true,
                            reason: 'location_unavailable',
                            message: 'Location access failed or timed out'
                        },
                        location: null,
                        locationError: locError.message || 'Location unavailable'
                    });
                    setModal('showWFHModal', true);
                    return;
                } else if (requireLocation) {
                    throw locError;
                }
            }

            await checkInMutation.mutateAsync(locationData);
            setAppState('isCheckedIn', true);
            toast({
                variant: "success",
                title: "Checked In",
                description: "You have successfully checked in for today."
            });
        } catch (error: any) {
            console.error("Check-in error:", error);

            let title = "Check-in Issue";
            let description = "An unexpected error occurred.";
            let variant: "warning" | "error" | "success" | "default" = "warning";

            const errorDetails = error?.data?.errors || error?.data?.details;
            const geofenceDetails = errorDetails?.geofence;

            // An imprecise fix is not the same as being off-site, and must be
            // handled before the WFH branch below - that error also carries
            // canRequestWFH, so it would otherwise push the user to file a WFH
            // request when all they need to do is retry with a better signal.
            if (errorDetails?.locationInaccurate) {
                toast({
                    variant: "warning",
                    title: "Location Not Precise Enough",
                    description: error?.data?.message
                        || "Your location isn't accurate enough to confirm you're at the office. Move outdoors or near a window and try again.",
                    duration: 7000
                });
                return;
            }

            if (geofenceDetails?.canRequestWFH && locationData) {
                setAppState('pendingWFHContext', {
                    geofence: geofenceDetails,
                    location: locationData
                });
                setModal('showWFHModal', true);

                toast({
                    variant: "warning",
                    title: "Outside Office Location",
                    description: geofenceDetails.message || "You appear to be outside the office. Please submit a WFH request.",
                    duration: 5000
                });
                return;
            }

            if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                title = "Network Error";
                description = "Unable to connect to server. Please check your internet connection and try again.";
                variant = "error";
            } else if (error.data && error.data.message) {
                description = error.data.message;
                if (description.includes("Already checked in")) {
                    variant = "warning";
                } else if (description.includes("No linked employee")) {
                    description = "Your user account is not linked to an employee profile. Please contact HR.";
                    variant = "warning";
                } else if (error.status >= 400 && error.status < 500) {
                    variant = "warning";
                } else if (error.status >= 500) {
                    variant = "error";
                }
                if (error.data.details && error.data.details.validation) {
                    const validationErrors = Object.values(error.data.details.validation).join(", ");
                    description += `. Details: ${validationErrors}`;
                }
            } else {
                description = error.message || "Please try again.";
                if (error.message === "No linked employee profile found for user") {
                    description = "Your user account is not linked to an employee profile. Please contact HR.";
                } else if (error.message === "Already checked in for today") {
                    description = "You have already checked in for today.";
                } else if (error.status >= 500) {
                    title = "Server Error";
                    description = "Server error occurred. Please try again in a few moments.";
                    variant = "error";
                }
            }

            toast({
                variant,
                title,
                description
            });
        } finally {
            setLoading('checkInLoading', false);
            setLoading('locationLoading', false);
        }
    };

    const handleCheckOut = async () => {
        if (!user?.employeeId) {
            toast({
                variant: "warning",
                title: "Check-out Not Allowed",
                description: "Only employees with a linked profile can check out."
            });
            return;
        }

        try {
            const settings: any = effectiveSettings || {};
            const generalSettings = settings.general || {};
            const taskReportSettingValue = generalSettings.taskReportSetting || 'na';
            const locationSettingValue = generalSettings.locationSetting || 'na';
            const geofenceSettings = generalSettings.geofence || {};
            const requireLocationForCheckout =
                locationSettingValue === 'mandatory' ||
                (geofenceSettings?.enabled === true && geofenceSettings?.enforceCheckOut === true);

            setAppState('taskReportSetting', taskReportSettingValue);
            setAppState('checkoutLocationRequired', requireLocationForCheckout);

            if (taskReportSettingValue === 'na') {
                await handleDirectCheckOut({ requireLocation: requireLocationForCheckout });
            } else {
                setModal('showTaskReportModal', true);
            }
        } catch (error) {
            console.error("Error checking task report settings:", error);
            setModal('showTaskReportModal', true);
        }
    };

    const handleDirectCheckOut = async ({ requireLocation = checkoutLocationRequired } = {}) => {
        setLoading('checkOutLoading', true);
        let locationData: Location | undefined;
        try {
            const result = await getLocationCoordinates({
                required: requireLocation
            });
            locationData = result || undefined;

            await checkOutMutation.mutateAsync({
                tasks: [],
                ...locationData
            });
            toast({
                title: "Checked Out Successfully",
                description: "You have successfully checked out."
            });
            setAppState('isCheckedIn', false);
            setAppState('dailyCycleComplete', true);
        } catch (error: any) {
            console.error("Check-out error:", error);

            let title = "Check-out Failed";
            let description = "An unexpected error occurred during check-out.";
            let variant: "error" | "warning" = "error";

            if (error?.response?.data?.message) {
                description = error.response.data.message;
                if (error.response.status === 400) {
                    variant = "warning";
                    title = "Check-out Not Allowed";
                }
            } else if (error.message) {
                description = error.message;
            }

            toast({
                variant,
                title,
                description
            });
        } finally {
            setLoading('checkOutLoading', false);
        }
    };

    const handleTaskReportSubmit = async (tasks: string[]) => {
        setLoading('checkOutLoading', true);
        let locationData: Location | undefined;
        try {
            const result = await getLocationCoordinates({
                required: checkoutLocationRequired
            });
            locationData = result || undefined;

            await checkOutMutation.mutateAsync({
                tasks,
                ...locationData
            });
            toast({
                title: "Checked Out Successfully",
                description: "Your work report has been submitted."
            });
            setAppState('isCheckedIn', false);
            setAppState('dailyCycleComplete', true);
            setModal('showTaskReportModal', false);
        } catch (error: any) {
            console.error("Check-out error:", error);

            let title = "Check-out Failed";
            let description = "An unexpected error occurred during check-out.";
            let variant: "error" | "warning" = "error";

            if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                title = "Network Error";
                description = "Unable to connect to server. Please check your internet connection and try again.";
            }
            else if (error.data && error.data.message) {
                description = error.data.message;

                if (description.includes("No check-in record")) {
                    variant = "warning";
                } else if (description.includes("Already checked out")) {
                    variant = "warning";
                } else if (error.status >= 400 && error.status < 500) {
                    variant = "warning";
                }

                if (error.data.details && error.data.details.validation) {
                    const validationErrors = Object.values(error.data.details.validation).join(", ");
                    description += `. Details: ${validationErrors}`;
                }
            }
            else {
                description = error.message || description;
            }

            toast({
                variant,
                title,
                description
            });
        } finally {
            setLoading('checkOutLoading', false);
        }
    };

    const handleTaskReportSkip = async () => {
        await handleDirectCheckOut({ requireLocation: checkoutLocationRequired });
        setModal('showTaskReportModal', false);
    };

    const handleWFHModalClose = useCallback(() => {
        setModal('showWFHModal', false);
        setAppState('pendingWFHContext', null);
    }, [setModal, setAppState]);

    const handleWFHRequestSubmit = async (reason: string) => {
        if (!pendingWFHContext) {
            handleWFHModalClose();
            return;
        }

        setLoading('wfhRequestLoading', true);
        try {
            const payload = {
                reason,
                ...(pendingWFHContext.location || {})
            };

            await requestWFHMutation.mutateAsync(payload);
            toast({
                variant: "success",
                title: "WFH Request Submitted",
                description: "HR has been notified about your work from home request."
            });
            handleWFHModalClose();
            setAppState('wfhRequestPending', true);
        } catch (error: any) {
            console.error("WFH request error:", error);
            const description = error.data?.message || error.message || "Failed to submit WFH request. Please try again.";
            toast({
                variant: "error",
                title: "WFH Request Failed",
                description
            });
        } finally {
            setLoading('wfhRequestLoading', false);
        }
    };

    const handleLeaveRequestSubmit = async (data: LeaveRequestDto) => {
        try {
            await requestLeaveMutation.mutateAsync(data);
            toast({
                variant: "success",
                title: "Leave Request Submitted",
                description: "Your leave request has been submitted successfully."
            });
            setModal('showLeaveModal', false);
        } catch (error: unknown) {
            console.error("Leave request error:", error);

            const title = "Leave Request Failed";
            let description = "Failed to submit leave request.";

            const apiError = error as { message?: string; validationDetails?: Array<{ field: string; message: string }> };

            if (apiError.message) {
                description = apiError.message;
            }

            // Show validation details if available
            if (apiError.validationDetails && apiError.validationDetails.length > 0) {
                const validationMessages = apiError.validationDetails.map(d => d.message).join(", ");
                description = validationMessages;
            }

            toast({
                variant: "error",
                title,
                description
            });
        }
    };

    const handleHelpInquirySubmit = async (data: HelpDeskData) => {
        try {
            const helpData: CreateHelpInquiryDto = {
                subject: data.title,
                description: data.message,
                category: data.category,
                priority: data.priority
            };

            await submitHelpInquiryMutation.mutateAsync(helpData);
            toast({
                variant: "success",
                title: "Inquiry Submitted",
                description: "Your help desk inquiry has been submitted."
            });
            setModal('showHelpModal', false);
        } catch (error: any) {
            console.error("Help inquiry error:", error);

            let title = "Submission Failed";
            let description = "Failed to submit help inquiry.";

            if (error.data && error.data.message) {
                description = error.data.message;

                if (error.data.details && error.data.details.validation) {
                    const validationErrors = Object.values(error.data.details.validation).join(", ");
                    description += `. Details: ${validationErrors}`;
                }
            }
            else {
                description = error.message || description;
            }

            toast({
                variant: "error",
                title,
                description
            });
        }
    };

    const handleRegularizationFromReminder = (prefillData: any) => {
        setAppState('regularizationPrefillData', prefillData);
        setModal('showRegularizationModal', true);
    };

    const formatLeaveType = useCallback((type: string | undefined) => {
        if (!type) return '';
        const types: Record<string, string> = {
            "full-day": "Full Day",
            "half-day": "Half Day",
            "sick-leave": "Sick Leave",
            "vacation": "Vacation",
            "personal": "Personal Leave"
        };
        return types[type] || type;
    }, []);

    const allRequests = [
        ...(myLeaves || []).map((l: Leave) => ({
            ...l,
            type: 'leave' as const,
            displayDate: l.startDate,
            displayReason: l.reason || '',
            status: l.status || 'pending',
        })),
        ...(myHelpInquiries || []).map((h: HelpInquiry) => ({
            ...h,
            type: 'help' as const,
            displayDate: h.createdAt,
            displayReason: (h as any).description || h.message || '',
            status: h.status || 'pending',
        })),
        ...(myRegularizations || []).map((r: RegularizationRequest) => ({
            ...r,
            type: 'regularization' as const,
            displayDate: r.date,
            displayReason: r.reason,
            status: r.status,
            requestedCheckIn: r.requestedCheckIn,
            requestedCheckOut: r.requestedCheckOut,
            reviewComment: r.reviewComment,
        })),
    ];

    return (
        <div className="bg-background text-foreground">
            <div className="flex flex-col">
                <ChristmasBanner username={employeeFirstName} />
                <NewYearBanner />
                <IndependenceDayBanner username={employeeFirstName} />
                <Header
                    username={username}
                    isCheckedIn={!!isCheckedIn}
                    dailyCycleComplete={!!dailyCycleComplete}
                    checkInLoading={!!checkInLoading}
                    checkOutLoading={!!checkOutLoading}
                    locationLoading={!!locationLoading}
                    handleCheckIn={() => handleCheckIn(false)}
                    handleCheckOut={handleCheckOut}
                    setShowLeaveModal={(value: boolean) => setModal('showLeaveModal', value)}
                    setShowHelpModal={(value: boolean) => setModal('showHelpModal', value)}
                    setShowRegularizationModal={(value: boolean) => setModal('showRegularizationModal', value)}
                    setShowExpenseModal={(value: boolean) => setModal('showExpenseModal', value)}
                    wfhRequestPending={!!wfhRequestPending}
                    toggleTheme={toggleTheme}
                    theme={theme}
                />

                <main id="main-content" className="p-4 sm:p-6 lg:p-8" role="main">
                    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
                        <div className="w-full lg:w-3/4 space-y-6 lg:space-y-8">
                            {isAdmin ? (
                                <>
                                    <Suspense fallback={<ComponentSkeleton />}>
                                        <AlertsSection />
                                    </Suspense>
                                    <Suspense fallback={<ComponentSkeleton />}>
                                        <AdminStats
                                            summaryData={adminSummary}
                                            isLoading={false}
                                            onPendingRequestsClick={scrollToPendingRequests}
                                            onHolidaysClick={switchToHolidaysTab}
                                            onAbsentEmployeesClick={handleAbsentEmployeesClick}
                                            onPresentEmployeesClick={handlePresentEmployeesClick}
                                        />
                                    </Suspense>

                                    {/* Prioritize Work Queue visually above Attendance */}
                                    <div className="space-y-8">
                                        <div>
                                            <div className="flex items-center justify-between mb-3">
                                                <h2 className="text-base font-semibold text-foreground">Work Queue</h2>
                                            </div>
                                            <Suspense fallback={<ComponentSkeleton />}>
                                                <div ref={pendingRequestsRef}>
                                                    <AdminPendingRequests />
                                                </div>
                                            </Suspense>
                                        </div>
                                        <div>
                                            <div className="flex items-center justify-between mb-3">
                                                <h2 className="text-base font-semibold text-foreground">Team Attendance</h2>
                                            </div>
                                            <Suspense fallback={<ComponentSkeleton />}>
                                                <AdminAttendanceTable />
                                            </Suspense>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <Suspense fallback={<ComponentSkeleton />}>
                                        <AlertsSection />
                                    </Suspense>
                                    <Suspense fallback={<ComponentSkeleton />}>
                                        <MissingCheckoutAlert
                                            onRegularizationRequest={handleRegularizationFromReminder}
                                        />
                                    </Suspense>
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <h2 className="text-base font-semibold text-foreground">Overview</h2>
                                        </div>
                                        <Suspense fallback={<ComponentSkeleton />}>
                                            <AttendanceStats
                                                attendanceReport={monthAttendanceData}
                                                isLoading={attendanceLoading}
                                                missingCheckoutsCount={missingCheckouts?.length || 0}
                                            />
                                        </Suspense>
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <h2 className="text-base font-semibold text-foreground">My Attendance</h2>
                                        </div>
                                        <Suspense fallback={<ComponentSkeleton />}>
                                            <EmployeeAttendanceTable
                                                onRegularizationRequest={handleRegularizationFromReminder}
                                            />
                                        </Suspense>
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <h2 className="text-base font-semibold text-foreground">Requests</h2>
                                        </div>
                                        <Suspense fallback={<ComponentSkeleton />}>
                                            <LeaveRequestsTable
                                                leaveRequests={allRequests}
                                                helpInquiries={[]}
                                                loadingLeaveRequests={false}
                                                onNewRequest={() => setModal('showLeaveModal', true)}
                                                onNewHelpRequest={() => setModal('showHelpModal', true)}
                                                formatLeaveType={formatLeaveType}
                                            />
                                        </Suspense>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="w-full lg:w-1/4 lg:pl-2">
                            <Suspense fallback={<ComponentSkeleton />}>
                                <UpdatesSidebar
                                    announcements={(announcements || []).map((a) => ({
                                        id: a._id,
                                        title: a.title,
                                        content: a.content,
                                        priority: 'Medium',
                                        author: a.authorName ? { name: a.authorName } : undefined,
                                        createdAt: a.createdAt,
                                        date: a.createdAt
                                    }))}
                                    holidays={(holidays || []).map((h) => ({
                                        id: h._id,
                                        name: h.title,
                                        date: h.date
                                    }))}
                                    initialActiveTab={updatesActiveTab}
                                    onTabChange={handleUpdatesTabChange}
                                />
                            </Suspense>
                        </div>
                    </div>
                </main>
            </div>

            {/* Modals */}
            <LeaveRequestModal
                isOpen={showLeaveModal}
                onClose={() => setModal('showLeaveModal', false)}
                onSubmit={handleLeaveRequestSubmit}
                isLoading={false}
            />

            <HelpDeskModal
                isOpen={showHelpModal}
                onClose={() => setModal('showHelpModal', false)}
                onSubmit={handleHelpInquirySubmit}
                isLoading={false}
            />

            <RegularizationModal
                isOpen={showRegularizationModal}
                onClose={() => {
                    setModal('showRegularizationModal', false);
                    setAppState('regularizationPrefillData', null);
                }}
                prefillData={regularizationPrefillData}
                onSuccess={() => {
                    toast({
                        variant: "success",
                        title: "Regularization Request Submitted",
                        description: "Your attendance regularization request has been submitted."
                    });
                }}
            />

            <TaskReportModal
                isOpen={showTaskReportModal}
                onClose={() => setModal('showTaskReportModal', false)}
                onSubmit={handleTaskReportSubmit}
                onSkip={handleTaskReportSkip}
                isLoading={checkOutLoading ?? false}
                isOptional={taskReportSetting === 'optional'}
            />

            <WFHRequestModal
                key={String(showWFHModal)}
                isOpen={showWFHModal}
                onClose={handleWFHModalClose}
                onSubmit={handleWFHRequestSubmit}
                submitting={wfhRequestLoading ?? false}
                context={pendingWFHContext}
            />

            <NonWorkingDayWarningModal
                isOpen={showNonWorkingDayWarning}
                onClose={() => {
                    setModal('showNonWorkingDayWarning', false);
                    setAppState('nonWorkingDayWarningData', null);
                }}
                onConfirm={() => handleCheckIn(true)}
                warningData={nonWorkingDayWarningData}
            />

            <AbsentEmployeesModal
                isOpen={showAbsentEmployeesModal}
                onClose={() => setModal('showAbsentEmployeesModal', false)}
                absentEmployees={adminSummary?.absentEmployees || []}
            />

            <PresentEmployeesModal
                isOpen={showPresentEmployeesModal}
                onClose={() => setModal('showPresentEmployeesModal', false)}
                presentEmployees={adminSummary?.presentEmployees || []}
            />

            <ExpenseModal
                isOpen={showExpenseModal}
                onClose={() => setModal('showExpenseModal', false)}
                onSubmit={async (data) => {
                    try {
                        await createExpenseMutation.mutateAsync(data);
                        toast({
                            variant: "success",
                            title: "Expense Submitted",
                            description: "Your expense has been submitted for review."
                        });
                        setModal('showExpenseModal', false);
                    } catch (error: any) {
                        toast({
                            variant: "error",
                            title: "Submission Failed",
                            description: error.response?.data?.message || error.data?.message || "Something went wrong"
                        });
                    }
                }}
                isLoading={createExpenseMutation.isPending}
            />
        </div>
    );
}

export default HRMSDashboard;
