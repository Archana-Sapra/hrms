import { useState, useMemo } from 'react';
import {
  Calendar,
  HelpCircle,
  Clock,
  Key,
  FileText,
  User,
  Clock4,
  MapPin,
  RefreshCw,
  IndianRupee,
  Receipt
} from 'lucide-react';
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useToast } from "../ui/toast";
import useAuth from "../../hooks/authjwt";
import BackButton from "../ui/BackButton";
import LeaveRequestModal from "../LeaveRequestModal";
import HelpDeskModal, { type HelpDeskData } from "../HelpDeskModal";
import RegularizationModal from "../dashboard/RegularizationModal";
import ExpenseModal from "../ExpenseModal";
import { formatTime, formatISTDate } from '../../utils/luxonUtils';
import {
  useMyLeaves,
  useAllLeaves,
  useMyHelpInquiries,
  useAllHelpInquiries,
  useMyRegularizations,
  useRegularizationRequests,
  useWFHRequests,
  useMyWFHRequests,
  useRequestLeave,
  useSubmitHelpInquiry,
  useMyExpenses,
  useAllExpenses,
  useCreateExpense
} from '@/hooks/queries';
import type { LucideIcon } from 'lucide-react';
import type { ApiError, LeaveRequestDto, CreateHelpInquiryDto } from '@/types';

// Tab type definition
interface Tab {
  id: string;
  label: string;
  icon: LucideIcon;
}

// Unified request type for the UI
interface UnifiedRequest {
  _id: string;
  type: 'leave' | 'help' | 'regularization' | 'wfh' | 'password' | 'expense';
  title: string;
  description: string;
  date: Date;
  createdAt: Date;
  status: 'pending' | 'approved' | 'rejected';
  reviewComment?: string;
  user?: {
    name?: string;
    email?: string;
  };
  // Original request data
  [key: string]: unknown;
}


