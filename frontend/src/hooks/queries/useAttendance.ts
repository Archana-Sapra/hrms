import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios';
import { queryKeys } from '@/lib/queryKeys';
import { API_ENDPOINTS, buildEndpointWithQuery } from '@/lib/apiEndpoints';
import type { ApiResponse, AttendanceRecord, AttendanceQueryParams, Location, AttendanceRangeData } from '@/types';

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get attendance records (Admin/HR)
 */
export const useAttendanceRecords = (params?: AttendanceQueryParams) => {
  return useQuery({
    queryKey: queryKeys.attendance.records(params),
    queryFn: async () => {
      // Backend returns { success, data: { records, pagination } } via formatResponse
      const endpoint = buildEndpointWithQuery(API_ENDPOINTS.ATTENDANCE.GET_RECORDS, (params || {}) as any);
      const { data } = await axiosInstance.get<ApiResponse<{ records: AttendanceRecord[] }>>(endpoint);
      return data.data?.records || [];
    },
  });
};

/**
 * Get my attendance records (Employee)
 */
export const useMyAttendance = (params?: AttendanceQueryParams, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: queryKeys.attendance.myRecords(params),
    queryFn: async () => {
      // Backend returns { success, data: { records, pagination } } via formatResponse
      const endpoint = buildEndpointWithQuery(API_ENDPOINTS.ATTENDANCE.MY_RECORDS, (params || {}) as any);
      const { data } = await axiosInstance.get<ApiResponse<{ records: AttendanceRecord[] }>>(endpoint);
      return data.data?.records || [];
    },
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Get today's attendance for all employees including absents (Admin/HR)
 */
export const useTodayAttendanceWithAbsents = () => {
  return useQuery({
    queryKey: queryKeys.attendance.todayWithAbsents(),
    queryFn: async () => {
      // Backend returns { success, data: { records, statistics, total, date } } via formatResponse
      const { data } = await axiosInstance.get<ApiResponse<{ records: AttendanceRecord[] }>>(
        API_ENDPOINTS.ATTENDANCE.TODAY_WITH_ABSENTS
      );
      return data.data?.records || [];
    },
    // Refetch more frequently for today's data
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};

/**
 * Get admin attendance range (optimized for AdminAttendanceTable)
 */
export const useAdminAttendanceRange = (startDate: string, endDate: string, options?: AttendanceQueryParams) => {
  return useQuery({
    queryKey: queryKeys.attendance.adminRange(startDate, endDate, options),
    queryFn: async () => {
      const params = { startDate, endDate, ...options };
      const endpoint = buildEndpointWithQuery(API_ENDPOINTS.ATTENDANCE.ADMIN_RANGE, params as any);
      const { data } = await axiosInstance.get<ApiResponse<AttendanceRangeData>>(endpoint);
      return data.data;
    },
    enabled: !!startDate && !!endDate,
  });
};

/**
 * Get employee attendance with absent days included
 * Returns the full report data for single employee view (includes employee info, records, statistics)
 */
export const useEmployeeAttendanceWithAbsents = (
  params?: AttendanceQueryParams,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: queryKeys.attendance.employeeWithAbsents(params),
    queryFn: async () => {
      // Backend returns { success, data: { employee, records, statistics, ... } } via formatResponse
      const endpoint = buildEndpointWithQuery(API_ENDPOINTS.ATTENDANCE.EMPLOYEE_WITH_ABSENTS, (params || {}) as any);
      const { data } = await axiosInstance.get<ApiResponse<any>>(endpoint);
      // Return full response structure for components that need employee info
      return {
        success: data.success,
        data: data.data
      };
    },
    enabled: options?.enabled ?? true,
  });
};

/**
 * Get missing checkouts (for reminder notifications)
 */
export const useMissingCheckouts = () => {
  return useQuery({
    queryKey: queryKeys.attendance.missingCheckouts(),
    queryFn: async () => {
      // Backend returns { success, data: { missingCheckouts, total } } via formatResponse
      const { data } = await axiosInstance.get<ApiResponse<{ missingCheckouts: AttendanceRecord[] }>>(
        API_ENDPOINTS.ATTENDANCE.GET_MISSING_CHECKOUTS
      );
      return data.data?.missingCheckouts || [];
    },
  });
};

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Check-in
 * Records employee check-in with optional location data
 */
export const useCheckIn = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (locationData?: Location) => {
      const { data } = await axiosInstance.post<ApiResponse<AttendanceRecord>>(
        API_ENDPOINTS.ATTENDANCE.CHECK_IN,
        locationData || {},
        {
          // Retry check-in up to 3 times
          timeout: 10000,
        }
      );
      return data.data;
    },
    // Optimistic update for instant UI feedback
    onMutate: async (locationData) => {
      const today = new Date().toISOString().slice(0, 10);
      const myRecordsKey = queryKeys.attendance.myRecords({ startDate: today, endDate: today });

      // Cancel outgoing refetches to avoid race conditions
      await queryClient.cancelQueries({ queryKey: myRecordsKey });

      // Snapshot previous value for rollback
      const previousAttendance = queryClient.getQueryData(myRecordsKey);

      // Optimistically update cache
      queryClient.setQueryData(myRecordsKey, (old: AttendanceRecord[] = []) => [
        {
          _id: 'optimistic-' + Date.now(),
          userId: 'current-user',
          employeeId: 'current-employee',
          date: today,
          checkIn: new Date().toISOString(),
          status: 'present',
          location: locationData ? { checkIn: locationData } : undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as AttendanceRecord,
        ...old,
      ]);

      return { previousAttendance, myRecordsKey };
    },
    // Rollback on error
    onError: (_err, _variables, context) => {
      if (context?.previousAttendance) {
        queryClient.setQueryData(context.myRecordsKey, context.previousAttendance);
      }
    },
    // Refetch to ensure consistency
    onSettled: () => {
      // Invalidate only attendance-related queries
      queryClient.invalidateQueries({
        predicate: (query) => {
          const [resource] = query.queryKey;
          return resource === 'attendance';
        },
      });

      // Invalidate dashboard queries
      queryClient.invalidateQueries({
        predicate: (query) => {
          const [resource] = query.queryKey;
          return resource === 'dashboard';
        },
      });
    },
  });
};

