import React, { useState, useMemo } from 'react';
import {
  Search,
  CheckCircle2,
  XCircle,
  Download,
  CheckSquare,
  Square,
  RefreshCw,
  AlertCircle,
  MessageSquare,
  Send,
  X
} from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import BackButton from "@/components/ui/BackButton";
import {
  useAllExpenses,
  useUpdateExpenseStatus,
  useBulkUpdateExpenseStatus
} from '@/hooks/queries/useExpenses';
import { formatISTDate } from '@/utils/luxonUtils';
import axiosInstance from '@/lib/axios';
import { API_ENDPOINTS, buildEndpointWithQuery } from '@/lib/apiEndpoints';

const ExpenseManagement = () => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [adminComment, setAdminComment] = useState('');
  const [rejectingExpenseId, setRejectingExpenseId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState('');

  const { toast } = useToast();
  
  const queryParams = useMemo(() => ({
    status: statusFilter === 'all' ? undefined : statusFilter as any,
    startDate: startDate || undefined,
    endDate: endDate || undefined
  }), [statusFilter, startDate, endDate]);

  const { data: expenses = [], isLoading, refetch } = useAllExpenses(queryParams);
  const updateStatusMutation = useUpdateExpenseStatus();
  const bulkUpdateMutation = useBulkUpdateExpenseStatus();

  const filteredExpenses = expenses.filter(exp => 
    exp.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exp.item?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (typeof exp.employee !== 'string' && exp.employee?.employeeId?.includes(searchTerm))
  );

  const handleApprove = async (id: string) => {
    try {
      await updateStatusMutation.mutateAsync({ 
        id, 
        status: 'approved'
      });
      toast({
        variant: "success",
        title: `Expense approved`,
        description: `The expense has been successfully approved.`
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.response?.data?.message || "Something went wrong"
      });
    }
  };

  const handleRejectConfirm = async (id: string) => {
    try {
      await updateStatusMutation.mutateAsync({ 
        id, 
        status: 'rejected', 
        reviewComment: rejectComment.trim() || undefined 
      });
      toast({
        variant: "success",
        title: `Expense rejected`,
        description: `The expense has been successfully rejected.`
      });
      setRejectingExpenseId(null);
      setRejectComment('');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.response?.data?.message || "Something went wrong"
      });
    }
  };

  const handleBulkUpdate = async (status: 'approved' | 'rejected') => {
    if (selectedIds.length === 0) {
      toast({
        variant: "warning",
        title: "No selection",
        description: "Please select at least one expense to take action."
      });
      return;
    }

    try {
      await bulkUpdateMutation.mutateAsync({
        ids: selectedIds,
        status,
        reviewComment: adminComment
      });
      toast({
        variant: "success",
        title: "Bulk Update Successful",
        description: `Successfully ${status} ${selectedIds.length} expenses.`
      });
      setSelectedIds([]);
      setAdminComment('');
    } catch (error: any) {
      toast({
        variant: "error",
        title: "Bulk Update Failed",
        description: error.response?.data?.message || "Something went wrong"
      });
    }
  };

  const handleExport = async () => {
    try {
      const exportParams = { ...queryParams, ...(searchTerm ? { search: searchTerm } : {}) };
      const endpoint = buildEndpointWithQuery(API_ENDPOINTS.EXPENSES.EXPORT, exportParams as any);
      const response = await axiosInstance.get(endpoint, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Expenses_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        variant: "error",
        title: "Export Failed",
        description: "Failed to download the Excel report."
      });
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const pendingsOnly = filteredExpenses.filter(e => e.status === 'pending');
    if (selectedIds.length === pendingsOnly.length && pendingsOnly.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pendingsOnly.map(e => e._id));
    }
  };

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <BackButton variant="ghost" className="p-0 h-auto hover:bg-transparent" />
              <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-amber-500">
                Expense Management
              </h1>
            </div>
            <p className="text-slate-500 dark:text-slate-400">Review and process company expense claims</p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleExport}
              className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 gap-2 h-11"
            >
              <Download size={18} />
              Export Excel
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              disabled={isLoading}
              className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 h-11 w-11"
            >
              <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="border-slate-200 dark:border-slate-700 shadow-sm overflow-visible bg-white dark:bg-slate-800">
          <CardContent className="p-4 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <Input
                    placeholder="Employee or Item..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-11 bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 focus:ring-amber-500/20"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-11 bg-slate-50/50 dark:bg-slate-900/50">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">From Date</label>
                <Input 
                  type="date" 
                  value={startDate} 
                  onChange={e => setStartDate(e.target.value)}
                  className="h-11 bg-slate-50/50 dark:bg-slate-900/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">To Date</label>
                <Input 
                  type="date" 
                  value={endDate} 
                  onChange={e => setEndDate(e.target.value)}
                  className="h-11 bg-slate-50/50 dark:bg-slate-900/50"
                />
              </div>
            </div>

            {/* Bulk Actions Bar */}
            {selectedIds.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-medium whitespace-nowrap">
                  <span className="flex items-center justify-center w-6 h-6 bg-amber-200 dark:bg-amber-800 rounded-full text-xs">
                    {selectedIds.length}
                  </span>
                  items selected
                </div>

                <Input 
                  placeholder="Review comment for selected..."
                  value={adminComment}
                  onChange={e => setAdminComment(e.target.value)}
                  className="bg-white dark:bg-slate-900 h-10 border-amber-200"
                />

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button 
                    size="sm" 
                    onClick={() => handleBulkUpdate('approved')}
                    className="bg-green-600 hover:bg-green-700 text-white flex-1 sm:flex-none"
                  >
                    Approve All
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={() => handleBulkUpdate('rejected')}
                    className="flex-1 sm:flex-none"
                  >
                    Reject All
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expenses List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-12 h-12 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"></div>
              <p className="text-slate-500 font-medium">Loading expenses...</p>
            </div>
          ) : filteredExpenses.length === 0 ? (
            <Card className="border-dashed border-2 bg-transparent">
              <CardContent className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                <AlertCircle size={48} className="text-slate-300" />
                <div>
                  <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">No expenses found</h3>
                  <p className="text-slate-500 max-w-sm">No expenses match your current filters or have been submitted.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                    <th className="p-4 w-12">
                      <button 
                        onClick={toggleSelectAll}
                        className="text-slate-400 hover:text-amber-500 transition-colors"
                      >
                        {selectedIds.length === filteredExpenses.filter(e => e.status === 'pending').length && selectedIds.length > 0 ? (
                          <CheckSquare size={20} className="text-amber-500" />
                        ) : (
                          <Square size={20} />
                        )}
                      </button>
                    </th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Employee</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Date</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Item Description</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Amount</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {filteredExpenses.map((expense) => {
                    const empData: any = expense.employee;
                    const isSelected = selectedIds.includes(expense._id);
                    const isPending = expense.status === 'pending';
                    
                    return (
                      <React.Fragment key={expense._id}>
                      <tr 
                        className={`hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors ${isSelected ? 'bg-amber-50/30 dark:bg-amber-900/5' : ''}`}
                      >
                        <td className="p-4">
                           {isPending && (
                             <button 
                              onClick={() => toggleSelect(expense._id)}
                              className={`transition-colors ${isSelected ? 'text-amber-500' : 'text-slate-300 hover:text-amber-400'}`}
                             >
                               {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                             </button>
                           )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-sm">
                              {expense.employeeName.charAt(0)}
                            </div>
                            <div>
                               <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{expense.employeeName}</p>
                               <p className="text-[10px] text-slate-400 uppercase font-mono">{empData?.employeeId || 'ID UNKNOWN'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {formatISTDate(expense.date, { customFormat: 'dd MMM yyyy' })}
                        </td>
                        <td className="p-4">
                          <div>
                            <p className="text-sm text-slate-700 dark:text-slate-200 font-medium">{expense.item}</p>
                            {expense.status !== 'pending' && (
                              <Badge className={`mt-1 text-[10px] ${
                                expense.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                              }`}>
                                {expense.status.toUpperCase()}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                            <span className="text-xs font-normal opacity-50">₹</span>
                            {expense.amount.toLocaleString('en-IN')}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-2">
                             {isPending ? (
                               <>
                                 <Button 
                                   size="sm" 
                                   variant="ghost" 
                                   className="text-green-600 hover:bg-green-50 h-8 w-8 p-0"
                                   title="Approve"
                                   onClick={() => handleApprove(expense._id)}
                                 >
                                   <CheckCircle2 size={20} />
                                 </Button>
                                 <Button 
                                   size="sm" 
                                   variant="ghost" 
                                   className={`h-8 w-8 p-0 ${
                                     rejectingExpenseId === expense._id 
                                       ? 'text-red-700 bg-red-100 dark:bg-red-900/30' 
                                       : 'text-red-600 hover:bg-red-50'
                                   }`}
                                   title="Reject"
                                   onClick={() => {
                                     if (rejectingExpenseId === expense._id) {
                                       setRejectingExpenseId(null);
                                       setRejectComment('');
                                     } else {
                                       setRejectingExpenseId(expense._id);
                                       setRejectComment('');
                                     }
                                   }}
                                 >
                                   <XCircle size={20} />
                                 </Button>
                               </>
                             ) : (
                               <div className="text-[10px] uppercase font-bold text-slate-300 tracking-tighter">Processed</div>
                             )}
                          </div>
                        </td>
                      </tr>
                      {/* Inline Reject Comment Row */}
                      {rejectingExpenseId === expense._id && (
                        <tr className="bg-red-50/60 dark:bg-red-900/10 border-b border-red-100 dark:border-red-900/30 animate-in fade-in slide-in-from-top-1 duration-200">
                          <td colSpan={6} className="px-4 py-3">
                            <div className="flex items-center gap-3 max-w-2xl ml-auto">
                              <MessageSquare size={16} className="text-red-400 shrink-0" />
                              <Input
                                placeholder="Rejection reason (optional)..."
                                value={rejectComment}
                                onChange={e => setRejectComment(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    handleRejectConfirm(expense._id);
                                  }
                                }}
                                className="h-9 bg-white dark:bg-slate-900 border-red-200 dark:border-red-900/40 focus:ring-red-500/20 text-sm"
                                autoFocus
                              />
                              <Button
                                size="sm"
                                onClick={() => handleRejectConfirm(expense._id)}
                                className="bg-red-600 hover:bg-red-700 text-white h-9 px-4 gap-1.5 shrink-0"
                                disabled={updateStatusMutation.isPending}
                              >
                                <Send size={14} />
                                Reject
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setRejectingExpenseId(null);
                                  setRejectComment('');
                                }}
                                className="text-slate-400 hover:text-slate-600 h-9 w-9 p-0 shrink-0"
                              >
                                <X size={16} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExpenseManagement;
