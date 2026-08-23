import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Receipt,
  Download,
  Calendar,
  DollarSign,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import useAuth from "../../hooks/authjwt";
import { downloadSalarySlipPDF } from "../../utils/pdfGenerator";
import { formatIndianNumber } from "../../utils/indianNumber";
import { useProfile, useEmployeeSalarySlips } from "../../hooks/queries";

// Types
interface SalarySlip {
  employeeId: string;
  month: number;
  year: number;
  status: 'draft' | 'finalized';
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  taxRegime?: 'old' | 'new';
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

interface MonthOption {
  value: 'all' | number;
  label: string;
}

interface QueryParams {
  page: number;
  limit: number;
  year?: number;
  month?: number;
}

const MySalarySlips: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState<'all' | number>('all');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 12;

  const { toast } = useToast();
  const user = useAuth();

  // Fetch employee profile - useProfile returns Employee object directly
  const { data: employeeData } = useProfile();

  // Build query params
  const queryParams: QueryParams = useMemo(() => ({
    page: currentPage,
    limit: itemsPerPage,
    ...(selectedYear && { year: selectedYear }),
    ...(selectedMonth !== 'all' && { month: selectedMonth as number })
  }), [currentPage, selectedYear, selectedMonth]);

  // Fetch salary slips
  const { data: salarySlipsData, isLoading: loading } = useEmployeeSalarySlips(
    user?.employeeId,
    queryParams,
    { enabled: !!user?.employeeId }
  );

  const salarySlips: SalarySlip[] = salarySlipsData?.data?.salarySlips || [];
  const pagination: Pagination = salarySlipsData?.data?.pagination || {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 12
  };

  // Months array
  const months: MonthOption[] = [
    { value: 'all', label: 'All Months' },
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  const handleDownloadPDF = (slip: SalarySlip): void => {
    try {
      const employeeName = employeeData ? `${employeeData.firstName} ${employeeData.lastName}` : user?.name || 'Employee';
      const monthName = months.find(m => m.value === slip.month)?.label || `Month ${slip.month}`;
      downloadSalarySlipPDF(slip, employeeName, monthName, employeeData);

      toast({
        title: "Success",
        description: "PDF download initiated"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download PDF",
        variant: "destructive"
      });
    }
  };

  const handlePageChange = (newPage: number): void => {
    setCurrentPage(newPage);
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Modern Header with Gradient Background */}
        <div className="relative overflow-hidden bg-white dark:bg-slate-800 rounded-2xl shadow-xl mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-blue-600 opacity-90"></div>
          <div className="relative px-6 py-8 sm:px-8 sm:py-12">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="p-4 bg-white/20 backdrop-blur-sm rounded-xl">
                <Receipt className="h-8 w-8 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                  My Salary Slips
                </h1>
                <p className="text-emerald-100 text-lg">
                  Access and download your payroll documents
                </p>
                {employeeData && (
                  <div className="mt-3 flex items-center gap-4 text-sm text-white/90">
                    <span>Employee ID: {employeeData.employeeId}</span>
                    <span>•</span>
                    <span>{employeeData.firstName} {employeeData.lastName}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
              <Search className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
              Filter Salary Slips
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Month</Label>
              <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(value === 'all' ? 'all' : parseInt(value))}>
                <SelectTrigger className="h-11 border-slate-200 dark:border-slate-600 focus:border-emerald-500 dark:focus:border-emerald-400">
                  <SelectValue placeholder="Select Month" />
                </SelectTrigger>
                <SelectContent>
                  {months.map(month => (
                    <SelectItem key={month.value} value={month.value.toString()}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Year</Label>
              <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                <SelectTrigger className="h-11 border-slate-200 dark:border-slate-600 focus:border-emerald-500 dark:focus:border-emerald-400">
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                  {[2023, 2024, 2025, 2026].map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Salary Slips Section */}
        <div className="space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-200 border-t-emerald-600"></div>
                <div className="absolute inset-0 rounded-full bg-emerald-100 dark:bg-emerald-900/20 blur-sm"></div>
              </div>
              <p className="text-slate-600 dark:text-slate-400 mt-4 font-medium">
                Loading your salary slips...
              </p>
            </div>
          ) : salarySlips.length === 0 ? (
            <div className="text-center py-16">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-blue-500 rounded-full blur-lg opacity-20"></div>
                <div className="relative p-6 bg-white dark:bg-slate-800 rounded-full">
                  <Receipt className="h-16 w-16 text-slate-400 dark:text-slate-500 mx-auto" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mt-6 mb-2">
                No salary slips found
              </h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                {selectedMonth !== 'all' || selectedYear !== new Date().getFullYear()
                  ? 'Try adjusting your filter criteria to find salary slips.'
                  : 'Your salary slips will appear here once they are published by HR.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {salarySlips.map((slip) => (
                <div
                  key={`${slip.employeeId}-${slip.month}-${slip.year}`}
                  className="group relative bg-white dark:bg-slate-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-slate-200 dark:border-slate-700"
                >
                  {/* Status Badge */}
                  <div className="absolute -top-2 -right-2 z-10">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${
                      slip.status === 'finalized'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-amber-500 text-white'
                    }`}>
                      {slip.status === 'finalized' ? '✓ Published' : '⏳ Draft'}
                    </span>
                  </div>

                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">
                          {months.find(m => m.value === slip.month)?.label || `Month ${slip.month}`} {slip.year}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                          <Calendar className="h-4 w-4" />
                          <span>ID: {slip.employeeId}</span>
                        </div>
                      </div>

                      {slip.status === 'finalized' && (
                        <Button
                          onClick={() => handleDownloadPDF(slip)}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                          size="sm"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      )}
                    </div>

                    {/* Salary Cards */}
                    <div className="space-y-4">
                      {/* Gross Salary - Featured */}
                      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-400 to-emerald-600 p-4 rounded-lg text-white">
                        <div className="relative z-10">
                          <p className="text-emerald-100 font-medium text-sm mb-1">
                            Gross Salary
                          </p>
                          <p className="text-2xl font-bold">
                            ₹{formatIndianNumber(slip.grossSalary)}
                          </p>
                        </div>
                        <DollarSign className="absolute -top-2 -right-2 h-16 w-16 text-white/10" />
                      </div>

                      {/* Deductions and Net */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-100 dark:border-red-800">
                          <p className="text-red-600 dark:text-red-400 font-medium text-sm mb-1">
                            Deductions
                          </p>
                          <p className="text-lg font-bold text-red-700 dark:text-red-300">
                            ₹{formatIndianNumber(slip.totalDeductions)}
                          </p>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                          <p className="text-blue-600 dark:text-blue-400 font-medium text-sm mb-1">
                            Net Pay
                          </p>
                          <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                            ₹{formatIndianNumber(slip.netSalary)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-600">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          Tax Regime: {slip.taxRegime?.toUpperCase() || 'NEW'}
                        </span>
                        {slip.status !== 'finalized' && (
                          <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                            Pending approval
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 mt-8">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to{' '}
                  {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of{' '}
                  {pagination.totalItems} salary slips
                </p>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={pagination.currentPage === 1}
                    className="border-slate-200 dark:border-slate-600"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      Page {pagination.currentPage} of {pagination.totalPages}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={pagination.currentPage === pagination.totalPages}
                    className="border-slate-200 dark:border-slate-600"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MySalarySlips;
