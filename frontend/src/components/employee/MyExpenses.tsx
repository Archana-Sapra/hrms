import { useState } from 'react';
import {
  FileText,
  Plus,
  RefreshCw,
  Calendar,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Pencil
} from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import BackButton from "@/components/ui/BackButton";
import ExpenseModal from "@/components/ExpenseModal";
import { useMyExpenses, useCreateExpense, useUpdateExpense } from '@/hooks/queries/useExpenses';
import { formatISTDate } from '@/utils/luxonUtils';
import type { Expense } from '@/types';

const MyExpenses = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  const { toast } = useToast();
  const { data: expenses = [], isLoading, refetch } = useMyExpenses();
  const createExpenseMutation = useCreateExpense();
  const updateExpenseMutation = useUpdateExpense();

  const handleCreateExpense = async (data: { date: string; item: string; amount: number }) => {
    try {
      await createExpenseMutation.mutateAsync(data);
      toast({
        variant: "success",
        title: "Expense Submitted",
        description: "Your expense has been submitted for review."
      });
      setIsModalOpen(false);
    } catch (error: any) {
      toast({
        variant: "error",
        title: "Submission Failed",
        description: error.response?.data?.message || "Something went wrong"
      });
    }
  };

  const handleUpdateExpense = async (data: { date: string; item: string; amount: number }) => {
    if (!editingExpense) return;
    try {
      await updateExpenseMutation.mutateAsync({ id: editingExpense._id, ...data });
      toast({
        variant: "success",
        title: "Expense Updated",
        description: "Your expense has been updated successfully."
      });
      setEditingExpense(null);
      setIsModalOpen(false);
    } catch (error: any) {
      toast({
        variant: "error",
        title: "Update Failed",
        description: error.response?.data?.message || "Something went wrong"
      });
    }
  };

  const handleEditClick = (expense: Expense) => {
    setEditingExpense(expense);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingExpense(null);
  };

  const handleNewExpense = () => {
    setEditingExpense(null);
    setIsModalOpen(true);
  };

  const filteredExpenses = expenses.filter(exp => 
    exp.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exp.amount.toString().includes(searchTerm)
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 gap-1"><CheckCircle2 size={12} /> Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 gap-1"><XCircle size={12} /> Rejected</Badge>;
      default:
        return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 gap-1"><Clock size={12} /> Pending</Badge>;
    }
  };

  /** Expense is editable only when it hasn't been approved */
  const isEditable = (expense: Expense) => expense.status !== 'approved';

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <BackButton variant="ghost" className="p-0 h-auto hover:bg-transparent" />
              <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">My Expenses</h1>
            </div>
            <p className="text-slate-500 dark:text-slate-400">Track and manage your company expense claims</p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => refetch()}
              disabled={isLoading}
              className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
            >
              <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
            </Button>
            <Button 
              onClick={handleNewExpense}
              className="bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-600/20 gap-2 px-5"
            >
              <Plus size={18} />
              New Expense
            </Button>
          </div>
        </div>

        {/* Stats and Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by description or amount..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-500/50 transition-all dark:text-slate-200"
            />
          </div>
          
          <div className="flex items-center gap-4 text-sm font-medium text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              {expenses.filter(e => e.status === 'pending').length} Pending
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              {expenses.filter(e => e.status === 'approved').length} Approved
            </div>
          </div>
        </div>

        {/* Expenses List */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"></div>
            <p className="text-slate-500 animate-pulse font-medium">Loading your expenses...</p>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <Card className="border-dashed border-2 bg-transparent">
            <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400">
                <FileText size={48} strokeWidth={1.5} />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">No expenses found</h3>
                <p className="text-slate-500 max-w-xs mx-auto">
                  {searchTerm ? "No expenses match your search criteria." : "You haven't submitted any company expenses yet."}
                </p>
              </div>
              {!searchTerm && (
                <Button 
                  onClick={handleNewExpense}
                  variant="outline"
                  className="mt-2 border-amber-200 text-amber-600 hover:bg-amber-50"
                >
                  Submit your first expense
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredExpenses.map((expense) => (
              <Card 
                key={expense._id} 
                className="group hover:shadow-md transition-all duration-200 border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800"
              >
                <div className="p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        <Calendar size={12} />
                        {formatISTDate(expense.date, { customFormat: 'dd MMM yyyy' })}
                      </div>
                      <h3 className="font-bold text-slate-800 dark:text-slate-100 line-clamp-1 group-hover:text-amber-600 transition-colors">
                        {expense.item}
                      </h3>
                    </div>
                    {getStatusBadge(expense.status)}
                  </div>

                  <div className="flex items-end justify-between">
                    <div className="space-y-0.5">
                      <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Amount Claimed</p>
                      <div className="flex items-center text-2xl font-black text-slate-900 dark:text-white">
                        <span className="text-lg opacity-50 mr-1">₹</span>
                        {expense.amount.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>

                  {expense.reviewComment && (
                    <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700">
                      <p className="text-xs font-semibold text-slate-400 uppercase mb-1">HR Note</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 italic">"{expense.reviewComment}"</p>
                    </div>
                  )}
                </div>
                
                <div className="px-5 py-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center text-xs text-slate-400">
                  <span>Submitted {formatISTDate(expense.createdAt, { customFormat: 'dd/MM/yy hh:mm a' })}</span>
                  {isEditable(expense) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditClick(expense)}
                      className="h-7 px-2.5 text-xs gap-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/20 font-semibold"
                    >
                      <Pencil size={12} />
                      Edit
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <ExpenseModal 
        isOpen={isModalOpen} 
        onClose={handleModalClose}
        onSubmit={editingExpense ? handleUpdateExpense : handleCreateExpense}
        isLoading={editingExpense ? updateExpenseMutation.isPending : createExpenseMutation.isPending}
        editingExpense={editingExpense}
      />
    </div>
  );
};

export default MyExpenses;
