import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { FileSpreadsheet, FileText, X } from 'lucide-react';
import { formatISTDate } from '../../utils/luxonUtils';
import { useEmployees, useTaskReports } from '../../hooks/queries';
import type { TaskReportQueryParams } from '@/types';

interface FilterState {
  employeeId: string;
  startDate: string;
  endDate: string;
}

const TaskReportsPage = () => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<FilterState>({
    employeeId: '',
    startDate: '',
    endDate: '',
  });

  // React Query hooks
  const { data: employeesData } = useEmployees();
  const employees = employeesData || [];

  const queryParams: TaskReportQueryParams = {
    page: currentPage,
    limit: 10,
    ...(filters.employeeId && { employeeId: filters.employeeId }),
    ...(filters.startDate && { startDate: filters.startDate }),
    ...(filters.endDate && { endDate: filters.endDate }),
  };

  const { data: reportsData, isLoading, error } = useTaskReports(queryParams);

  // Extract reports and pagination from the response
  const reports = reportsData?.reports || [];
  const pagination = reportsData?.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 };

  const handleFilterChange = (field: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleSearch = () => {
    setCurrentPage(1); // Reset to page 1 on new search
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleEmployeeClick = (employeeId: string) => {
    setFilters(prev => ({ ...prev, employeeId }));
    setCurrentPage(1); // Reset to page 1 when filtering by employee
  };

  const handleClearFilters = () => {
    setFilters({ employeeId: '', startDate: '', endDate: '' });
    setCurrentPage(1);
  };

  const hasActiveFilters = filters.employeeId || filters.startDate || filters.endDate;

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">Employee Task Reports</h1>
              <p className="text-slate-600 dark:text-slate-400">View and manage all employee task reports</p>
            </div>
          </div>
          <Button
            onClick={() => navigate('/task-reports/generate')}
            className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Generate Report
          </Button>
        </div>

        {/* Filter Section */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Filters</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Select
              onValueChange={(value) => handleFilterChange('employeeId', value === "all" ? '' : value)}
              value={filters.employeeId || undefined}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter by Employee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {employees.map(emp => (
                  <SelectItem key={emp.employeeId} value={emp.employeeId}>
                    {emp.fullName || emp.name || `${emp.firstName} ${emp.lastName}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              placeholder="Start Date"
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full"
            />
            <Input
              type="date"
              placeholder="End Date"
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full"
            />
            <div className="flex gap-2">
              <Button
                onClick={handleSearch}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                Search
              </Button>
              {hasActiveFilters && (
                <Button
                  onClick={handleClearFilters}
                  variant="outline"
                  className="border-slate-300 dark:border-slate-600"
                  title="Clear all filters"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Reports Table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Task Reports</h2>
              {filters.employeeId && (
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                  Filtered by employee: {(() => {
                    const emp = employees.find(e => e.employeeId === filters.employeeId);
                    return emp ? (emp.fullName || emp.name || `${emp.firstName} ${emp.lastName}`) : filters.employeeId;
                  })()}
                </p>
              )}
            </div>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {pagination.total} {pagination.total === 1 ? 'report' : 'reports'} found
            </span>
          </div>
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
                  Loading reports...
                </div>
              </div>
            ) : error ? (
              <div className="p-8 text-center text-red-600 dark:text-red-400">
                {error instanceof Error ? error.message : 'Failed to load reports'}
              </div>
            ) : (
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-600">
                <thead className="bg-slate-50 dark:bg-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                      Tasks
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-600">
                  {reports.length > 0 ? reports.map(report => (
                    <tr
                      key={report._id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      onClick={() => report.employee?.employeeId && handleEmployeeClick(report.employee.employeeId)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400">
                          {report.employee?.firstName} {report.employee?.lastName}
                        </div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                          {report.employee?.employeeId}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
                        {formatISTDate(report.date, { customFormat: 'dd MMMM yyyy' })}
                      </td>
                      <td className="px-6 py-4">
                        <ul className="list-disc list-inside space-y-1 text-sm text-slate-700 dark:text-slate-300">
                          {report.tasks.map((task, index) => <li key={index}>{task}</li>)}
                        </ul>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={3} className="text-center py-10 text-slate-500 dark:text-slate-400">
                        No reports found for the selected criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Pagination Controls */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <span className="text-sm text-slate-600 dark:text-slate-400 text-center sm:text-left">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <div className="flex gap-2 justify-center sm:justify-end">
            <Button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1 || isLoading}
              variant="outline"
              className="border-slate-300 dark:border-slate-600"
            >
              Previous
            </Button>
            <Button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || isLoading}
              variant="outline"
              className="border-slate-300 dark:border-slate-600"
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskReportsPage;