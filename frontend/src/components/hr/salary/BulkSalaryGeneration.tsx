import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  Users,
  Calendar,
  FileText,
  CheckCircle,
  AlertCircle,
  Search,
  Calculator
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { useSalaryStructure, useCreateOrUpdateSalarySlip } from "../../../hooks/queries";
import { BulkGenerationResult, MonthOption } from "@/types";

interface Employee {
  _id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  department?: string;
  position?: string;
}

interface BulkSalaryGenerationProps {
  employees?: Employee[];
  onBack: () => void;
}

const BulkSalaryGeneration: React.FC<BulkSalaryGenerationProps> = ({ employees = [], onBack }) => {
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [taxRegime, setTaxRegime] = useState<'old' | 'new'>('new');
  const [enableTaxDeduction, setEnableTaxDeduction] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [generationResults, setGenerationResults] = useState<BulkGenerationResult[]>([]);
  const [showResults, setShowResults] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const { toast } = useToast();
  const createOrUpdateSlipMutation = useCreateOrUpdateSalarySlip();

  // Months array
  const months: MonthOption[] = [
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

  // Filter employees based on search query
  const filteredEmployees = employees.filter(emp =>
    emp && (
      (emp.firstName && emp.firstName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (emp.lastName && emp.lastName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (emp.employeeId && emp.employeeId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (emp.department && emp.department.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  );

  const handleEmployeeSelection = (employeeId: string, checked: boolean): void => {
    if (checked) {
      setSelectedEmployees(prev => [...prev, employeeId]);
    } else {
      setSelectedEmployees(prev => prev.filter(id => id !== employeeId));
    }
  };

  const handleSelectAll = (checked: boolean): void => {
    if (checked) {
      setSelectedEmployees(filteredEmployees.map(emp => emp.employeeId));
    } else {
      setSelectedEmployees([]);
    }
  };

  const generateBulkSalarySlips = async (): Promise<void> => {
    if (selectedEmployees.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one employee",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    const results: BulkGenerationResult[] = [];

    try {
      // Import axios directly for structure check (can't use hooks in loop)
      const axiosInstance = (await import('../../../lib/axios')).default;

      for (const employeeId of selectedEmployees) {
        try {
          const employee = employees.find(emp => emp.employeeId === employeeId);

          // Check if employee has salary structure using axios directly
          let salaryStructure;
          try {
            const { data } = await axiosInstance.get(`/salary-structures/${employeeId}`);
            salaryStructure = data.data;
          } catch (error) {
            // Handle 404 - no salary structure found
            results.push({
              employeeId,
              employeeName: employee ? `${employee.firstName} ${employee.lastName}` : employeeId,
              success: false,
              error: "No salary structure found. Please create salary structure first."
            });
            continue;
          }

          if (!salaryStructure || !salaryStructure.earnings) {
            results.push({
              employeeId,
              employeeName: employee ? `${employee.firstName} ${employee.lastName}` : employeeId,
              success: false,
              error: "No salary structure found. Please create salary structure first."
            });
            continue;
          }

          // Generate salary slip using mutation
          try {
            await createOrUpdateSlipMutation.mutateAsync({
              employeeId,
              month,
              year,
              earnings: salaryStructure.earnings,
              taxRegime,
              enableTaxDeduction
            });

            results.push({
              employeeId,
              employeeName: employee ? `${employee.firstName} ${employee.lastName}` : employeeId,
              success: true,
              error: null
            });
          } catch (slipError) {
            results.push({
              employeeId,
              employeeName: employee ? `${employee.firstName} ${employee.lastName}` : employeeId,
              success: false,
              error: (slipError as Error).message || "Failed to create salary slip"
            });
          }
        } catch (error) {
          const employee = employees.find(emp => emp.employeeId === employeeId);
          results.push({
            employeeId,
            employeeName: employee ? `${employee.firstName} ${employee.lastName}` : employeeId,
            success: false,
            error: (error as Error).message || "Failed to generate salary slip"
          });
        }
      }

      setGenerationResults(results);
      setShowResults(true);

      const successCount = results.filter(r => r.success).length;
      const errorCount = results.filter(r => !r.success).length;

      toast({
        title: "Bulk Generation Complete",
        description: `${successCount} salary slips generated successfully. ${errorCount} failed.`,
        variant: successCount > 0 ? "default" : "destructive"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to generate salary slips",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (showResults) {
    return (
      <div className="min-h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={onBack}
              className="dark:border-slate-600 dark:hover:bg-slate-700"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Management
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                Bulk Generation Results
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Results for {months.find(m => m.value === month)?.label} {year}
              </p>
            </div>
          </div>

          {/* Results */}
          <Card className="border-0 shadow-md bg-white dark:bg-slate-700">
            <CardContent className="p-6">
              <div className="space-y-4">
                {generationResults.map((result, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      result.success
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {result.success ? (
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                      )}
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {result.employeeName}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {result.employeeId}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {result.success ? (
                        <span className="text-green-600 dark:text-green-400 text-sm font-medium">
                          Generated Successfully
                        </span>
                      ) : (
                        <span className="text-red-600 dark:text-red-400 text-sm">
                          {result.error}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={onBack}
            className="dark:border-slate-600 dark:hover:bg-slate-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                Bulk Salary Generation
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Generate salary slips for multiple employees
              </p>
            </div>
          </div>
        </div>

        {/* Configuration */}
        <Card className="border-0 shadow-md bg-white dark:bg-slate-700">
          <CardHeader className="border-b border-slate-200 dark:border-slate-600">
            <CardTitle className="text-slate-900 dark:text-slate-100">
              Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">Month</Label>
                  <Select value={month.toString()} onValueChange={(value) => setMonth(parseInt(value))}>
                    <SelectTrigger className="dark:border-slate-600 dark:bg-slate-600 dark:text-slate-100">
                      <SelectValue placeholder="Select Month" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-800 dark:border-slate-600">
                      {months.map(m => (
                        <SelectItem
                          key={m.value}
                          value={m.value.toString()}
                          className="dark:text-slate-100 dark:focus:bg-slate-700"
                        >
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">Year</Label>
                  <Select value={year.toString()} onValueChange={(value) => setYear(parseInt(value))}>
                    <SelectTrigger className="dark:border-slate-600 dark:bg-slate-600 dark:text-slate-100">
                      <SelectValue placeholder="Select Year" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-800 dark:border-slate-600">
                      {[2023, 2024, 2025, 2026].map(y => (
                        <SelectItem
                          key={y}
                          value={y.toString()}
                          className="dark:text-slate-100 dark:focus:bg-slate-700"
                        >
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">Tax Regime</Label>
                  <Select
                    value={taxRegime}
                    onValueChange={(value: 'old' | 'new') => setTaxRegime(value)}
                    disabled={!enableTaxDeduction}
                  >
                    <SelectTrigger className={`dark:border-slate-600 dark:bg-slate-600 dark:text-slate-100 ${
                      !enableTaxDeduction ? 'opacity-50 cursor-not-allowed' : ''
                    }`}>
                      <SelectValue placeholder="Select Tax Regime" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-800 dark:border-slate-600">
                      <SelectItem value="new" className="dark:text-slate-100 dark:focus:bg-slate-700">
                        New Tax Regime
                      </SelectItem>
                      <SelectItem value="old" className="dark:text-slate-100 dark:focus:bg-slate-700">
                        Old Tax Regime
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {!enableTaxDeduction && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Tax regime selection is disabled when tax deduction is turned off
                    </p>
                  )}
                </div>
              </div>

              {/* Tax Configuration */}
              <div className="border-t border-slate-200 dark:border-slate-600 pt-6">
                <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <Calculator className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <Label className="text-slate-900 dark:text-slate-100 font-medium">Enable Tax Deduction</Label>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Toggle to include or exclude tax calculation for all selected employees
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={() => setEnableTaxDeduction(!enableTaxDeduction)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        enableTaxDeduction
                          ? 'bg-blue-600 dark:bg-blue-500'
                          : 'bg-slate-300 dark:bg-slate-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          enableTaxDeduction ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <span className="ml-3 text-sm font-medium text-slate-900 dark:text-slate-100">
                      {enableTaxDeduction ? 'ON' : 'OFF'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Employee Selection */}
        <Card className="border-0 shadow-md bg-white dark:bg-slate-700">
          <CardHeader className="border-b border-slate-200 dark:border-slate-600">
            <div className="flex items-center justify-between">
              <CardTitle className="text-slate-900 dark:text-slate-100">
                Select Employees ({selectedEmployees.length} selected)
              </CardTitle>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="selectAll"
                  checked={selectedEmployees.length === filteredEmployees.length && filteredEmployees.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <Label htmlFor="selectAll" className="text-sm text-slate-700 dark:text-slate-300">
                  Select All
                </Label>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 h-4 w-4" />
                <Input
                  placeholder="Search employees..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 dark:border-slate-600 dark:bg-slate-600 dark:text-slate-100 dark:placeholder-slate-400"
                />
              </div>
            </div>

            {/* Employee List */}
            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredEmployees.map(employee => (
                <div
                  key={employee.employeeId}
                  className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600"
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id={employee.employeeId}
                      checked={selectedEmployees.includes(employee.employeeId)}
                      onCheckedChange={(checked) => handleEmployeeSelection(employee.employeeId, checked as boolean)}
                    />
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        {employee.firstName} {employee.lastName}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                        <span>{employee.employeeId}</span>
                        <span>{employee.department}</span>
                        <span>{employee.position}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Generate Button */}
        <div className="flex justify-end">
          <Button
            onClick={generateBulkSalarySlips}
            disabled={isGenerating || selectedEmployees.length === 0}
            className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Generating...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Generate Salary Slips ({selectedEmployees.length})
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BulkSalaryGeneration;
