import { useState } from 'react';
import {
  Calendar,
  HelpCircle,
  Clock,
  Key,
  RefreshCw,
  FileText,
  Filter,
  User,
  Clock4,
  AlertTriangle,
  Receipt
} from 'lucide-react';
import { useSearchParams } from 'react-router';
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Badge } from "../ui/badge";
import { useToast } from "../ui/toast";
import useAuth from "../../hooks/authjwt";
import { formatTime, formatISTDate, getISTDateString, getMonthOptions } from '../../utils/luxonUtils';
import {
  useAllLeaves,
  useAllHelpInquiries,
  useRegularizationRequests,
  usePasswordResetRequests,
  useApprovePasswordReset,
  useRejectPasswordReset,
  useAllExpenses,
  useUpdateExpenseStatus,
  useUpdateLeaveStatus,
  useUpdateHelpInquiry,
  useReviewRegularization
} from "../../hooks/queries";
import type {
  Expense,
  HelpInquiryQueryParams,
  PasswordResetQueryParams,
  ExpenseQueryParams,
} from '@/types';

type RequestType = 'leave' | 'help' | 'regularization' | 'password' | 'expense';

/** Statuses that still need someone to act. Drives the default view and badges. */
const OPEN_STATUSES = new Set<RequestStatus>(['pending', 'in-progress']);

/** Whole days since submission — the queue's most useful sort signal. */
const daysWaiting = (createdAt: Date): number =>
  Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000));

/**
 * Only `help` has a triage flow, and only `password` can expire, so a flat
 * status list would offer options that match nothing on most tabs. "Open"
 * covers pending + in-progress, which is why there is no separate "Pending".
 */