/**
 * Check-out
 * Records employee check-out with tasks and optional location
 */
export const useCheckOut = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      tasks?: string[];
      latitude?: number;
      longitude?: number;
      accuracy?: number;
      capturedAt?: string;
    }) => {
      const body: {
        tasks: string[];
        latitude?: number;
        longitude?: number;
        accuracy?: number;
        capturedAt?: string;
      } = {
        tasks: payload.tasks || [],
      };

      // Add location data if provided
      if (payload.latitude !== undefined) body.latitude = payload.latitude;
      if (payload.longitude !== undefined) body.longitude = payload.longitude;
      if (payload.accuracy !== undefined) body.accuracy = payload.accuracy;
      if (payload.capturedAt !== undefined) body.capturedAt = payload.capturedAt;

      const { data } = await axiosInstance.post<ApiResponse<AttendanceRecord>>(
        API_ENDPOINTS.ATTENDANCE.CHECK_OUT,
        body
      );
      return data.data;
    },
    onSuccess: () => {
      // Invalidate only attendance-related queries
      queryClient.invalidateQueries({
        predicate: (query) => {
          const [resource] = query.queryKey;
          return resource === 'attendance';
        },
      });

      // Invalidate dashboard and task reports
      queryClient.invalidateQueries({
        predicate: (query) => {
          const [resource] = query.queryKey;
          return resource === 'dashboard' || resource === 'task-reports';
        },
      });
    },
  });
};

/**
 * Payload the update endpoint actually accepts, which is wider than
 * `Partial<AttendanceRecord>`:
 *  - `checkIn` / `checkOut` may be `null` to clear a time (marking a day absent)
 *  - `status` may carry values the read model derives rather than stores
 *  - `employeeId` + `date` identify a day that has no stored record yet, which
 *    is how an absent day is created via `recordId: 'new'`
 * Typing it honestly here removes the casts every call site otherwise needs.
 */
export interface UpdateAttendancePayload extends Omit<Partial<AttendanceRecord>, 'checkIn' | 'checkOut' | 'status'> {
  status?: string;
  checkIn?: string | null;
  checkOut?: string | null;
}

/**
 * Update attendance record (HR/Admin only)
 */
export const useUpdateAttendanceRecord = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ recordId, updateData }: { recordId: string; updateData: UpdateAttendancePayload }) => {
      const { data } = await axiosInstance.put<ApiResponse<AttendanceRecord>>(
        API_ENDPOINTS.ATTENDANCE.UPDATE_RECORD(recordId),
        updateData
      );
      return data.data;
    },
    onSuccess: () => {
      // Invalidate all attendance queries
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.all() });
    },
  });
};
