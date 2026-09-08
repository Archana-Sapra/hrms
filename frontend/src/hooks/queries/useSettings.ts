import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios';
import { queryKeys } from '@/lib/queryKeys';
import { API_ENDPOINTS, buildEndpointWithQuery } from '@/lib/apiEndpoints';
import type { ApiResponse, GlobalSettings, DepartmentSettings, EffectiveSettings, DepartmentStats, AvailableEmployeesData } from '@/types';

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get global settings
 */
export const useGlobalSettings = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: queryKeys.settings.global(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<ApiResponse<GlobalSettings>>(API_ENDPOINTS.SETTINGS.GLOBAL);
      return data.data;
    },
    enabled: options?.enabled ?? true,
  });
};

/**
 * Get department settings
 */
export const useDepartmentSettings = (department: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: queryKeys.settings.department(department),
    queryFn: async () => {
      const { data } = await axiosInstance.get<ApiResponse<DepartmentSettings>>(
        API_ENDPOINTS.SETTINGS.DEPARTMENT(department)
      );
      return data.data;
    },
    enabled: (options?.enabled ?? true) && !!department,
  });
};

/**
 * Get effective settings (global + department overrides)
 */
export const useEffectiveSettings = (department?: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: queryKeys.settings.effective(department),
    queryFn: async () => {
      const params = department ? { department } : {};
      const endpoint = buildEndpointWithQuery(API_ENDPOINTS.SETTINGS.EFFECTIVE, params);
      const { data } = await axiosInstance.get<ApiResponse<EffectiveSettings>>(endpoint);
      return data.data;
    },
    enabled: options?.enabled ?? true,
  });
};

/**
 * Get list of departments
 */
export const useDepartments = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: queryKeys.settings.departments(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<ApiResponse<{ departments: string[] }>>(API_ENDPOINTS.SETTINGS.DEPARTMENTS);
      return data.data?.departments || [];
    },
    enabled: options?.enabled ?? true,
  });
};

/**
 * Get department statistics
 */
export const useDepartmentStats = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: queryKeys.settings.departmentStats(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<ApiResponse<{ departments: DepartmentStats[] }>>(API_ENDPOINTS.SETTINGS.DEPARTMENT_STATS);
      return data.data?.departments || [];
    },
    enabled: options?.enabled ?? true,
  });
};

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Update global settings
 */
export const useUpdateGlobalSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settingsData: Partial<GlobalSettings>) => {
      const { data } = await axiosInstance.put<ApiResponse<GlobalSettings>>(
        API_ENDPOINTS.SETTINGS.GLOBAL,
        settingsData
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.all() });
    },
  });
};

/**
 * Update department settings
 */
export const useUpdateDepartmentSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ departmentName, settings }: { departmentName: string; settings: Partial<DepartmentSettings> }) => {
      const { data } = await axiosInstance.put<ApiResponse<DepartmentSettings>>(
        API_ENDPOINTS.SETTINGS.DEPARTMENT(departmentName),
        settings
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.all() });
    },
  });
};

/**
 * Add new department
 */
export const useAddDepartment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (departmentData: { name: string; description?: string }) => {
      const { data } = await axiosInstance.post<ApiResponse>(API_ENDPOINTS.SETTINGS.ADD_DEPARTMENT, departmentData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.departments() });
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.departmentStats() });
    },
  });
};

/**
 * Rename department
 */
export const useRenameDepartment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ oldName, newName }: { oldName: string; newName: string }) => {
      const { data } = await axiosInstance.put<ApiResponse>(
        API_ENDPOINTS.SETTINGS.RENAME_DEPARTMENT(oldName),
        { newName }
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all() });
    },
  });
};

/**
 * Delete department
 */
export interface DeleteDepartmentResult {
  departmentName: string;
  employeesUpdated: number;
  settingsDeleted: number;
  affectedEmployees: number;
}

export const useDeleteDepartment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      const { data } = await axiosInstance.delete<ApiResponse<DeleteDepartmentResult>>(
        API_ENDPOINTS.SETTINGS.DELETE_DEPARTMENT(name)
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.all() });
    },
  });
};

/**
 * Get available employees for a department
 */
export const useAvailableEmployees = (departmentName?: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: [...queryKeys.settings.departments(), 'employees', departmentName],
    queryFn: async () => {
      if (!departmentName) return null;
      const { data } = await axiosInstance.get<ApiResponse<AvailableEmployeesData>>(
        API_ENDPOINTS.SETTINGS.DEPARTMENT_EMPLOYEES(departmentName)
      );
      return data.data ?? null;
    },
    enabled: options?.enabled !== undefined ? options.enabled : !!departmentName,
  });
};

/**
 * Assign employee to department
 */
export const useAssignEmployeeToDepartment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ departmentName, employeeId }: { departmentName: string; employeeId: string }) => {
      const { data } = await axiosInstance.post<ApiResponse>(
        API_ENDPOINTS.SETTINGS.DEPARTMENT_EMPLOYEES(departmentName),
        { employeeId }
      );
      return data;
    },
    onSuccess: () => {
      // Invalidate department queries and employee queries. Stats carry the
      // per-department employee lists, so they go stale on assignment too.
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.departments() });
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.departmentStats() });
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all() });
    },
  });
};

/**
 * Reschedule the daily HR attendance report cron job.
 * Call after saving settings that change the report's enabled state or send time.
 */
export const useRescheduleHrReport = () => {
  return useMutation({
    mutationFn: async () => {
      const { data } = await axiosInstance.post<ApiResponse>(
        API_ENDPOINTS.SETTINGS.RESCHEDULE_HR_REPORT
      );
      return data;
    },
  });
};

/**
 * Send a test daily HR attendance report to the configured HR emails.
 */
export const useTestHrReport = () => {
  return useMutation({
    mutationFn: async () => {
      const { data } = await axiosInstance.post<ApiResponse>(
        API_ENDPOINTS.SETTINGS.TEST_HR_REPORT
      );
      return data;
    },
  });
};

/**
 * Immediately delete regularization requests older than retentionMonths,
 * independent of whether the recurring auto-delete schedule is enabled.
 */
export const useRunRegularizationCleanup = () => {
  return useMutation({
    mutationFn: async (retentionMonths: 1 | 2 | 3 | 6 | 12) => {
      const { data } = await axiosInstance.post<ApiResponse<{ deletedCount: number }>>(
        API_ENDPOINTS.SETTINGS.RUN_REGULARIZATION_CLEANUP,
        { retentionMonths }
      );
      return data.data;
    },
  });
};