const STATUS_FILTERS_BY_TYPE: Record<string, { value: string; label: string }[]> = {
  help: [
    { value: 'open', label: 'Open' },
    { value: 'in-progress', label: 'In progress' },
    { value: 'resolved', label: 'Resolved' },
  ],
  password: [
    { value: 'open', label: 'Open' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'expired', label: 'Expired' },
    { value: 'completed', label: 'Completed' },
  ],
  default: [
    { value: 'open', label: 'Open' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
  ],
};

const ALL_STATUSES = { value: 'all', label: 'All statuses' };

const ANY_MONTH = 'any';

// Help requests move through a triage flow; everything else is approve/reject.
const STATUS_OPTIONS = {
  approval: [
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
  ],
  help: [
    { value: 'pending', label: 'Pending' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'resolved', label: 'Resolved' },
  ],
} as const;
type RequestStatus = 'pending' | 'approved' | 'rejected' | 'resolved' | 'expired' | 'completed' | 'in-progress';

interface BaseRequest {
  _id: string;
  type: RequestType;
  title: string;
  description: string;
  date: Date;
  createdAt: Date;
  status: RequestStatus;
  user: { name: string; email: string } | null;
  response?: string;
  reviewComment?: string;
}

interface PasswordRequest extends BaseRequest {
  type: 'password';
  email: string;
  name: string;
}

interface HelpRequest extends BaseRequest {
  type: 'help';
  category?: string;
  priority?: 'low' | 'medium' | 'high';
}

interface ExpenseRequest extends BaseRequest {
  type: 'expense';
  item?: string;
  amount?: number;
}

type UnifiedRequest = BaseRequest | PasswordRequest | HelpRequest | ExpenseRequest;

interface EditState {
  [key: string]: {
    status?: string;
    response?: string;
  };
}

interface ActionLoadingState {
  [key: string]: boolean;
}

interface Tab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const AdminRequestsPage = () => {
  // Filters live in the URL so a view can be linked, bookmarked, and undone
  // with the browser back button.
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('type') ?? 'all';
  // Default to the open queue: this is an approvals inbox, not an archive.
  const statusFilter = searchParams.get('status') ?? 'open';
  const monthParam = searchParams.get('month') ?? '';
  const employeeFilter = searchParams.get('q') ?? '';

  const setParam = (key: string, value: string | null) => {
    setSearchParams((prev: URLSearchParams) => {
      const next = new URLSearchParams(prev);
      if (value === null || value === '') next.delete(key);
      else next.set(key, value);
      return next;
    }, { replace: true });
  };

  // Edit states for different request types
  const [editing, setEditing] = useState<EditState>({});
  const [actionLoading, setActionLoading] = useState<ActionLoadingState>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const user = useAuth();
  const { toast } = useToast();
  const isAdminOrHR = user?.role === 'admin' || user?.role === 'hr';

  // No month selected means the whole queue: a request pending since last month
  // must not vanish when the calendar rolls over.
  const dateRange = monthParam
    ? (() => {
        const [year, month] = monthParam.split('-').map(Number);
        return {
          startDate: getISTDateString(new Date(year, month - 1, 1)),
          endDate: getISTDateString(new Date(year, month, 0)),
        };
      })()
    : {};

  // 'open' is a UI concept spanning each type's own in-flight statuses, so it
  // is resolved client-side; a concrete status is pushed down to the API.
  const statusParam = statusFilter === 'open' || statusFilter === 'all' ? undefined : statusFilter;
  const queryParams = { ...dateRange, ...(statusParam ? { status: statusParam } : {}) };

  const shouldFetchLeaves = activeTab === 'all' || activeTab === 'leave';
  const shouldFetchHelp = activeTab === 'all' || activeTab === 'help';
  const shouldFetchReg = activeTab === 'all' || activeTab === 'regularization';
  const shouldFetchPassword = activeTab === 'all' || activeTab === 'password';
  const shouldFetchExpense = activeTab === 'all' || activeTab === 'expense';

  // Each endpoint narrows `status` to its own union; the page-level filter is a
  // plain string, so it is narrowed per call rather than cast at the source.
  const leavesQuery = useAllLeaves({ params: queryParams, enabled: isAdminOrHR && shouldFetchLeaves });
  const helpQuery = useAllHelpInquiries({
    params: queryParams as HelpInquiryQueryParams,
    enabled: isAdminOrHR && shouldFetchHelp,
  });
  const regQuery = useRegularizationRequests({ params: queryParams, enabled: isAdminOrHR && shouldFetchReg });
  const passwordQuery = usePasswordResetRequests({
    params: queryParams as PasswordResetQueryParams,
    enabled: isAdminOrHR && shouldFetchPassword,
  });
  const expenseQuery = useAllExpenses(queryParams as ExpenseQueryParams, {
    enabled: isAdminOrHR && shouldFetchExpense,
  });

  const leavesData = leavesQuery.data;
  const helpData = helpQuery.data;
  const regData = regQuery.data;
  const passwordData = passwordQuery.data;
  const expenseData = expenseQuery.data;

  const loading = leavesQuery.isLoading || helpQuery.isLoading || regQuery.isLoading ||
    passwordQuery.isLoading || expenseQuery.isLoading;

  // A partial failure must be visible: otherwise a list that is missing an
  // entire request type looks indistinguishable from a complete one.
  const failedSources = [
    leavesQuery.isError && 'leave',
    helpQuery.isError && 'help desk',
    regQuery.isError && 'regularization',
    passwordQuery.isError && 'password reset',
    expenseQuery.isError && 'expense',
  ].filter(Boolean) as string[];

  // The tab is navigation, not a filter — including it here would put a
  // "Clear filters" button on every tab the user simply clicked into.
  const hasActiveFilters = Boolean(monthParam || employeeFilter || searchParams.get('status'));

  // On "All", every type's statuses are reachable, so show the union.
  const statusOptions = (() => {
    if (activeTab === 'all') {
      const seen = new Map<string, { value: string; label: string }>();
      for (const list of Object.values(STATUS_FILTERS_BY_TYPE)) {
        for (const opt of list) if (!seen.has(opt.value)) seen.set(opt.value, opt);
      }
      return [...seen.values(), ALL_STATUSES];
    }
    return [...(STATUS_FILTERS_BY_TYPE[activeTab] ?? STATUS_FILTERS_BY_TYPE.default), ALL_STATUSES];
  })();

  const refetchAll = () => {
    if (shouldFetchLeaves) leavesQuery.refetch();
    if (shouldFetchHelp) helpQuery.refetch();
    if (shouldFetchReg) regQuery.refetch();
    if (shouldFetchPassword) passwordQuery.refetch();
    if (shouldFetchExpense) expenseQuery.refetch();
  };

  // Mutations
  const updateLeaveStatusMutation = useUpdateLeaveStatus();
  const updateHelpInquiryMutation = useUpdateHelpInquiry();
  const reviewRegularizationMutation = useReviewRegularization();
  const approvePasswordResetMutation = useApprovePasswordReset();
  const rejectPasswordResetMutation = useRejectPasswordReset();
  const updateExpenseStatusMutation = useUpdateExpenseStatus();

  const tabs: Tab[] = [
    { id: 'all', label: 'All Requests', icon: FileText },
    { id: 'leave', label: 'Leave Requests', icon: Calendar },
    { id: 'help', label: 'Help Desk', icon: HelpCircle },
    { id: 'regularization', label: 'Regularization', icon: Clock },
    { id: 'password', label: 'Password Resets', icon: Key },
    { id: 'expense', label: 'Expenses', icon: Receipt }
  ];

  const requests: UnifiedRequest[] = (() => {
    if (!isAdminOrHR) return [];

    const allRequests: UnifiedRequest[] = [];
    // Not Date.now(): impure during render, and undated rows would sort to the top.
    const fallbackTime = 0;

    // Format leave requests
    const leaves = leavesData || [];
    const formattedLeaves = leaves.map((leave): BaseRequest => {
      const { startDate, endDate } = leave;
      const isMultiDay = startDate && endDate && new Date(startDate).toDateString() !== new Date(endDate).toDateString();
      const numberOfDays = leave.numberOfDays;
      const daysLabel = numberOfDays ? ` (${numberOfDays} working day${numberOfDays !== 1 ? 's' : ''})` : '';
      const title = isMultiDay
        ? `${leave.leaveType} Leave${daysLabel}`
        : `${leave.leaveType} Leave`;
      return {
        ...leave,
        type: 'leave' as const,
        title,
        description: leave.reason || '',
        date: new Date(startDate),
        createdAt: new Date(leave.createdAt || fallbackTime),
        status: (leave.status || 'pending') as RequestStatus,
        // The leave endpoint populates `employee` without an email.
        user: { name: leave.employeeName, email: '' }
      };
    });
    allRequests.push(...formattedLeaves);

    // Format help requests
    const helpRequests = helpData || [];
    const formattedHelp = helpRequests.map((help): HelpRequest => ({
      ...help,
      type: 'help' as const,
      title: help.subject || 'Help Request',
      description: help.description || help.message || '',
      date: new Date(help.createdAt || fallbackTime),
      createdAt: new Date(help.createdAt || fallbackTime),
      status: (help.status || 'pending') as RequestStatus,
      user: {
        name: help.employeeName ?? '',
        email: typeof help.userId === 'object' && help.userId !== null ? help.userId.email : '',
      },
      category: help.category,
      priority: help.priority
    }));
    allRequests.push(...formattedHelp);

    // Format regularization requests
    const regRequests = regData || [];
    const formattedReg = regRequests.map((reg): BaseRequest => {
      let timeInfo = '';
      if (reg.requestedCheckIn) {
        timeInfo += `Check-in: ${formatTime(new Date(reg.requestedCheckIn))}`;
      }
      if (reg.requestedCheckOut) {
        timeInfo += timeInfo ? ` | Check-out: ${formatTime(new Date(reg.requestedCheckOut))}` : `Check-out: ${formatTime(new Date(reg.requestedCheckOut))}`;
      }
      if (!timeInfo && reg.reason) {
        timeInfo = reg.reason;
      } else if (timeInfo && reg.reason) {
        timeInfo += ` - ${reg.reason}`;
      }

      return {
        ...reg,
        type: 'regularization' as const,
        title: 'Attendance Regularization',
        description: timeInfo || 'No details provided',
        date: new Date(reg.date),
        createdAt: new Date(reg.createdAt || fallbackTime),
        status: (reg.status || 'pending') as RequestStatus,
        user: reg.user ? { name: reg.user.name, email: reg.user.email } : null
      };
    });
    allRequests.push(...formattedReg);

    // Format password reset requests
    const passwordRequests = passwordData || [];
    // PasswordResetRequest has no token-expiry field; the API decides the status.
    const formattedPassword = passwordRequests.map((pwd): PasswordRequest => ({
      ...pwd,
      type: 'password' as const,
      title: 'Password Reset Request',
      description: `User: ${pwd.email}`,
      date: new Date(pwd.createdAt || fallbackTime),
      createdAt: new Date(pwd.createdAt || fallbackTime),
      status: pwd.status as RequestStatus,
      user: { name: pwd.name, email: pwd.email }
    }));
    allRequests.push(...formattedPassword);

    // Format expense requests
    const expenses = expenseData || [];
    const formattedExpenses = expenses.map((exp: Expense): ExpenseRequest => ({
      ...exp,
      type: 'expense' as const,
      title: `Expense: ${exp.item || 'Reimbursement'}`,
      description: `Amount: ₹${Number(exp.amount || 0).toLocaleString()}`,
      date: new Date(exp.date || exp.createdAt || fallbackTime),
      createdAt: new Date(exp.createdAt || fallbackTime),
      status: (exp.status || 'pending') as RequestStatus,
      user: exp.employeeName ? { name: exp.employeeName, email: '' } : 
            (exp.employee && typeof exp.employee === 'object' && 'firstName' in exp.employee ? 
             { name: `${exp.employee.firstName} ${exp.employee.lastName || ''}`.trim(), email: exp.employee.email || '' } : 
             null)
    }));
    allRequests.push(...formattedExpenses);

    // Sort by most recent first
    return allRequests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  })();

  // Counts drive the tab badges, and are taken before the status filter so
  // each tab shows how much work it holds without switching to it.
  const openCountsByType: Record<string, number> = {};
  for (const r of requests) {
    if (OPEN_STATUSES.has(r.status)) openCountsByType[r.type] = (openCountsByType[r.type] ?? 0) + 1;
  }
  const totalOpen = Object.values(openCountsByType).reduce((sum, n) => sum + n, 0);

  const activeTabLabel = tabs.find(t => t.id === activeTab)?.label ?? 'requests';
  const tabOpenCount = activeTab === 'all' ? totalOpen : openCountsByType[activeTab] ?? 0;

  const needle = employeeFilter.trim().toLowerCase();
  const filteredRequests = requests.filter(request => {
    if (activeTab !== 'all' && request.type !== activeTab) return false;

    if (statusFilter === 'open' && !OPEN_STATUSES.has(request.status)) return false;
    if (statusFilter !== 'open' && statusFilter !== 'all' && request.status !== statusFilter) return false;

    if (!needle) return true;
    return (
      request.user?.name?.toLowerCase().includes(needle) ||
      request.user?.email?.toLowerCase().includes(needle) ||
      request.title.toLowerCase().includes(needle)
    ) ?? false;
  });

  const getTypeIcon = (type: RequestType) => {
    switch (type) {
      case 'leave': return Calendar;
      case 'help': return HelpCircle;
      case 'regularization': return Clock;
      case 'password': return Key;
      case 'expense': return Receipt;
      default: return FileText;
    }
  };

  const getStatusColor = (status: RequestStatus): string => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'resolved': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'expired': return 'bg-muted text-muted-foreground';
      case 'completed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'in-progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // Use luxonUtils for consistent timezone display
  const formatDateLocal = (date: Date | string): string => {
    try {
      return formatISTDate(date, { dateOnly: true });
    } catch {
      return 'N/A';
    }
  };

  // Handle editing states
  const handleEdit = (id: string, field: 'status' | 'response', value: string) => {
    setEditing(editing => ({
      ...editing,
      [id]: { ...editing[id], [field]: value }
    }));
  };

  const handleStartEdit = (request: UnifiedRequest) => {
    setEditing(e => ({
      ...e,
      [request._id]: {
        status: request.status,
        response: request.response || request.reviewComment || ""
      }
    }));
  };

  const handleCancelEdit = (id: string) => {
    setEditing(e => {
      const copy = { ...e };
      delete copy[id];
      return copy;
    });
  };

  const handleSave = async (request: UnifiedRequest) => {
    setActionLoading(s => ({ ...s, [request._id]: true }));
    try {
      const editData = editing[request._id] || {};

      if (request.type === 'leave') {
        await updateLeaveStatusMutation.mutateAsync({
          leaveId: request._id,
          status: editData.status as 'pending' | 'approved' | 'rejected'
        });
      } else if (request.type === 'help') {
        await updateHelpInquiryMutation.mutateAsync({
          id: request._id,
          status: editData.status as 'pending' | 'in-progress' | 'resolved',
          response: editData.response
        });
      } else if (request.type === 'regularization') {
        await reviewRegularizationMutation.mutateAsync({
          requestId: request._id,
          status: editData.status as 'pending' | 'approved' | 'rejected',
          comment: editData.response
        });
      } else if (request.type === 'expense') {
        await updateExpenseStatusMutation.mutateAsync({
          id: request._id,
          status: editData.status as 'approved' | 'rejected',
          reviewComment: editData.response
        });
      }

      toast({
        variant: "success",
        title: "Request Updated",
        description: "The request has been updated successfully."
      });

      handleCancelEdit(request._id);
    } catch (error) {
      toast({
        variant: "error",
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update request."
      });
    } finally {
      setActionLoading(s => ({ ...s, [request._id]: false }));
    }
  };

  // Password and help requests need a reason or a triage status, so they are
  // excluded from bulk approve/reject.
  const bulkEligible = filteredRequests.filter(
    r => r.status === 'pending' && r.type !== 'password' && r.type !== 'help'
  );
  const selectedRequests = bulkEligible.filter(r => selected.has(`${r.type}-${r._id}`));

  const toggleSelected = (key: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleBulkAction = async (status: 'approved' | 'rejected') => {
    const targets = [...selectedRequests];
    setSelected(new Set());

    const results = await Promise.allSettled(
      targets.map(request => {
        if (request.type === 'leave') {
          return updateLeaveStatusMutation.mutateAsync({ leaveId: request._id, status });
        }
        if (request.type === 'regularization') {
          return reviewRegularizationMutation.mutateAsync({ requestId: request._id, status, comment: '' });
        }
        return updateExpenseStatusMutation.mutateAsync({ id: request._id, status, reviewComment: '' });
      })
    );

    const failed = results.filter(r => r.status === 'rejected').length;
    toast({
      variant: failed ? 'error' : 'success',
      title: failed ? 'Some updates failed' : `${targets.length} request${targets.length === 1 ? '' : 's'} updated`,
      description: failed
        ? `${targets.length - failed} succeeded, ${failed} failed.`
        : `Marked as ${status}.`,
    });
  };

  const handlePasswordAction = async (requestId: string, action: 'approve' | 'reject') => {
    setActionLoading(prev => ({ ...prev, [`${requestId}_${action}`]: true }));
    try {
      if (action === 'approve') {
        await approvePasswordResetMutation.mutateAsync(requestId);
        toast({
          variant: "success",
          title: "Request Approved",
          description: "Password reset request has been approved."
        });
      } else if (action === 'reject') {
        await rejectPasswordResetMutation.mutateAsync({
          requestId,
          reason: 'Rejected by administrator.'
        });
        toast({
          variant: "success",
          title: "Request Rejected",
          description: "Password reset request has been rejected."
        });
      }
    } catch (error) {
      toast({
        variant: "error",
        title: `${action} Failed`,
        description: error instanceof Error ? error.message : `Failed to ${action} request.`
      });
    } finally {
      setActionLoading(prev => ({ ...prev, [`${requestId}_${action}`]: false }));
    }
  };

  // No local authorization branch here: both /admin/* routes are wrapped in
  // <RequireRole roles={HR_ONLY}>, which decodes the JWT synchronously during
  // render and redirects before this component mounts. The branch that used to
  // live here could only ever fire as a false alarm, flashing "Access Denied"
  // for a frame while useAuth resolved. The backend remains the real boundary.
  return (
    <div className="min-h-full bg-background p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-muted p-2">
            <FileText className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Manage Requests</h1>
            <p className="text-sm text-muted-foreground">
              {tabOpenCount > 0
                ? `${tabOpenCount} request${tabOpenCount === 1 ? '' : 's'} awaiting review`
                : 'Nothing awaiting review'}
              {activeTab !== 'all' && ` in ${activeTabLabel.toLowerCase()}`}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-border">
          <nav className="-mb-px flex gap-6 overflow-x-auto" aria-label="Request type">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const count = tab.id === 'all' ? totalOpen : openCountsByType[tab.id] ?? 0;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    // Reset a status the new tab cannot offer, or the list
                    // would silently come back empty.
                    const allowed = tab.id === 'all'
                      ? null
                      : (STATUS_FILTERS_BY_TYPE[tab.id] ?? STATUS_FILTERS_BY_TYPE.default);
                    const keepStatus =
                      statusFilter === 'open' || statusFilter === 'all' ||
                      !allowed || allowed.some(o => o.value === statusFilter);

                    setSearchParams((prev: URLSearchParams) => {
                      const next = new URLSearchParams(prev);
                      if (tab.id === 'all') next.delete('type');
                      else next.set('type', tab.id);
                      if (!keepStatus) next.delete('status');
                      return next;
                    }, { replace: true });
                    setSelected(new Set());
                  }}
                  type="button"
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    isActive
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span>{tab.label}</span>
                  {count > 0 && (
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs font-semibold text-muted-foreground">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Filters */}
        <Card className="border-border shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <Select
                  value={statusFilter}
                  onValueChange={(v) => setParam('status', v === 'open' ? null : v)}
                >
                  <SelectTrigger className="h-9 w-37.5" aria-label="Filter by status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <Select
                  value={monthParam || ANY_MONTH}
                  onValueChange={(v) => setParam('month', v === ANY_MONTH ? null : v)}
                >
                  <SelectTrigger className="h-9 w-40" aria-label="Filter by month">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Radix treats "" as "no selection", so the catch-all needs
                        a real value of its own. */}
                    <SelectItem value={ANY_MONTH}>Any month</SelectItem>
                    {getMonthOptions(12).map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.display}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-xs">
                <User className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <Input
                  aria-label="Search by employee or request"
                  placeholder="Search employee or request..."
                  value={employeeFilter}
                  onChange={(e) => setParam('q', e.target.value)}
                />
              </div>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchParams({}, { replace: true })}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Clear filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>


        {failedSources.length > 0 && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
            <div className="flex-1">
              <p className="font-medium text-foreground">This list is incomplete</p>
              <p className="text-muted-foreground">
                Could not load {failedSources.join(', ')} requests. Others are shown below.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={refetchAll}>Retry</Button>
          </div>
        )}

        {selectedRequests.length > 0 && (
          <div className="sticky top-2 z-10 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-sm">
            <span className="text-sm font-medium text-foreground">
              {selectedRequests.length} selected
            </span>
            <div className="ml-auto flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
              <Button size="sm" variant="destructive" onClick={() => handleBulkAction('rejected')}>
                Reject
              </Button>
              <Button size="sm" onClick={() => handleBulkAction('approved')}>Approve</Button>
            </div>
          </div>
        )}

        {/* Requests List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Loading requests...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <Card className="border-border shadow-sm">
              <CardContent className="p-8 text-center">
                <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" aria-hidden="true" />
                <h3 className="mb-2 text-lg font-semibold text-foreground">
                  {hasActiveFilters
                    ? 'No matching requests'
                    : activeTab === 'all'
                      ? 'You are all caught up'
                      : `No open ${activeTabLabel.toLowerCase()}`}
                </h3>
                <p className="text-muted-foreground">
                  {hasActiveFilters
                    ? 'No requests match the current filters. Try widening them.'
                    : activeTab === 'all'
                      ? 'Nothing is waiting for review right now.'
                      : totalOpen > 0
                        ? `Nothing here needs review. ${totalOpen} request${totalOpen === 1 ? '' : 's'} awaiting review on other tabs.`
                        : 'Nothing is waiting for review right now.'}
                </p>
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => setSearchParams({}, { replace: true })}
                  >
                    Clear filters
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredRequests.map((request) => {
              const Icon = getTypeIcon(request.type);
              const isEditing = !!editing[request._id];
              const isPasswordRequest = request.type === 'password';
              const passwordReq = isPasswordRequest ? (request as PasswordRequest) : null;

              const rowKey = `${request.type}-${request._id}`;
              const isSelectable = request.status === 'pending' && !isPasswordRequest && request.type !== 'help';
              const age = daysWaiting(request.createdAt);

              return (
                <Card key={rowKey} className="border-border shadow-sm hover:shadow-md transition-shadow bg-card">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          {isSelectable ? (
                            <input
                              type="checkbox"
                              checked={selected.has(rowKey)}
                              onChange={() => toggleSelected(rowKey)}
                              aria-label={`Select ${request.title}`}
                              className="mt-3 h-4 w-4 shrink-0 rounded border-border accent-primary"
                            />
                          ) : (
                            <span className="mt-3 h-4 w-4 shrink-0" aria-hidden="true" />
                          )}
                          <div className="p-2 rounded-lg bg-muted">
                            <Icon className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-foreground mb-1">
                              {request.title}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-2">
                              {request.description}
                            </p>
                            {request.type === 'help' && (request as HelpRequest).category && (
                              <div className="mb-2">
                                <Badge variant="secondary" className="text-xs">
                                  {(request as HelpRequest).category!.charAt(0).toUpperCase() + (request as HelpRequest).category!.slice(1)}
                                </Badge>
                              </div>
                            )}
                            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                              {OPEN_STATUSES.has(request.status) && age >= 3 && (
                                <span
                                  className={`flex items-center gap-1 font-medium ${
                                    age >= 7 ? 'text-destructive' : 'text-yellow-600 dark:text-yellow-500'
                                  }`}
                                >
                                  <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                                  Waiting {age}d
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span className="font-medium">For:</span> {formatDateLocal(request.date)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock4 className="h-3 w-3" />
                                <span className="font-medium">Submitted:</span> {formatDateLocal(request.createdAt)}
                              </span>
                              {request.user && (
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {request.user.name || request.user.email}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-row flex-wrap items-start gap-2 sm:flex-col sm:items-end">
                          <Badge className={getStatusColor(request.status)}>
                            {request.status === 'in-progress' ? 'In Progress' : request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </Badge>
                          {request.type === 'help' && (request as HelpRequest).priority && (
                            <Badge variant="secondary" className={
                              (request as HelpRequest).priority === 'high' ? 'border-red-300 text-red-700 dark:border-red-700 dark:text-red-400' :
                              (request as HelpRequest).priority === 'medium' ? 'border-yellow-300 text-yellow-700 dark:border-yellow-700 dark:text-yellow-400' :
                              'border-border text-muted-foreground'
                            }>
                              {(request as HelpRequest).priority!.charAt(0).toUpperCase() + (request as HelpRequest).priority!.slice(1)} Priority
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Action buttons and editing interface */}
                      {isPasswordRequest && passwordReq ? (
                        <>
                          {request.status === 'pending' && (
                            <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-3">
                              <Button
                                onClick={() => handlePasswordAction(request._id, 'approve')}
                                disabled={actionLoading[`${request._id}_approve`]}
                                className="bg-green-600 hover:bg-green-700 text-white"
                                size="sm"
                              >
                                {actionLoading[`${request._id}_approve`] ? 'Approving...' : 'Approve & Generate Token'}
                              </Button>
                              <Button
                                onClick={() => handlePasswordAction(request._id, 'reject')}
                                disabled={actionLoading[`${request._id}_reject`]}
                                variant="destructive"
                                size="sm"
                              >
                                {actionLoading[`${request._id}_reject`] ? 'Rejecting...' : 'Reject'}
                              </Button>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          {isEditing ? (
                            <div className="pt-3 border-t border-border space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <Select
                                  value={editing[request._id]?.status || request.status}
                                  onValueChange={(value) => handleEdit(request._id, "status", value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {STATUS_OPTIONS[request.type === 'help' ? 'help' : 'approval'].map(opt => (
                                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>

                                {(request.type === 'help' || request.type === 'regularization' || request.type === 'expense') && (
                                  <Input
                                    placeholder={request.type === 'help' ? "Response message..." : request.type === 'expense' ? "Review comment (optional)..." : "Review comment..."}
                                    value={editing[request._id]?.response || ""}
                                    onChange={(e) => handleEdit(request._id, "response", e.target.value)}
                                  />
                                )}
                              </div>

                              <div className="flex justify-end gap-2">
                                <Button
                                  onClick={() => handleSave(request)}
                                  disabled={actionLoading[request._id]}
                                  variant="secondary"
                                  size="sm"
                                >
                                  {actionLoading[request._id] ? 'Saving...' : 'Save'}
                                </Button>
                                <Button
                                  onClick={() => handleCancelEdit(request._id)}
                                  variant="outline"
                                  size="sm"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            (request.status === 'pending' || (request.type === 'help' && request.status === 'in-progress')) && (
                              <div className="flex justify-end border-t border-border pt-3">
                                <Button
                                  onClick={() => handleStartEdit(request)}
                                  variant="secondary"
                                  size="sm"
                                >
                                  {request.status === 'in-progress' ? 'Update Request' : 'Review Request'}
                                </Button>
                              </div>
                            )
                          )}

                          {(request.response || request.reviewComment) && !isEditing && (
                            <div className="pt-3 border-t border-border">
                              <p className="text-sm text-muted-foreground">
                                <span className="font-medium">Response:</span> {request.response || request.reviewComment}
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminRequestsPage;
