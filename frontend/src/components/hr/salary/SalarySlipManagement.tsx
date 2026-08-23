import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Plus,
    Receipt,
    Users,
    Calendar,
    FileText,
    ChevronLeft,
    ChevronRight
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import useAuth from "../../../hooks/authjwt";
import BackButton from "../../ui/BackButton";
import SalarySlipForm from "./SalarySlipForm";
import SalarySlipCard from "./SalarySlipCard";
import SalarySlipFilters from "./SalarySlipFilters";
import BulkSalaryGeneration from "./BulkSalaryGeneration";
import {
    useEmployees,
    useSalarySlips,
    useDeleteSalarySlip,
    useUpdateSalarySlipStatus
} from "../../../hooks/queries";
import { SalarySlip, Employee, MonthOption } from "../../../types";

interface SalarySlipManagementProps {
    onBack?: () => void;
}

interface FilterState {
    employeeId: string;
    month: number | string;
    year: number;
    search: string;
}

const SalarySlipManagement: React.FC<SalarySlipManagementProps> = ({ onBack }) => {
    const [showForm, setShowForm] = useState(false);
    const [showBulkGeneration, setShowBulkGeneration] = useState(false);
    const [editingSlip, setEditingSlip] = useState<SalarySlip | null>(null);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
    const [currentPage, setCurrentPage] = useState(1);

    // Filters
    const [filters, setFilters] = useState<FilterState>({
        employeeId: 'all',
        month: 'all',
        year: new Date().getFullYear(),
        search: ''
    });

    const { toast } = useToast();
    const confirm = useConfirm();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const user = useAuth();

    // React Query hooks
    const { data: employeesData } = useEmployees();
    const employees: Employee[] = employeesData || [];

    const queryParams = {
        page: currentPage,
        limit: 10,
        ...(filters.employeeId && filters.employeeId !== 'all' && { employeeId: filters.employeeId }),
        ...(filters.month && filters.month !== 'all' && { month: Number(filters.month) }),
        ...(filters.year && { year: filters.year }),
        ...(filters.search && { search: filters.search })
    };

    const { data: salarySlipsData, isLoading: loading } = useSalarySlips(queryParams);

    const salarySlips: SalarySlip[] = salarySlipsData?.salarySlips || [];
    const pagination = salarySlipsData?.pagination || {
        page: 1,
        totalPages: 1,
        total: 0,
        limit: 10
    };

    // Mutations
    const deleteMutation = useDeleteSalarySlip();
    const updateStatusMutation = useUpdateSalarySlipStatus();

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

    const handleFilterChange = (key: string, value: any) => {
        setFilters(prev => ({
            ...prev,
            [key]: value
        }));
        setCurrentPage(1);
    };

    const handleCreateNew = (employeeId: string = '') => {
        setSelectedEmployeeId(employeeId);
        setEditingSlip(null);
        setShowForm(true);
    };

    const handleEdit = (slip: SalarySlip) => {
        setEditingSlip(slip);
        setSelectedEmployeeId('');
        setShowForm(true);
    };

    const handleDelete = async (slip: SalarySlip) => {
        const confirmed = await confirm({
            title: 'Delete salary slip?',
            description: 'Are you sure you want to delete this salary slip? This action cannot be undone.',
            confirmText: 'Delete',
            destructive: true,
        });
        if (!confirmed) {
            return;
        }

        try {
            await deleteMutation.mutateAsync({
                employeeId: slip.employeeId,
                month: slip.month,
                year: slip.year
            });
            toast({
                title: "Success",
                description: "Salary slip deleted successfully"
            });
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to delete salary slip",
                variant: "destructive"
            });
        }
    };

    const handlePublish = async (slip: SalarySlip, newStatus: string) => {
        try {
            await updateStatusMutation.mutateAsync({
                employeeId: slip.employeeId,
                month: slip.month,
                year: slip.year,
                status: newStatus as 'draft' | 'finalized'
            });
            toast({
                title: "Success",
                description: `Salary slip ${newStatus === 'finalized' ? 'published' : 'unpublished'} successfully`
            });
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || `Failed to ${newStatus === 'finalized' ? 'publish' : 'unpublish'} salary slip`,
                variant: "destructive"
            });
        }
    };

    const handlePageChange = (newPage: number) => {
        setCurrentPage(newPage);
    };

    const handleFormBack = () => {
        setShowForm(false);
        setEditingSlip(null);
        setSelectedEmployeeId('');
    };

    const handleBulkGenerationBack = () => {
        setShowBulkGeneration(false);
    };

    const getEmployeeName = (employeeId: string): string => {
        const employee = employees.find(emp => emp.employeeId === employeeId);
        if (employee) {
            return employee.name;
        }
        return employeeId || 'Unknown Employee';
    };

    const getMonthName = (monthNumber: number): string => {
        const month = months.find(m => m.value === monthNumber);
        return month ? month.label : String(monthNumber);
    };

    // Show form component
    if (showForm) {
        return (
            <SalarySlipForm
                employeeId={selectedEmployeeId}
                editData={editingSlip}
                onBack={handleFormBack}
            />
        );
    }

    // Show bulk generation component
    if (showBulkGeneration) {
        return (
            <BulkSalaryGeneration
                employees={employees || []}
                onBack={handleBulkGenerationBack}
            />
        );
    }

    return (
        <div className="min-h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col gap-4">
                    <BackButton onClick={onBack || (() => { })} label="Back" variant="ghost" className="w-auto" />
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                <Receipt className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                                    Salary Slip Management
                                </h1>
                                <p className="text-slate-600 dark:text-slate-400">
                                    Manage and generate salary slips for employees
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <Button
                                onClick={() => setShowBulkGeneration(true)}
                                className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white"
                            >
                                <Users className="h-4 w-4 mr-2" />
                                Bulk Generate
                            </Button>
                            <Button
                                onClick={() => handleCreateNew()}
                                className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Create New
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="border-0 shadow-md bg-white dark:bg-slate-700">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Total Slips</p>
                                    <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                                        {pagination.total}
                                    </p>
                                </div>
                                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                                    <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-md bg-white dark:bg-slate-700">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">This Month</p>
                                    <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                                        {salarySlips.filter(slip => slip.month === new Date().getMonth() + 1).length}
                                    </p>
                                </div>
                                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                                    <Calendar className="h-6 w-6 text-green-600 dark:text-green-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-md bg-white dark:bg-slate-700">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Total Employees</p>
                                    <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                                        {employees.length}
                                    </p>
                                </div>
                                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                                    <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <SalarySlipFilters
                    filters={filters}
                    employees={employees}
                    months={months}
                    onFilterChange={handleFilterChange}
                />

                {/* Salary Slips Grid */}
                <Card className="border-0 shadow-md bg-white dark:bg-slate-700">
                    <CardHeader className="border-b border-slate-200 dark:border-slate-600">
                        <CardTitle className="text-slate-900 dark:text-slate-100">
                            Salary Slips
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        {loading ? (
                            <div className="flex justify-center items-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            </div>
                        ) : salarySlips.length === 0 ? (
                            <div className="text-center py-12">
                                <Receipt className="h-12 w-12 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
                                <p className="text-slate-600 dark:text-slate-400 text-lg">No salary slips found</p>
                                <p className="text-slate-500 dark:text-slate-500 text-sm mt-2">
                                    Create your first salary slip to get started
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {salarySlips.map((slip) => {
                                        const employeeData = employees.find(emp => emp.employeeId === slip.employeeId) || slip.employee;
                                        const employeeName = slip.employee ?
                                            `${slip.employee.firstName || ''} ${slip.employee.lastName || ''}`.trim() :
                                            getEmployeeName(slip.employeeId);

                                        return (
                                            <SalarySlipCard
                                                key={`${slip.employeeId}-${slip.month}-${slip.year}`}
                                                slip={slip}
                                                employeeName={employeeName || slip.employeeId || 'Unknown Employee'}
                                                monthName={getMonthName(slip.month)}
                                                // @ts-ignore
                                                employeeData={employeeData}
                                                onEdit={handleEdit}
                                                onDelete={handleDelete}
                                                onPublish={handlePublish}
                                            />
                                        );
                                    })}
                                </div>

                                {/* Pagination */}
                                {pagination.totalPages > 1 && (
                                    <div className="flex justify-between items-center mt-6 pt-6 border-t border-slate-200 dark:border-slate-600">
                                        <p className="text-sm text-slate-600 dark:text-slate-400">
                                            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                                            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                                            {pagination.total} results
                                        </p>

                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handlePageChange(pagination.page - 1)}
                                                disabled={pagination.page === 1}
                                                className="dark:border-slate-600 dark:hover:bg-slate-600"
                                            >
                                                <ChevronLeft className="h-4 w-4" />
                                            </Button>

                                            <span className="text-sm text-slate-600 dark:text-slate-400 px-3">
                                                Page {pagination.page} of {pagination.totalPages}
                                            </span>

                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handlePageChange(pagination.page + 1)}
                                                disabled={pagination.page === pagination.totalPages}
                                                className="dark:border-slate-600 dark:hover:bg-slate-600"
                                            >
                                                <ChevronRight className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default SalarySlipManagement;
