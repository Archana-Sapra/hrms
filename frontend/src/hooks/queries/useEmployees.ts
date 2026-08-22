import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios';
import { queryKeys } from '@/lib/queryKeys';
import { API_ENDPOINTS, buildEndpointWithQuery } from '@/lib/apiEndpoints';
import type { ApiResponse, Employee, CreateEmployeeDto, UpdateEmployeeDto, EmployeeQueryParams } from '@/types';

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all employees with optional filtering
 */
export const useEmployees = (params?: EmployeeQueryParams) => {
  return useQuery({
    queryKey: queryKeys.employees.list(params),
    queryFn: async () => {
      const endpoint = buildEndpointWithQuery(API_ENDPOINTS.EMPLOYEES.GET_ALL, params || {});
      const { data } = await axiosInstance.get<ApiResponse<{ employees: Employee[] }>>(endpoint);
      return data.data?.employees || [];
    },
    // Active and inactive are separate query keys, so switching tabs would
    // otherwise render an empty list until the new fetch resolved.
    placeholderData: keepPreviousData,
  });
};

/**
 * Get single employee by ID
 */
export const useEmployee = (id: string) => {
  return useQuery({
    queryKey: queryKeys.employees.detail(id),
    queryFn: async () => {
      const { data } = await axiosInstance.get<ApiResponse<Employee>>(API_ENDPOINTS.EMPLOYEES.GET_BY_ID(id));
      return data.data;
    },
    enabled: !!id,
  });
};

/**
 * Get employees without salary structure (HR/Admin)
 */
export const useEmployeesWithoutStructure = () => {
  return useQuery({
    queryKey: queryKeys.employees.withoutStructure(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<ApiResponse<Employee[]>>(
        API_ENDPOINTS.SALARY_STRUCTURES.EMPLOYEES_WITHOUT_STRUCTURE
      );
      return data.data || [];
    },
  });
};

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create new employee
 */
export const useCreateEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (employeeData: CreateEmployeeDto) => {
      const { data } = await axiosInstance.post<ApiResponse<Employee>>(
        API_ENDPOINTS.EMPLOYEES.CREATE,
        employeeData
      );
      return data.data;
    },
    onSuccess: (newEmployee) => {
      // Only invalidate list queries (not detail queries)
      queryClient.invalidateQueries({
        predicate: (query) => {
          const [resource, action] = query.queryKey;
          return resource === 'employees' && action === 'list';
        },
      });

      // Optionally set new employee in cache
      if (newEmployee) {
        queryClient.setQueryData(queryKeys.employees.detail(newEmployee._id), newEmployee);
      }

      // Invalidate users list (for linking)
      queryClient.invalidateQueries({ queryKey: queryKeys.users.missingEmployees() });
    },
  });
};

/**
 * Update employee
 */
export const useUpdateEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updateData }: UpdateEmployeeDto & { id: string }) => {
      const { data } = await axiosInstance.put<ApiResponse<Employee>>(
        API_ENDPOINTS.EMPLOYEES.UPDATE(id),
        updateData
      );
      return data.data;
    },
    onSuccess: (updatedEmployee) => {
      // Invalidate employee lists
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all() });

      // Update specific employee in cache
      if (updatedEmployee) {
        queryClient.setQueryData(queryKeys.employees.detail(updatedEmployee._id), updatedEmployee);
      }
    },
  });
};

/**
 * Delete employee
 */
export const useDeleteEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (employeeId: string) => {
      const { data } = await axiosInstance.delete<ApiResponse>(API_ENDPOINTS.EMPLOYEES.DELETE(employeeId));
      return data;
    },
    onSuccess: (_data, employeeId) => {
      // Only invalidate list queries
      queryClient.invalidateQueries({
        predicate: (query) => {
          const [resource, action] = query.queryKey;
          return resource === 'employees' && action === 'list';
        },
      });

      // Remove from cache
      queryClient.removeQueries({ queryKey: queryKeys.employees.detail(employeeId) });

      // Invalidate related data
      queryClient.invalidateQueries({ queryKey: queryKeys.salaryStructures.all() });
    },
  });
};

/**
 * Toggle employee status (active/inactive)
 */
export const useToggleEmployeeStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (employeeId: string) => {
      const { data } = await axiosInstance.put<ApiResponse<Employee>>(
        `/employees/toggle-status/${employeeId}`
      );
      return data.data;
    },
    onSuccess: (updatedEmployee) => {
      // Invalidate employee lists
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all() });

      // Update specific employee in cache
      if (updatedEmployee) {
        queryClient.setQueryData(queryKeys.employees.detail(updatedEmployee._id), updatedEmployee);
      }
    },
  });
};

/**
 * Link employee to user account
 */
export const useLinkEmployeeToUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, employeeId }: { userId: string; employeeId: string }) => {
      const { data } = await axiosInstance.post<ApiResponse>(API_ENDPOINTS.USERS.LINK_EMPLOYEE, {
        userId,
        employeeId,
      });
      return data;
    },
    onSuccess: () => {
      // Invalidate users and employees
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all() });
    },
  });
};

/**
 * Unlink employee from user account (revokes login access)
 */
export const useUnlinkEmployeeFromUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      const { data } = await axiosInstance.post<ApiResponse>(API_ENDPOINTS.USERS.UNLINK_EMPLOYEE, {
        userId,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all() });
    },
  });
};
