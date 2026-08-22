import React, { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { CheckCircle, XCircle, Clock, Users, UserCheck, UserX, ChevronLeft, ChevronRight, Heart, Edit3, X, Save, Calendar } from 'lucide-react';
import { formatTime, formatISTDate, getISTDateString, getMonthOptions, getAllDaysInMonth } from '@/utils/luxonUtils';
import { useAdminAttendanceRange, useEffectiveSettings, useUpdateAttendanceRecord } from '@/hooks/queries';
import type { UpdateAttendancePayload } from '@/hooks/queries/useAttendance';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Types
interface TimeState {
  hour: string;
  minute: string;
  period: 'AM' | 'PM';
}

interface TimeInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

interface AttendanceRecord {
  _id?: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  isWorkingDay?: boolean;
  holidayTitle?: string;
  date?: Date | string;
  employeeId?: string;
}

interface EmployeeInfo {
  _id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  department?: string;
}

interface EmployeeAttendanceRecord {
  employee: EmployeeInfo;
  employeeName: string;
  weekData: {
    [key: string]: AttendanceRecord;
  };
}

interface FormData {
  status: string;
  checkIn: string;
  checkOut: string;
}

interface EditAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: AttendanceRecord | null;
  employeeProfile: EmployeeInfo | null;
}

interface Stats {
  total: number;
  present: number;
  absent: number;
  leave: number;
  weekend: number;
  holiday: number;
}

interface DateRange {
  startDate: string;
  endDate: string;
  firstDay: Date;
  lastDay: Date;
}

interface BusinessHours {
  workStartTime: string;
  workEndTime: string;
  halfDayEndTime: string;
}

