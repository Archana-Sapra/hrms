import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios';
import { queryKeys } from '@/lib/queryKeys';
import { API_ENDPOINTS } from '@/lib/apiEndpoints';
import { tokenStorage } from '@/lib/tokenStorage';
import type {
  ApiResponse,
  User,
  Employee,
  LoginCredentials,
  CreateAccountData,
  PasswordResetRequestDto,
} from '@/types';

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get user profile (returns Employee data)
 * Automatically fetches current user profile using auth token
 *
 * Note: React Query automatically deduplicates requests.
 * Multiple components calling this hook simultaneously = 1 API call
 */
export const useProfile = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: queryKeys.auth.profile(),
    queryFn: async () => {
      // Note: This endpoint returns Employee data, not User data
      const { data } = await axiosInstance.get<ApiResponse<Employee>>(API_ENDPOINTS.EMPLOYEES.PROFILE);
      return data.data;
    },
    // Don't retry on 401 (unauthenticated)
    retry: false,
    // Only run if token exists (can be overridden by options)
    enabled: options?.enabled ?? tokenStorage.exists(),
    // Profile data changes rarely, cache for 1 hour
    staleTime: 1000 * 60 * 60,
  });
};

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Login mutation
 * Authenticates user and stores token
 *
 * Note: This hook does NOT handle navigation.
 * Components should handle navigation based on the mutation result.
 *
 * @example
 * const loginMutation = useLogin();
 * const navigate = useNavigate();
 *
 * const handleLogin = async (credentials) => {
 *   const result = await loginMutation.mutateAsync(credentials);
 *   if (result?.token) {
 *     navigate('/dashboard');
 *   }
 * };
 */
export const useLogin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      // Backend returns: { success: true, message: '...', token: '...' }
      const { data } = await axiosInstance.post<{ success: boolean; message: string; token: string }>(
        API_ENDPOINTS.AUTH.LOGIN,
        credentials
      );
      // Return token directly since backend puts it at top level
      return { token: data.token };
    },
    onSuccess: (data) => {
      if (data?.token) {
        // Store token
        tokenStorage.set(data.token);

        // Invalidate profile query to fetch full Employee data
        queryClient.invalidateQueries({ queryKey: queryKeys.auth.profile() });
      }
    },
    // Don't retry failed logins (security)
    retry: false,
  });
};

/**
 * Create an account as admin/HR. Sends `role` and `employeeId`, so an employee
 * account is linked to its profile as it is created rather than born orphaned.
 */
export const useCreateAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accountData: CreateAccountData) => {
      const { data } = await axiosInstance.post<ApiResponse<User>>(
        API_ENDPOINTS.AUTH.REGISTER,
        accountData,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all() });
    },
  });
};

/**
 * Logout mutation
 * Clears auth token and cache
 *
 * Note: This hook does NOT handle navigation.
 * Components should handle navigation after logout.
 */
export const useLogout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Call logout endpoint (optional - backend may not have this)
      try {
        await axiosInstance.post(API_ENDPOINTS.AUTH.LOGOUT);
      } catch (error) {
        // Log but don't fail - proceed with local cleanup
        console.warn('Logout endpoint failed, proceeding with local cleanup:', error);
      }
    },
    onSettled: () => {
      // Clear token
      tokenStorage.remove();

      // Clear all cached data
      queryClient.clear();
    },
  });
};

/**
 * Request password reset
 * Employee requests password reset (requires admin approval)
 */
export const useRequestPasswordReset = () => {
  return useMutation({
    mutationFn: async (resetData: PasswordResetRequestDto) => {
      const { data } = await axiosInstance.post<ApiResponse>(API_ENDPOINTS.PASSWORD_RESET.REQUEST, resetData);
      return data;
    },
  });
};

/**
 * Reset password with token (Admin approved)
 */
export const useResetPassword = () => {
  return useMutation({
    mutationFn: async ({ resetToken, newPassword }: { resetToken: string; newPassword: string }) => {
      const { data } = await axiosInstance.post<ApiResponse>('/password-reset/reset', {
        resetToken,
        newPassword,
      });
      return data;
    },
  });
};
