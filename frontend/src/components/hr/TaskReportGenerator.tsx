import { useState } from 'react';
import { useNavigate } from 'react-router';
import * as XLSX from 'xlsx';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import { ArrowLeft, FileSpreadsheet, Calendar, Users, Download, Sparkles } from 'lucide-react';
import { useEmployees } from '../../hooks/queries';
import axiosInstance from '../../lib/axios';
import type { Employee, ApiResponse } from '@/types';

interface DateRange {
  startDate: string;
  endDate: string;
}

interface ReportDataRow {
  'S.No.': number;
  'Employee Name': string;
  'Summary Report': string;
}

interface TaskReportApiResponse {
  success: boolean;
  data: {
    reports: Array<{
      _id: string;
      date: string;
      tasks: string[];
    }>;
  };
}

interface ChatApiResponse {
  response: string;
}

const TaskReportGenerator = () => {
  const navigate = useNavigate();
  const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: '',
    endDate: ''
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  // React Query hook
  const { data: employeesData, isLoading } = useEmployees();
  const employees = employeesData || [];

  // Filter employees based on search term and exclude inactive employees
  const filteredEmployees = employees
    .filter(emp => emp.status !== 'inactive' && emp.isActive !== false)
    .filter(emp => {
      const name = emp.fullName || emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`.trim();
      const searchLower = searchTerm.toLowerCase();
      return (
        name.toLowerCase().includes(searchLower) ||
        emp.employeeId?.toLowerCase().includes(searchLower) ||
        emp.department?.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      const nameA = a.fullName || a.name || `${a.firstName || ''} ${a.lastName || ''}`.trim();
      const nameB = b.fullName || b.name || `${b.firstName || ''} ${b.lastName || ''}`.trim();
      return nameA.localeCompare(nameB);
    });

  // Handle employee selection
  const handleEmployeeSelection = (employee: Employee) => {
    setSelectedEmployees(prev => {
      const isAlreadySelected = prev.find(emp => emp.employeeId === employee.employeeId);
      if (isAlreadySelected) {
        return prev.filter(emp => emp.employeeId !== employee.employeeId);
      } else {
        return [...prev, employee];
      }
    });
  };

  // Select all filtered employees
  const handleSelectAll = () => {
    setSelectedEmployees(filteredEmployees);
  };

  // Clear all selections
  const handleClearAll = () => {
    setSelectedEmployees([]);
  };

  // Validate form
  const isFormValid = (): boolean => {
    return selectedEmployees.length > 0 && dateRange.startDate !== '' && dateRange.endDate !== '';
  };

  // Clean task data by removing [Pre-lunch] and [Post-lunch] text
  const cleanTasks = (tasks: string[]): string[] => {
    return tasks.map(task => {
      return task
        .replace(/\[Pre-lunch\]/gi, '')
        .replace(/\[Post-lunch\]/gi, '')
        .trim();
    }).filter(task => task.length > 0); // Remove empty tasks after cleaning
  };

  // Generate AI Summary Report
  const generateAIReport = async () => {
    if (!isFormValid()) {
      setError("Please select at least one employee and specify date range.");
      return;
    }

    setIsGeneratingAI(true);
    setError(null);

    try {
      const reportData: ReportDataRow[] = [];
      let serialNumber = 1;

      // Fetch task reports for each selected employee
      for (const employee of selectedEmployees) {
        try {
          const params = {
            employeeId: employee.employeeId,
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
            limit: 1000
          };

          const { data } = await axiosInstance.get<TaskReportApiResponse>('/task-reports', { params });

          if (data.success && data.data.reports && data.data.reports.length > 0) {
            const allTasks = data.data.reports
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .flatMap(report => cleanTasks(report.tasks));

            if (allTasks.length > 0) {
              // Convert bullet points to AI summary
              const bulletPoints = allTasks.map(task => `• ${task}`).join('\n');

              try {
                const { data: aiResponse } = await axiosInstance.post<ChatApiResponse>('/chat', {
                  message: `Summarize this:\n\n${bulletPoints}`,
                  conversation_id: null
                });

                let summary = aiResponse.response;

                // Check if we got the fallback error message and handle it gracefully
                if (!summary || summary.includes("I apologize, but I couldn't generate a proper response")) {
                  // Fallback: Create our own summary by joining tasks intelligently
                  const cleanedTasks = allTasks.slice(0, 10); // Limit to prevent too long summaries
                  summary = `During the specified period, the employee worked on various tasks including: ${cleanedTasks.join(', ').toLowerCase()}. These activities demonstrate consistent engagement with assigned responsibilities and project deliverables.`;
                } else {
                  // Clean up AI response - preserve full summary but clean formatting
                  summary = summary.trim();
                  // Replace multiple newlines with single spaces for Excel compatibility
                  summary = summary.replace(/\n\n+/g, '\n').replace(/\n/g, ' ');
                  // Remove any bullet points that AI might have included
                  summary = summary.replace(/^[•\-\*]\s*/gm, '').replace(/^\d+\.\s*/gm, '');
                }

                reportData.push({
                  'S.No.': serialNumber++,
                  'Employee Name': employee.fullName || employee.name || `${employee.firstName} ${employee.lastName}`,
                  'Summary Report': summary
                });
              } catch (aiError) {
                console.error('AI conversion failed:', aiError);
                // Don't add data if AI fails - let error show
                throw aiError;
              }
            }
          }
        } catch (err) {
          console.error(`Failed to fetch reports for ${employee.fullName || employee.name}:`, err);
        }
      }

      if (reportData.length === 0) {
        setError("No task reports found for the selected employees and date range.");
        return;
      }

      // Create Excel workbook with AI summaries
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(reportData);

      // Set column widths
      const columnWidths = [
        { wch: 8 },  // S.No.
        { wch: 25 }, // Employee Name
        { wch: 60 }  // Summary Report
      ];
      ws['!cols'] = columnWidths;

      // Style the header row
      const headerCells = ['A1', 'B1', 'C1'];
      headerCells.forEach(cell => {
        if (ws[cell]) {
          ws[cell].s = {
            font: { bold: true },
            fill: { bgColor: { indexed: 64 }, fgColor: { rgb: "FFFFFF" } },
            alignment: { horizontal: "center", vertical: "center" }
          };
        }
      });

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, "AI Task Reports");

      // Generate filename with current date
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      const filename = `AI_Task_Reports_${dateRange.startDate}_to_${dateRange.endDate}_${dateStr}.xlsx`;

      // Write and download the file
      XLSX.writeFile(wb, filename);

      // Show success message
      setError(null);

    } catch (err) {
      console.error("Error generating AI report:", err);
      setError("Failed to generate AI report. Please try again.");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Generate Excel report
  const generateReport = async () => {
    if (!isFormValid()) {
      setError("Please select at least one employee and specify date range.");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Prepare data for Excel
      const reportData: ReportDataRow[] = [];
      let serialNumber = 1;

      // Fetch task reports for each selected employee
      for (const employee of selectedEmployees) {
        try {
          const params = {
            employeeId: employee.employeeId,
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
            limit: 1000 // Get all reports in date range
          };

          const { data } = await axiosInstance.get<TaskReportApiResponse>('/task-reports', { params });

          if (data.success && data.data.reports && data.data.reports.length > 0) {
            // Combine all tasks for this employee
            const allTasks = data.data.reports
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .flatMap(report => cleanTasks(report.tasks));

            if (allTasks.length > 0) {
              // Format tasks as bullet points
              const summaryReport = allTasks.map(task => `• ${task}`).join('\n');

              reportData.push({
                'S.No.': serialNumber++,
                'Employee Name': employee.fullName || employee.name || `${employee.firstName} ${employee.lastName}`,
                'Summary Report': summaryReport
              });
            }
          }
        } catch (err) {
          console.error(`Failed to fetch reports for ${employee.fullName || employee.name}:`, err);
          // Continue with other employees even if one fails
        }
      }

      if (reportData.length === 0) {
        setError("No task reports found for the selected employees and date range.");
        return;
      }

      // Create Excel workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(reportData);

      // Set column widths
      const columnWidths = [
        { wch: 8 },  // S.No.
        { wch: 25 }, // Employee Name
        { wch: 60 }  // Summary Report
      ];
      ws['!cols'] = columnWidths;

      // Style the header row
      const headerCells = ['A1', 'B1', 'C1'];
      headerCells.forEach(cell => {
        if (ws[cell]) {
          ws[cell].s = {
            font: { bold: true },
            fill: { bgColor: { indexed: 64 }, fgColor: { rgb: "FFFFFF" } },
            alignment: { horizontal: "center", vertical: "center" }
          };
        }
      });

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, "Task Reports");

      // Generate filename with current date
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      const filename = `Task_Reports_${dateRange.startDate}_to_${dateRange.endDate}_${dateStr}.xlsx`;

      // Write and download the file
      XLSX.writeFile(wb, filename);

      // Show success message
      setError(null);

    } catch (err) {
      console.error("Error generating report:", err);
      setError("Failed to generate report. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/task-reports')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Reports
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <FileSpreadsheet className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
                  Generate Task Reports
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                  Create Excel reports for employee task summaries
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Employee Selection */}
          <div className="lg:col-span-2">
            <Card className="p-6 bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Select Employees
                </h2>
              </div>

              {/* Search and Actions */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <Input
                  placeholder="Search employees by name, ID, or department..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                    disabled={isLoading}
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearAll}
                    disabled={selectedEmployees.length === 0}
                  >
                    Clear All
                  </Button>
                </div>
              </div>

              {/* Selected Count */}
              {selectedEmployees.length > 0 && (
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    {selectedEmployees.length} employee{selectedEmployees.length !== 1 ? 's' : ''} selected
                  </p>
                </div>
              )}

              {/* Employee List */}
              <div className="max-h-96 overflow-y-auto space-y-2">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
                    <span className="ml-2 text-slate-600 dark:text-slate-400">Loading employees...</span>
                  </div>
                ) : filteredEmployees.length === 0 ? (
                  <p className="text-center py-8 text-slate-500 dark:text-slate-400">
                    No employees found matching your search.
                  </p>
                ) : (
                  filteredEmployees.map(employee => {
                    const isSelected = selectedEmployees.find(emp => emp.employeeId === employee.employeeId);
                    return (
                      <div
                        key={employee.employeeId}
                        onClick={() => handleEmployeeSelection(employee)}
                        className={`p-3 border rounded-lg cursor-pointer transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-slate-900 dark:text-slate-100">
                              {employee.fullName || employee.name}
                            </p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              {employee.employeeId} • {employee.department}
                            </p>
                          </div>
                          <div className={`w-4 h-4 rounded border-2 ${
                            isSelected
                              ? 'bg-blue-500 border-blue-500'
                              : 'border-slate-300 dark:border-slate-600'
                          }`}>
                            {isSelected && (
                              <div className="w-full h-full flex items-center justify-center">
                                <div className="w-2 h-2 bg-white rounded-full"></div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          </div>

          {/* Date Range and Generate */}
          <div className="space-y-6">
            {/* Date Range Selection */}
            <Card className="p-6 bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Date Range
                </h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Start Date
                  </label>
                  <Input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    End Date
                  </label>
                  <Input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full"
                    min={dateRange.startDate}
                  />
                </div>
              </div>
            </Card>

            {/* Generate Report */}
            <Card className="p-6 bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-4">
                <Download className="h-5 w-5 text-green-600 dark:text-green-400" />
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Generate Report
                </h2>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              )}

              <div className="space-y-4">
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  <p className="mb-2">Report will include:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Serial number</li>
                    <li>Employee names</li>
                    <li>Task summaries in bullet format</li>
                    <li>Cleaned to remove [Pre-lunch]/[Post-lunch] text labels</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={generateAIReport}
                    disabled={!isFormValid() || isGeneratingAI}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
                  >
                    {isGeneratingAI ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Generating AI Report...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        AI Generate Report
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={generateReport}
                    disabled={!isFormValid() || isGenerating}
                    className="w-full bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                  >
                    {isGenerating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet className="h-4 w-4" />
                        Generate Excel Report
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>

      </div>
    </div>
  );
};

export default TaskReportGenerator;