// 🚀 OPTIMIZED: Custom Time Input Component with AM/PM support (memoized)
const TimeInput = memo(({ value, onChange, className = '' }: TimeInputProps) => {
  const [timeState, setTimeState] = useState<TimeState>({
    hour: '',
    minute: '',
    period: 'AM'
  });

  // Convert datetime-local value to 12-hour format (IST)
  useEffect(() => {
    if (value) {
      const date = new Date(value);
      let hour = date.getHours();
      const minute = date.getMinutes();
      const period: 'AM' | 'PM' = hour >= 12 ? 'PM' : 'AM';

      if (hour > 12) hour -= 12;
      if (hour === 0) hour = 12;

      setTimeState({
        hour: hour.toString().padStart(2, '0'),
        minute: minute.toString().padStart(2, '0'),
        period
      });
    } else {
      setTimeState({ hour: '', minute: '', period: 'AM' });
    }
  }, [value]);

  const handleTimeChange = (field: keyof TimeState, newValue: string): void => {
    const newTimeState = { ...timeState, [field]: newValue };
    setTimeState(newTimeState);

    if (newTimeState.hour && newTimeState.minute) {
      // Convert back to datetime-local format
      let hour24 = parseInt(newTimeState.hour);
      if (newTimeState.period === 'AM' && hour24 === 12) hour24 = 0;
      if (newTimeState.period === 'PM' && hour24 !== 12) hour24 += 12;

      // Get the base date from the existing value to preserve the correct attendance date
      let baseDate: string;
      if (value) {
        baseDate = value.split('T')[0];
      } else {
        // If no existing value, we should not default to today's date - this should come from the record date
        console.warn('No base date available for time input');
        baseDate = getISTDateString();
      }

      const datetimeValue = `${baseDate}T${hour24.toString().padStart(2, '0')}:${newTimeState.minute}:00`;
      onChange(datetimeValue);
    } else if (!newTimeState.hour && !newTimeState.minute) {
      // Clear the value if both hour and minute are empty
      onChange('');
    }
  };

  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  return (
    <div className={`flex gap-2 ${className}`}>
      <select
        value={timeState.hour}
        onChange={(e) => handleTimeChange('hour', e.target.value)}
        className="flex-1 px-3 py-2 border border-border rounded-lg bg-white dark:bg-card text-foreground focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
      >
        <option value="">HH</option>
        {hours.map(hour => (
          <option key={hour} value={hour}>{hour}</option>
        ))}
      </select>
      <span className="flex items-center text-muted-foreground">:</span>
      <select
        value={timeState.minute}
        onChange={(e) => handleTimeChange('minute', e.target.value)}
        className="flex-1 px-3 py-2 border border-border rounded-lg bg-white dark:bg-card text-foreground focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
      >
        <option value="">MM</option>
        {minutes.map(minute => (
          <option key={minute} value={minute}>{minute}</option>
        ))}
      </select>
      <select
        value={timeState.period}
        onChange={(e) => handleTimeChange('period', e.target.value as 'AM' | 'PM')}
        className="px-3 py-2 border border-border rounded-lg bg-white dark:bg-card text-foreground focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
      {value && (
        <button
          type="button"
          onClick={() => {
            setTimeState({ hour: '', minute: '', period: 'AM' });
            onChange('');
          }}
          className="px-2 py-2 text-muted-foreground hover:text-foreground transition-colors"
          title="Clear time"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
});

TimeInput.displayName = 'TimeInput';

// 🚀 OPTIMIZED: Edit Attendance Modal Component (memoized)
const EditAttendanceModal = memo(({ isOpen, onClose, record, employeeProfile }: EditAttendanceModalProps) => {
  const [formData, setFormData] = useState<FormData>({
    status: '',
    checkIn: '',
    checkOut: ''
  });
  const [error, setError] = useState('');

  // Fetch effective settings using React Query
  const { data: settingsData } = useEffectiveSettings(
    employeeProfile?.department,
    { enabled: !!employeeProfile?.department && isOpen }
  );

  // Use mutation hook for updating attendance
  const updateAttendanceMutation = useUpdateAttendanceRecord();

  const businessHours = useMemo<BusinessHours>(() => ({
    workStartTime: settingsData?.attendance?.workStartTime || '09:00',
    workEndTime: settingsData?.attendance?.workEndTime || '18:00',
    halfDayEndTime: settingsData?.attendance?.halfDayEndTime || '13:00'
  }), [settingsData]);

  useEffect(() => {
    if (record && isOpen) {
      const formatTimeForInput = (date: string | Date | null, defaultTime?: string): string => {
        if (!date && !defaultTime) return '';

        // Use the record date to ensure we're working with the correct date
        const recordDate = new Date(record.date!);
        // Format as YYYY-MM-DD using local time components to avoid timezone issues
        const year = recordDate.getFullYear();
        const month = String(recordDate.getMonth() + 1).padStart(2, '0');
        const day = String(recordDate.getDate()).padStart(2, '0');
        const baseDate = `${year}-${month}-${day}`;

        if (date) {
          // Convert existing date to local time for display
          const existingDate = new Date(date);
          const hours = existingDate.getHours().toString().padStart(2, '0');
          const minutes = existingDate.getMinutes().toString().padStart(2, '0');
          return `${baseDate}T${hours}:${minutes}`;
        } else if (defaultTime) {
          return `${baseDate}T${defaultTime}`;
        }
        return '';
      };

      setFormData({
        status: record.status || 'present',
        checkIn: formatTimeForInput(record.checkIn, businessHours.workStartTime),
        checkOut: formatTimeForInput(record.checkOut, businessHours.workEndTime)
      });
      setError('');
    }
  }, [record, isOpen, businessHours]);

  const handleStatusChange = (status: string): void => {
    // Use the date directly without creating a new Date object to avoid timezone issues
    const recordDate = record?.date || new Date();
    // Format as YYYY-MM-DD using local time components to avoid timezone issues
    const dateObj = typeof recordDate === 'string' ? new Date(recordDate) : recordDate as Date;
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const baseDate = `${year}-${month}-${day}`;

    setFormData(prev => {
      const newData = { ...prev, status };

      // Only auto-fill times if they are currently empty or for specific status changes
      switch (status) {
        case 'present':
          if (!newData.checkIn) newData.checkIn = `${baseDate}T${businessHours.workStartTime}`;
          if (!newData.checkOut) newData.checkOut = `${baseDate}T${businessHours.workEndTime}`;
          break;
        case 'half-day':
          if (!newData.checkIn) newData.checkIn = `${baseDate}T${businessHours.workStartTime}`;
          // Always set checkout for half-day
          newData.checkOut = `${baseDate}T${businessHours.halfDayEndTime}`;
          break;
        case 'absent':
          newData.checkIn = '';
          newData.checkOut = '';
          break;
      }

      return newData;
    });
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError('');

    try {
      const updateData: UpdateAttendancePayload = {
        status: formData.status,
        checkIn: formData.checkIn ? new Date(formData.checkIn).toISOString() : null,
        checkOut: formData.checkOut ? new Date(formData.checkOut).toISOString() : null
      };

      // For non-absent status, ensure we have valid times
      if (formData.status !== 'absent') {
        if (!updateData.checkIn) {
          setError('Check-in time is required for non-absent status');
          return;
        }
        // For present status, if no checkout is provided, keep the existing one or set null
        if (formData.status === 'present' && !updateData.checkOut && record?.checkOut) {
          updateData.checkOut = record.checkOut;
        }
      }

      // For records that don't exist (absent days), include employee and date info
      if (!record?._id) {
        updateData.employeeId = employeeProfile?.employeeId;

        // Fix timezone issue for date field - send date as YYYY-MM-DD string
        if (record?.date) {
          const dateObj = typeof record.date === 'string' ? new Date(record.date) : record.date as Date;
          const year = dateObj.getFullYear();
          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
          const day = String(dateObj.getDate()).padStart(2, '0');
          updateData.date = `${year}-${month}-${day}`;
        }
      }

      const recordId = record?._id || 'new';
      await updateAttendanceMutation.mutateAsync({ recordId, updateData });

      // Mutation automatically invalidates queries - no manual refetch needed
      onClose();
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Failed to update attendance record');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md gap-0 bg-white p-0 dark:bg-card">
        <DialogHeader className="p-6 pr-14 border-b border-border text-left">
          <DialogTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-cyan-600" />
            Edit Attendance
          </DialogTitle>
          <DialogDescription className="sr-only">
            Edit the check-in and check-out times for this attendance record.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Date: {record ? formatISTDate(record.date!, { dateOnly: true }) : ''}
            </label>
            <label className="block text-sm font-medium text-foreground">
              Employee: {employeeProfile?.firstName} {employeeProfile?.lastName}
            </label>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-card text-foreground focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              required
            >
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="half-day">Half Day</option>
            </select>
          </div>

          {formData.status !== 'absent' && (
            <>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  Check In Time
                </label>
                <TimeInput
                  value={formData.checkIn}
                  onChange={(value) => setFormData(prev => ({ ...prev, checkIn: value }))}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  Check Out Time
                </label>
                <TimeInput
                  value={formData.checkOut}
                  onChange={(value) => setFormData(prev => ({ ...prev, checkOut: value }))}
                  className="w-full"
                />
              </div>
            </>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-border rounded-lg text-foreground hover:bg-muted dark:hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateAttendanceMutation.isPending}
              className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-cyan-400 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {updateAttendanceMutation.isPending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
});

EditAttendanceModal.displayName = 'EditAttendanceModal';

const AdminAttendanceTable = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [currentWindowIndex, setCurrentWindowIndex] = useState(0);
  const [stats, setStats] = useState<Stats>({ total: 0, present: 0, absent: 0, leave: 0, weekend: 0, holiday: 0 });
  const [allWorkingDays, setAllWorkingDays] = useState<Date[]>([]);
  const [workingDays, setWorkingDays] = useState<Date[]>([]);
  const [attendanceData, setAttendanceData] = useState<EmployeeAttendanceRecord[]>([]);
  const [monthlyAttendanceData, setMonthlyAttendanceData] = useState<EmployeeAttendanceRecord[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeInfo | null>(null);

  // Calculate date range for the selected month
  const dateRange = useMemo<DateRange>(() => {
    const firstDay = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
    const lastDay = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);
    return {
      startDate: getISTDateString(firstDay),
      endDate: getISTDateString(lastDay),
      firstDay,
      lastDay
    };
  }, [selectedMonth]);

  // Fetch attendance data using React Query
  const { data: attendanceResponse, isLoading, error, refetch } = useAdminAttendanceRange(
    dateRange.startDate,
    dateRange.endDate
  );

  // Fetch effective settings using React Query
  const { data: effectiveSettings } = useEffectiveSettings(undefined);

  // Transform backend employeeReports to frontend format
  const transformBackendData = useCallback((employeeReports: any[]): EmployeeAttendanceRecord[] => {
    if (!Array.isArray(employeeReports)) return [];

    return employeeReports.map(report => {
      // Transform records array to weekData object
      const weekData: { [key: string]: AttendanceRecord } = {};

      if (report.records && Array.isArray(report.records)) {
        report.records.forEach((record: any) => {
          if (record.date) {
            // Create date key in YYYY-MM-DD format
            const date = new Date(record.date);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const dateKey = `${year}-${month}-${day}`;

            // Keep backend status if present (attendance record takes priority)
            // Only override with flag-based status if no actual attendance record exists
            let finalStatus = record.status || 'absent';

            // Only override status for flag-based statuses if there's no actual check-in
            // Priority: Leave > Holiday > Weekend (matching backend logic)
            if (!record.checkIn) {
              if (record.flags?.isLeave || record.status === 'leave') {
                finalStatus = 'leave';
              } else if (record.flags?.isHoliday) {
                finalStatus = 'holiday';
              } else if (record.flags?.isWeekend) {
                finalStatus = 'weekend';
              }
            }
            // If there's a check-in, trust the backend status (present/half-day/etc.)

            // Transform to expected format
            weekData[dateKey] = {
              _id: record._id,
              checkIn: record.checkIn,
              checkOut: record.checkOut,
              status: finalStatus,
              isWorkingDay: !record.flags?.isWeekend && !record.flags?.isHoliday,
              holidayTitle: record.flags?.isHoliday ? (record.holidayTitle || 'Holiday') : undefined
            };
          }
        });
      }

      return {
        employee: {
          _id: report.employee._id,
          employeeId: report.employee.employeeId,
          firstName: report.employee.firstName,
          lastName: report.employee.lastName,
          department: report.employee.department
        },
        employeeName: `${report.employee.firstName} ${report.employee.lastName}`,
        weekData: weekData
      };
    });
  }, []);


  // Get the current 4-day window from all working days
  const getCurrentWindow = (): Date[] => {
    if (allWorkingDays.length === 0) return [];

    // Calculate the start index for the current window
    // We want to show the last 4 working days by default (index 0)
    const maxStartIndex = Math.max(0, allWorkingDays.length - 4);
    const startIndex = Math.max(0, maxStartIndex - currentWindowIndex);
    const endIndex = Math.min(startIndex + 4, allWorkingDays.length);

    return allWorkingDays.slice(startIndex, endIndex);
  };

  // Update stats for current window
  const updateStatsForWindow = (records: EmployeeAttendanceRecord[], windowDays: Date[]): void => {
    if (windowDays.length === 0 || records.length === 0) {
      setStats({ total: 0, present: 0, absent: 0, leave: 0, weekend: 0, holiday: 0 });
      return;
    }

    // Calculate unique employees for each status across all days in the window
    const employeeStatuses = new Set<string>();
    const presentEmployees = new Set<string>();
    const absentEmployees = new Set<string>();
    const leaveEmployees = new Set<string>();
    const weekendEmployees = new Set<string>();
    const holidayEmployees = new Set<string>();

    records.forEach(record => {
      const employeeId = record.employee?._id || record.employee?.employeeId;
      if (!employeeId) return;

      let hasPresence = false;
      let hasAbsence = false;
      let hasLeave = false;
      let hasWeekend = false;
      let hasHoliday = false;

      // Check this employee's status across all days in the window
      windowDays.forEach(day => {
        const attendance = getAttendanceForDay(record, day);

        if (attendance.status === 'weekend') {
          hasWeekend = true;
        } else if (attendance.status === 'holiday') {
          hasHoliday = true;
        } else if (attendance.status === 'leave') {
          hasLeave = true;
        } else if (attendance.checkIn || attendance.checkOut) {
          hasPresence = true;
        } else {
          hasAbsence = true;
        }
      });

      // Prioritize status: present > leave > absent > holiday > weekend
      if (hasPresence) {
        presentEmployees.add(employeeId);
      } else if (hasLeave) {
        leaveEmployees.add(employeeId);
      } else if (hasAbsence) {
        absentEmployees.add(employeeId);
      } else if (hasHoliday) {
        holidayEmployees.add(employeeId);
      } else if (hasWeekend) {
        weekendEmployees.add(employeeId);
      }

      employeeStatuses.add(employeeId);
    });

    const total = employeeStatuses.size;
    const present = presentEmployees.size;
    const absent = absentEmployees.size;
    const leave = leaveEmployees.size;
    const weekend = weekendEmployees.size;
    const holiday = holidayEmployees.size;

    setStats({ total, present, absent, leave, weekend, holiday });
  };

  const handleEditClick = (record: EmployeeAttendanceRecord, day: Date): void => {
    const attendanceForDay = getAttendanceForDay(record, day);

    // Create a proper date object for the modal - this matches employee directory approach
    const modalRecord: AttendanceRecord = {
      ...attendanceForDay,
      date: day, // Pass the actual Date object
      employeeId: record.employee?.employeeId,
      _id: attendanceForDay._id || undefined
    };


    setSelectedRecord(modalRecord);
    setSelectedEmployee(record.employee);
    setIsModalOpen(true);
  };

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedRecord(null);
    setSelectedEmployee(null);
  }, []);

  // Process data when attendanceResponse changes
  useEffect(() => {
    if (attendanceResponse?.employeeReports) {
      const transformedData = transformBackendData(attendanceResponse.employeeReports);
      setMonthlyAttendanceData(transformedData);
      setAttendanceData(transformedData);

      // Generate all calendar days for the month
      const allDays = getAllDaysInMonth(dateRange.firstDay).map(d => d.toJSDate());
      setAllWorkingDays(allDays);

      // Always prioritize showing today if it's in the current month
      const today = new Date();
      const isCurrentMonth = selectedMonth.getFullYear() === today.getFullYear() &&
        selectedMonth.getMonth() === today.getMonth();

      let initialWindow: Date[];
      let initialWindowIndex = 0;

      if (isCurrentMonth && allDays.length > 0) {
        // Find today in all days
        const todayIndex = allDays.findIndex(day =>
          day.toDateString() === today.toDateString()
        );

        if (todayIndex !== -1) {
          // Include today in the window - start with today and show 3 previous days
          const startIndex = Math.max(0, todayIndex - 3);
          const endIndex = Math.min(todayIndex + 1, allDays.length);
          initialWindow = allDays.slice(startIndex, endIndex);

          // Pad with next days if we don't have 4 days
          while (initialWindow.length < 4 && endIndex < allDays.length) {
            initialWindow.push(allDays[endIndex + initialWindow.length - (endIndex - startIndex)]);
          }

          initialWindowIndex = Math.max(0, allDays.length - 4 - startIndex);
        } else {
          // Today not found, show last 4 days
          initialWindow = allDays.slice(-4);
          initialWindowIndex = 0;
        }
      } else {
        // For past months, show last 4 days
        initialWindow = allDays.slice(-4);
        initialWindowIndex = 0;
      }

      setCurrentWindowIndex(initialWindowIndex);
      setWorkingDays(initialWindow);
      updateStatsForWindow(transformedData, initialWindow);
    }
  }, [attendanceResponse, selectedMonth, transformBackendData, dateRange]);

  // Navigate the sliding window
  const navigateWindow = (direction: number): void => {
    const newWindowIndex = currentWindowIndex + direction;
    const maxWindowIndex = Math.max(0, allWorkingDays.length - 4);

    // Don't allow going beyond available data
    if (newWindowIndex < 0 || newWindowIndex > maxWindowIndex) {
      return;
    }

    setCurrentWindowIndex(newWindowIndex);
  };

  // Update window when currentWindowIndex changes
  useEffect(() => {
    if (allWorkingDays.length > 0) {
      const newWindow = getCurrentWindow();
      setWorkingDays(newWindow);
      updateStatsForWindow(monthlyAttendanceData, newWindow);
    }
  }, [currentWindowIndex, allWorkingDays, monthlyAttendanceData]);

  // Handle month change
  const handleMonthChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    const [year, month] = event.target.value.split('-');
    const newDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    setSelectedMonth(newDate);
    setCurrentWindowIndex(0); // Reset to default position
  };

  const getAttendanceIcon = (attendance: AttendanceRecord): React.ReactNode => {
    if (attendance.status === 'weekend') {
      return <XCircle className="w-4 h-4 text-muted-foreground" />;
    }
    if (attendance.status === 'holiday') {
      return <Calendar className="w-4 h-4 text-orange-500" />;
    }
    if (attendance.status === 'leave') {
      return <Heart className="w-4 h-4 text-purple-500" />;
    }
    if (attendance.status === 'absent' || (!attendance.checkIn && !attendance.checkOut)) {
      return <XCircle className="w-4 h-4 text-red-500" />;
    }
    if (attendance.checkIn && attendance.checkOut) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    if (attendance.checkIn && !attendance.checkOut) {
      return <Clock className="w-4 h-4 text-yellow-500" />;
    }
    return <XCircle className="w-4 h-4 text-muted-foreground" />;
  };

  const getAttendanceBadgeClass = (attendance: AttendanceRecord): string => {
    const baseClasses = "w-full max-w-[85px] sm:max-w-[95px] px-2 sm:px-3 py-2 sm:py-3 rounded-lg text-xs sm:text-sm font-medium flex flex-col items-center justify-center gap-1 sm:gap-1.5 min-h-[75px] sm:min-h-[85px] cursor-pointer hover:opacity-80 transition-opacity";

    if (attendance.status === 'weekend') {
      return `${baseClasses} bg-muted text-muted-foreground`;
    }
    if (attendance.status === 'holiday') {
      return `${baseClasses} bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300`;
    }
    if (attendance.status === 'leave') {
      return `${baseClasses} bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300`;
    }
    if (attendance.status === 'absent' || (!attendance.checkIn && !attendance.checkOut)) {
      return `${baseClasses} bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300`;
    }
    if (attendance.checkIn && attendance.checkOut) {
      return `${baseClasses} bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300`;
    }
    if (attendance.checkIn && !attendance.checkOut) {
      return `${baseClasses} bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300`;
    }
    return `${baseClasses} bg-muted text-foreground`;
  };

  const formatDayDate = (date: Date): { day: string; dateStr: string; isWeekend: boolean } => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const dayOfWeek = date.getDay();
    const day = dayNames[dayOfWeek];
    const dateNum = date.getDate().toString().padStart(2, '0');
    const month = monthNames[date.getMonth()];
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday

    return {
      day,
      dateStr: `${dateNum} ${month}`,
      isWeekend
    };
  };

  const getAttendanceForDay = (record: EmployeeAttendanceRecord, date: Date): AttendanceRecord => {
    // Format date as YYYY-MM-DD using local time
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;

    // Check if we have attendance data for this day
    const existingData = record.weekData?.[dateKey];
    if (existingData) {
      return existingData;
    }

    // If no attendance record exists, check if it's a weekend or holiday using settings
    const dayOfWeek = date.getDay();

    if (effectiveSettings?.attendance) {
      const workingDays = effectiveSettings.attendance.workingDays || [];
      const saturdayHolidays = effectiveSettings.attendance.saturdayHolidays || [];

      // Check if this day of week is in working days
      if (!workingDays.includes(dayOfWeek)) {
        return { checkIn: null, checkOut: null, status: 'weekend' };
      }
      // Special handling for Saturday - check if it's a holiday Saturday
      else if (dayOfWeek === 6 && saturdayHolidays && saturdayHolidays.length > 0) {
        const saturdayWeek = getSaturdayWeekOfMonth(date);
        if (saturdayHolidays.includes(saturdayWeek)) {
          return { checkIn: null, checkOut: null, status: 'weekend' };
        }
      }
    } else {
      // Fallback to hardcoded logic if settings not loaded
      // Sunday is always a weekend
      if (dayOfWeek === 0) {
        return { checkIn: null, checkOut: null, status: 'weekend' };
      }

      // Saturday logic - check if it's 2nd Saturday (company holiday)
      if (dayOfWeek === 6) {
        const dateNum = date.getDate();
        const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        const firstSaturday = 7 - firstDayOfMonth.getDay() || 7;
        const secondSaturday = firstSaturday + 7;

        // If this Saturday is the 2nd Saturday, it's a weekend
        if (dateNum >= secondSaturday && dateNum < secondSaturday + 7) {
          return { checkIn: null, checkOut: null, status: 'weekend' };
        }
      }
    }

    // Default to absent for working days with no record
    return { checkIn: null, checkOut: null, status: 'absent' };
  };

  // Helper function to determine which Saturday of the month a given date is
  const getSaturdayWeekOfMonth = (date: Date): number => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const dateNum = date.getDate();

    // Find the first Saturday of the month
    const firstDayOfMonth = new Date(year, month, 1);
    const firstDayWeekday = firstDayOfMonth.getDay();

    // Calculate first Saturday date (0=Sunday, 6=Saturday)
    const firstSaturday = firstDayWeekday === 6 ? 1 : 7 - firstDayWeekday;

    // Calculate which Saturday this date is
    const saturdayWeek = Math.ceil((dateNum - firstSaturday + 1) / 7);

    return Math.max(1, Math.min(4, saturdayWeek)); // Ensure it's between 1-4
  };

  const getAttendanceStatusText = (attendance: AttendanceRecord): string | null => {
    if (attendance.status === 'weekend') return 'Weekend';
    if (attendance.status === 'holiday') return attendance.holidayTitle || 'Holiday';
    if (attendance.status === 'leave') return 'Leave';
    if (attendance.status === 'absent' || (!attendance.checkIn && !attendance.checkOut)) return 'Absent';
    if (attendance.checkIn && !attendance.checkOut) return null; // No text for check-in only
    return null; // No text for present status
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Attendance Overview
        </h3>
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-muted rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Attendance Overview
        </h3>
        <div className="text-center text-red-500 py-4">
          <p>{error.message || 'Failed to fetch attendance data'}</p>
          <button
            onClick={() => refetch()}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl shadow-lg border border-border 50 dark:border-border 50 p-4 sm:p-6 hover:shadow-xl transition-shadow duration-300">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <div>
          <h3 className="text-xl font-bold text-foreground mb-1">
            Attendance Overview
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm">
          <div className="flex items-center gap-1 bg-muted/50 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg">
            <Users className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
            <span className="text-muted-foreground font-medium text-xs sm:text-sm">{stats.total} total</span>
          </div>
          <div className="flex items-center gap-1 bg-green-50 dark:bg-green-900/20 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg">
            <UserCheck className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />
            <span className="text-green-600 dark:text-green-400 font-medium text-xs sm:text-sm">{stats.present} present</span>
          </div>
          <div className="flex items-center gap-1 bg-red-50 dark:bg-red-900/20 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg">
            <UserX className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" />
            <span className="text-red-600 dark:text-red-400 font-medium text-xs sm:text-sm">{stats.absent} absent</span>
          </div>
          {stats.leave > 0 && (
            <div className="flex items-center gap-1 bg-purple-50 dark:bg-purple-900/20 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg">
              <Heart className="w-3 h-3 sm:w-4 sm:h-4 text-purple-500" />
              <span className="text-purple-600 dark:text-purple-400 font-medium text-xs sm:text-sm">{stats.leave} leave</span>
            </div>
          )}
          {stats.holiday > 0 && (
            <div className="flex items-center gap-1 bg-orange-50 dark:bg-orange-900/20 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg">
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-orange-500" />
              <span className="text-orange-600 dark:text-orange-400 font-medium text-xs sm:text-sm">{stats.holiday} holiday</span>
            </div>
          )}
          <div className="flex items-center gap-2 ml-2">
            <button
              onClick={() => navigateWindow(1)}
              className="p-1.5 rounded-lg bg-muted hover:bg-muted transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Previous 4 days"
              disabled={currentWindowIndex >= Math.max(0, allWorkingDays.length - 4)}
            >
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            </button>
            <select
              value={`${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}`}
              onChange={handleMonthChange}
              className="text-xs bg-muted text-foreground border border-border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 w-20"
            >
              {getMonthOptions(12).map(option => (
                <option key={option.value} value={option.value}>
                  {option.display}
                </option>
              ))}
            </select>
            <button
              onClick={() => navigateWindow(-1)}
              className="p-1.5 rounded-lg bg-muted hover:bg-muted transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Next 4 days"
              disabled={currentWindowIndex <= 0}
            >
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>

      {/* Table Layout */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <div className="max-h-[500px] overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr className="bg-muted border-b border-border dark:border-border">
                <th className="text-left py-2 sm:py-4 px-2 sm:px-4 font-semibold text-foreground text-xs sm:text-sm">Employee</th>
                {workingDays.map((day, index) => {
                  const { day: dayName, dateStr, isWeekend } = formatDayDate(day);
                  return (
                    <th key={index} className={`text-center py-2 sm:py-4 px-1 sm:px-2 font-semibold text-xs sm:text-sm min-w-[75px] sm:min-w-[95px] ${isWeekend
                      ? 'text-muted-foreground'
                      : 'text-foreground'
                      }`}>
                      <div className="flex flex-col items-center">
                        <span className={isWeekend ? 'text-muted-foreground' : ''}>{dayName}</span>
                        <span className={`text-xs ${isWeekend
                          ? 'text-muted-foreground'
                          : 'text-muted-foreground'
                          }`}>{dateStr}</span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
              {attendanceData.length > 0 ? attendanceData.map((record, index) => (
                <tr
                  key={record.employee._id || index}
                  className="hover:bg-muted dark:hover:bg-muted 30 transition-colors bg-card"
                >
                  <td className="py-2 sm:py-4 px-2 sm:px-4">
                    <div>
                      <div className="font-medium text-sm sm:text-base text-foreground leading-tight">
                        {record.employeeName || 'Unknown Employee'}
                      </div>
                      {record.employee?.employeeId && (
                        <div className="text-xs sm:text-sm text-muted-foreground leading-tight mt-0.5">
                          ID: {record.employee.employeeId}
                        </div>
                      )}
                    </div>
                  </td>
                  {workingDays.map((day, dayIndex) => {
                    const dayAttendance = getAttendanceForDay(record, day);
                    return (
                      <td key={dayIndex} className="py-2 sm:py-4 px-1 sm:px-2">
                        <div
                          className="flex justify-center cursor-pointer hover:bg-muted dark:hover:bg-muted rounded-lg p-1 sm:p-2"
                          onClick={() => handleEditClick(record, day)}
                        >
                          <div className={getAttendanceBadgeClass(dayAttendance)}>
                            {getAttendanceIcon(dayAttendance)}
                            {getAttendanceStatusText(dayAttendance) && (
                              <span className="text-xs sm:text-xs font-medium text-center leading-tight">{getAttendanceStatusText(dayAttendance)}</span>
                            )}
                            {dayAttendance.checkIn && (
                              <div className="text-xs sm:text-xs font-mono opacity-80 text-center leading-tight">
                                <div className="truncate">{formatTime(dayAttendance.checkIn)}</div>
                                {dayAttendance.checkOut && (
                                  <div className="truncate">{formatTime(dayAttendance.checkOut)}</div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              )) : (
                <tr>
                  <td colSpan={workingDays.length + 1} className="py-12 text-center text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-lg font-medium">No employees found</p>
                    <p className="text-sm">Check your employee database</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedRecord && selectedEmployee && (
        <EditAttendanceModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          record={selectedRecord}
          employeeProfile={selectedEmployee}
        />
      )}
    </div>
  );
};

export default AdminAttendanceTable;