const MyRequests = () => {
  const [activeTab, setActiveTab] = useState<string>('all');

  // Modal states
  const [showLeaveModal, setShowLeaveModal] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [showRegularizationModal, setShowRegularizationModal] = useState<boolean>(false);
  const [showExpenseModal, setShowExpenseModal] = useState<boolean>(false);

  const user = useAuth();
  const { toast } = useToast();
  const isAdminOrHR = user?.role === 'admin' || user?.role === 'hr';

  const tabs: Tab[] = [
    { id: 'all', label: 'All Requests', icon: FileText },
    { id: 'leave', label: 'Leave Requests', icon: Calendar },
    { id: 'help', label: 'Help Desk', icon: HelpCircle },
    { id: 'regularization', label: 'Regularization', icon: Clock },
    { id: 'wfh', label: 'WFH Requests', icon: MapPin },
    { id: 'expense', label: 'Expenses', icon: Receipt }
  ];

  // Fetch data using React Query hooks
  const shouldFetchLeaves = activeTab === 'all' || activeTab === 'leave';
  const shouldFetchHelp = activeTab === 'all' || activeTab === 'help';
  const shouldFetchReg = activeTab === 'all' || activeTab === 'regularization';
  const shouldFetchWFH = activeTab === 'all' || activeTab === 'wfh';
  const shouldFetchExpense = activeTab === 'all' || activeTab === 'expense';

  // Both hooks must be called unconditionally: `isAdminOrHR` flips once auth
  // resolves, and a ternary here would change hook order.
  const adminLeaves = useAllLeaves({ enabled: shouldFetchLeaves && isAdminOrHR });
  const ownLeaves = useMyLeaves({ enabled: shouldFetchLeaves && !isAdminOrHR });
  const { data: leaveData = [], isLoading: leavesLoading, refetch: refetchLeaves } =
    isAdminOrHR ? adminLeaves : ownLeaves;

  const adminHelp = useAllHelpInquiries({ enabled: shouldFetchHelp && isAdminOrHR });
  const ownHelp = useMyHelpInquiries({ enabled: shouldFetchHelp && !isAdminOrHR });
  const { data: helpData = [], isLoading: helpLoading, refetch: refetchHelp } =
    isAdminOrHR ? adminHelp : ownHelp;

  const adminReg = useRegularizationRequests({ enabled: shouldFetchReg && isAdminOrHR });
  const ownReg = useMyRegularizations({ enabled: shouldFetchReg && !isAdminOrHR });
  const { data: regData = [], isLoading: regLoading, refetch: refetchReg } =
    isAdminOrHR ? adminReg : ownReg;

  const adminWFH = useWFHRequests(undefined, { enabled: shouldFetchWFH && isAdminOrHR });
  const ownWFH = useMyWFHRequests({ enabled: shouldFetchWFH && !isAdminOrHR });
  const { data: wfhData = [], isLoading: wfhLoading, refetch: refetchWFH } =
    isAdminOrHR ? adminWFH : ownWFH;

  const adminExpense = useAllExpenses(undefined, { enabled: shouldFetchExpense && isAdminOrHR });
  const ownExpense = useMyExpenses({ enabled: shouldFetchExpense && !isAdminOrHR });
  const { data: expenseData = [], isLoading: expenseLoading, refetch: refetchExpense } =
    isAdminOrHR ? adminExpense : ownExpense;

  const loading = leavesLoading || helpLoading || regLoading || wfhLoading || expenseLoading;

  // Mutations for submitting requests
  const requestLeaveMutation = useRequestLeave();
  const submitHelpInquiryMutation = useSubmitHelpInquiry();

  // Load requests handler
  const loadRequests = () => {
    if (shouldFetchLeaves) refetchLeaves();
    if (shouldFetchHelp) refetchHelp();
    if (shouldFetchReg) refetchReg();
    if (shouldFetchWFH) refetchWFH();
    if (shouldFetchExpense) refetchExpense();
  };

  // Process and combine all requests
  const filteredRequests = useMemo((): UnifiedRequest[] => {
    const allRequests: UnifiedRequest[] = [];
    // Not Date.now(): impure during render, and undated rows would sort to the top.
    const fallbackTime = 0;

    // Process leave requests
    if (shouldFetchLeaves && leaveData) {
      const leavesArray = Array.isArray(leaveData) ? leaveData : (leaveData as { leaves?: unknown[] }).leaves || [];
      const formattedLeaves: UnifiedRequest[] = (leavesArray as Record<string, unknown>[]).map((leave): UnifiedRequest => ({
        ...leave,
        _id: (leave._id as string) || '',
        type: 'leave' as const,
        title: `${leave.leaveType || 'Unknown'} Leave`,
        description: (leave.leaveReason as string) || (leave.reason as string) || '',
        date: new Date((leave.leaveDate as string) || (leave.date as string)),
        createdAt: new Date((leave.createdAt as string) || (leave.requestDate as string) || fallbackTime),
        status: (leave.status as 'pending' | 'approved' | 'rejected') || 'pending',
        reviewComment: leave.reviewComment as string | undefined,
        user: leave.user as { name?: string; email?: string } | undefined
      }));
      allRequests.push(...formattedLeaves);
    }

    // Process help requests
    if (shouldFetchHelp && helpData) {
      const helpArray = Array.isArray(helpData) ? helpData : (helpData as { inquiries?: unknown[] }).inquiries || [];
      const formattedHelp: UnifiedRequest[] = (helpArray as Record<string, unknown>[]).map((help): UnifiedRequest => ({
        ...help,
        _id: (help._id as string) || '',
        type: 'help' as const,
        title: (help.subject as string) || (help.title as string) || 'Help Request',
        description: (help.description as string) || (help.message as string) || '',
        date: new Date((help.createdAt as string) || fallbackTime),
        createdAt: new Date((help.createdAt as string) || fallbackTime),
        status: (help.status as 'pending' | 'approved' | 'rejected') || 'pending',
        reviewComment: help.reviewComment as string | undefined,
        user: help.user as { name?: string; email?: string } | undefined
      }));
      allRequests.push(...formattedHelp);
    }

    // Process regularization requests
    if (shouldFetchReg && regData) {
      const regArray = Array.isArray(regData) ? regData : (regData as { regs?: unknown[] }).regs || [];
      const formattedReg: UnifiedRequest[] = (regArray as Record<string, unknown>[]).map((reg): UnifiedRequest => {
        let timeInfo = '';
        if (reg.requestedCheckIn) {
          timeInfo += `Check-in: ${formatTime(new Date(reg.requestedCheckIn as string))}`;
        }
        if (reg.requestedCheckOut) {
          timeInfo += timeInfo ? ` | Check-out: ${formatTime(new Date(reg.requestedCheckOut as string))}` : `Check-out: ${formatTime(new Date(reg.requestedCheckOut as string))}`;
        }
        if (!timeInfo && reg.reason) {
          timeInfo = reg.reason as string;
        } else if (timeInfo && reg.reason) {
          timeInfo += ` - ${reg.reason as string}`;
        }

        return {
          ...reg,
          _id: (reg._id as string) || '',
          type: 'regularization' as const,
          title: 'Attendance Regularization',
          description: timeInfo || 'No details provided',
          date: new Date(reg.date as string),
          createdAt: new Date((reg.createdAt as string) || fallbackTime),
          status: (reg.status as 'pending' | 'approved' | 'rejected') || 'pending',
          reviewComment: reg.reviewComment as string | undefined,
          user: reg.user as { name?: string; email?: string } | undefined
        };
      });
      allRequests.push(...formattedReg);
    }

    // Process WFH requests
    if (shouldFetchWFH && wfhData) {
      const wfhArray = Array.isArray(wfhData) ? wfhData : (wfhData as { requests?: unknown[] }).requests || [];
      const formattedWFH: UnifiedRequest[] = (wfhArray as Record<string, unknown>[]).map((req): UnifiedRequest => ({
        ...req,
        _id: (req._id as string) || '',
        type: 'wfh' as const,
        title: 'Work From Home Request',
        description: (req.reason as string) || 'No description provided',
        date: new Date((req.requestDate as string) || (req.createdAt as string) || fallbackTime),
        createdAt: new Date((req.createdAt as string) || fallbackTime),
        status: (req.status as 'pending' | 'approved' | 'rejected') || 'pending',
        reviewComment: req.reviewComment as string | undefined,
        user: req.user as { name?: string; email?: string } | undefined
      }));
      allRequests.push(...formattedWFH);
    }

    // Process Expense requests
    if (shouldFetchExpense && expenseData) {
      const expenseArray = Array.isArray(expenseData) ? expenseData : (expenseData as { expenses?: unknown[] }).expenses || [];
      const formattedExpense: UnifiedRequest[] = (expenseArray as Record<string, unknown>[]).map((exp): UnifiedRequest => ({
        ...exp,
        _id: (exp._id as string) || '',
        type: 'expense' as const,
        title: `Expense: ${exp.item || 'Reimbursement'}`,
        description: `Amount: ₹${Number(exp.amount || 0).toLocaleString()}`,
        date: new Date((exp.date as string) || (exp.createdAt as string) || fallbackTime),
        createdAt: new Date((exp.createdAt as string) || fallbackTime),
        status: (exp.status as 'pending' | 'approved' | 'rejected') || 'pending',
        reviewComment: exp.reviewComment as string | undefined,
        user: exp.user as { name?: string; email?: string } | undefined
      }));
      allRequests.push(...formattedExpense);
    }

    // Sort by most recent first
    return allRequests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [leaveData, helpData, regData, wfhData, expenseData, shouldFetchLeaves, shouldFetchHelp, shouldFetchReg, shouldFetchWFH, shouldFetchExpense]);

  const getTypeIcon = (type: UnifiedRequest['type']): LucideIcon => {
    switch (type) {
      case 'leave': return Calendar;
      case 'help': return HelpCircle;
      case 'regularization': return Clock;
      case 'wfh': return MapPin;
      case 'expense': return Receipt;
      case 'password': return Key;
      default: return FileText;
    }
  };

  const getStatusColor = (status: UnifiedRequest['status']): string => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // Use luxonUtils for consistent timezone display
  const formatDateLocal = (date: Date): string => formatISTDate(date, { customFormat: 'dd-MM-yy' });

  const handleNewRequest = (type: 'leave' | 'help' | 'regularization'): void => {
    switch (type) {
      case 'leave':
        setShowLeaveModal(true);
        break;
      case 'help':
        setShowHelpModal(true);
        break;
      case 'regularization':
        setShowRegularizationModal(true);
        break;
      default:
        break;
    }
  };

  // Leave request submission handler
  const handleLeaveRequestSubmit = async (data: LeaveRequestDto): Promise<void> => {
    try {
      await requestLeaveMutation.mutateAsync(data);
      toast({
        variant: "success",
        title: "Leave Request Submitted",
        description: "Your leave request has been submitted successfully."
      });
      setShowLeaveModal(false);
      // React Query auto-invalidates and refetches
    } catch (error) {
      console.error("Leave request error:", error);
      toast({
        variant: "error",
        title: "Leave Request Failed",
        description: error instanceof Error ? error.message : "Failed to submit leave request."
      });
    }
  };

  // Help inquiry submission handler
  const handleHelpInquirySubmit = async (data: HelpDeskData): Promise<void> => {
    try {
      // Map frontend fields to backend expected fields
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
      setShowHelpModal(false);
      // React Query auto-invalidates and refetches
    } catch (error) {
      console.error("Help inquiry error:", error);
      toast({
        variant: "error",
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "Failed to submit help inquiry."
      });
    }
  };

  const createExpenseMutation = useCreateExpense();
  const handleExpenseSubmit = async (data: { date: string; item: string; amount: number }) => {
    try {
      await createExpenseMutation.mutateAsync(data);
      toast({
        variant: "success",
        title: "Expense Submitted",
        description: "Your expense reimbursement request has been submitted successfully."
      });
      setShowExpenseModal(false);
      loadRequests();
    } catch (err) {
      const error = err as ApiError;
      toast({
        variant: "error",
        title: "Submission Failed",
        description: error.response?.data?.message || "Failed to submit expense."
      });
    }
  };

  return (
    <div className="min-h-full bg-background p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <BackButton label="Back" variant="ghost" className="w-auto" />

            <Button
              onClick={loadRequests}
              variant="outline"
              disabled={loading}
              className="border-border text-muted-foreground"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  My Requests
                </h1>
                <p className="text-muted-foreground">
                  View and manage all your requests in one place
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={() => handleNewRequest('leave')}
                className="bg-secondary hover:bg-secondary/80 text-secondary-foreground"
              >
                <Calendar className="h-4 w-4 mr-2" />
                New Leave
              </Button>
              <Button
                onClick={() => handleNewRequest('help')}
                className="bg-secondary hover:bg-secondary/80 text-secondary-foreground"
              >
                <HelpCircle className="h-4 w-4 mr-2" />
                Help Request
              </Button>
              <Button
                onClick={() => handleNewRequest('regularization')}
                className="bg-secondary hover:bg-secondary/80 text-secondary-foreground"
              >
                <Clock className="h-4 w-4 mr-2" />
                Regularization
              </Button>
              <Button
                onClick={() => setShowExpenseModal(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
              >
                <IndianRupee className="h-4 w-4 mr-2" />
                New Expense
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-border">
          <nav className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    isActive
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>


        {/* Requests Grid */}
        <div>
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Loading requests...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <Card className="border-0 shadow-sm bg-muted">
              <CardContent className="p-8 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No requests found
                </h3>
                <p className="text-muted-foreground">
                  Start by creating your first request using the buttons above.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRequests.map((request) => {
                const Icon = getTypeIcon(request.type);
                return (
                  <Card key={`${request.type}-${request._id}`} className="border-border shadow-sm hover:shadow-md transition-shadow bg-card">
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-4">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${
                            request.type === 'leave' ? 'bg-muted' :
                            request.type === 'help' ? 'bg-muted' :
                            request.type === 'regularization' ? 'bg-muted' :
                            'bg-muted'
                          }`}>
                            <Icon className={`h-4 w-4 ${
                              request.type === 'leave' ? 'text-muted-foreground' :
                              request.type === 'help' ? 'text-muted-foreground' :
                              request.type === 'regularization' ? 'text-muted-foreground' :
                              request.type === 'expense' ? 'text-muted-foreground' :
                              'text-muted-foreground'
                            }`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-foreground mb-1 text-sm">
                              {request.title}
                            </h3>
                            <Badge className={`${getStatusColor(request.status)} text-xs`}>
                              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                            </Badge>
                          </div>
                        </div>

                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {request.description}
                        </p>

                        <div className="flex flex-col gap-2 text-xs text-muted-foreground">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span className="font-medium">For:</span> {formatDateLocal(request.date)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock4 className="h-3 w-3" />
                              <span className="font-medium">Submitted:</span> {formatDateLocal(request.createdAt)}
                            </span>
                          </div>
                          {request.type === 'regularization' && (
                            <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                              <span className="font-medium">Attendance Date:</span> {formatDateLocal(request.date)} |
                              <span className="font-medium ml-2">Request Submitted:</span> {formatISTDate(new Date(request.createdAt), { customFormat: 'dd-MM-yy' })}
                            </div>
                          )}
                          {isAdminOrHR && request.user && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {request.user.name || request.user.email}
                            </span>
                          )}
                        </div>

                        {request.reviewComment && (
                          <p className="text-xs text-muted-foreground mt-2 p-2 bg-muted rounded">
                            {request.reviewComment}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <LeaveRequestModal
        isOpen={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        onSubmit={handleLeaveRequestSubmit}
        isLoading={requestLeaveMutation.isPending}
      />

      <HelpDeskModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        onSubmit={handleHelpInquirySubmit}
        isLoading={submitHelpInquiryMutation.isPending}
      />

      <RegularizationModal
        isOpen={showRegularizationModal}
        onClose={() => setShowRegularizationModal(false)}
        onSuccess={() => {
          toast({
            variant: "success",
            title: "Regularization Request Submitted",
            description: "Your attendance regularization request has been submitted."
          });
          loadRequests();
        }}
      />

      <ExpenseModal
        isOpen={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        onSubmit={handleExpenseSubmit}
        isLoading={createExpenseMutation.isPending}
      />
    </div>
  );
};

export default MyRequests;
