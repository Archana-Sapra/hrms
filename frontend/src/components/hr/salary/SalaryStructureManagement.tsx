import React, { useState, FormEvent } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SearchableEmployeeSelect from "../../ui/SearchableEmployeeSelect";
import {
    Plus,
    Search,
    Edit,
    Trash2,
    Save,
    DollarSign,
    Users,
    Building,
    Calculator,
    ChevronLeft,
    ChevronRight
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import useAuth from "../../../hooks/authjwt";
import BackButton from "../../ui/BackButton";
import { formatIndianNumber } from "../../../utils/indianNumber";
import {
    useEmployees,
    useSalaryStructures,
    useEmployeesWithoutStructure,
    useCreateOrUpdateSalaryStructure,
    useDeleteSalaryStructure
} from "../../../hooks/queries";
import { SalaryStructure, Employee, SalaryEarnings } from "../../../types";

interface SalaryStructureManagementProps {
    onBack?: () => void;
}

interface SalaryStructureState {
    basic: string;
    hra: string;
    conveyance: string;
    medical: string;
    lta: string;
    specialAllowance: string;
    mobileAllowance: string;
}

const SalaryStructureManagement: React.FC<SalaryStructureManagementProps> = ({ onBack }) => {
    const [showForm, setShowForm] = useState(false);
    const [editingStructure, setEditingStructure] = useState<SalaryStructure | null>(null);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    // Salary structure form state
    const [salaryStructure, setSalaryStructure] = useState<SalaryStructureState>({
        basic: '',
        hra: '',
        conveyance: '',
        medical: '',
        lta: '',
        specialAllowance: '',
        mobileAllowance: ''
    });

    const { toast } = useToast();
    const confirm = useConfirm();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const user = useAuth();

    // React Query hooks
    const { data: employeesData } = useEmployees();
    const employees: Employee[] = employeesData || [];

    const { data: salaryStructuresData, isLoading: loading } = useSalaryStructures({
        page: currentPage,
        limit: 10,
        ...(searchTerm && { search: searchTerm })
    });

    const salaryStructures: SalaryStructure[] = salaryStructuresData?.salaryStructures || [];
    const pagination = salaryStructuresData?.pagination || {
        page: 1,
        totalPages: 1,
        total: 0,
        limit: 10
    };

    const { data: employeesWithoutStructure = [] } = useEmployeesWithoutStructure();

    // Mutations
    const createOrUpdateMutation = useCreateOrUpdateSalaryStructure();
    const deleteMutation = useDeleteSalaryStructure();

    const getEmployeeName = (structure: SalaryStructure): string => {
        // First try to get name from the populated employee data in the structure
        if (structure.employee && structure.employee.firstName && structure.employee.lastName) {
            return `${structure.employee.firstName} ${structure.employee.lastName}`;
        }

        // Fallback to finding employee from the employees array
        const employee = employees.find(emp => emp.employeeId === structure.employeeId);
        if (employee) {
            return employee.name;
        }

        // Final fallback
        return structure.employeeId || 'Unknown Employee';
    };

    const getEmployeeDetails = (employeeId: string): Employee | null => {
        return employees.find(emp => emp.employeeId === employeeId) || null;
    };

    const calculateGrossSalary = (structure: SalaryStructureState): number => {
        return Object.values(structure).reduce((total, value) => {
            return total + (parseFloat(value) || 0);
        }, 0);
    };

    const handleSalaryStructureChange = (field: keyof SalaryStructureState, value: string) => {
        setSalaryStructure(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleCreateNew = () => {
        setEditingStructure(null);
        setSelectedEmployeeId('');
        setSalaryStructure({
            basic: '',
            hra: '',
            conveyance: '',
            medical: '',
            lta: '',
            specialAllowance: '',
            mobileAllowance: ''
        });
        setShowForm(true);
    };

    const handleEdit = (structure: SalaryStructure) => {
        setEditingStructure(structure);
        setSelectedEmployeeId(structure.employeeId);

        // Convert numbers to strings for inputs
        const earnings = structure.earnings;
        setSalaryStructure({
            basic: String(earnings.basic || ''),
            hra: String(earnings.hra || ''),
            conveyance: String(earnings.conveyance || ''),
            medical: String(earnings.medical || ''),
            lta: String(earnings.lta || ''),
            specialAllowance: String(earnings.specialAllowance || ''),
            mobileAllowance: String(earnings.mobileAllowance || '')
        });

        setShowForm(true);
    };

    const handleDelete = async (structure: SalaryStructure) => {
        const confirmed = await confirm({
            title: 'Delete salary structure?',
            description: `Are you sure you want to delete the salary structure for ${getEmployeeName(structure)}? This action cannot be undone.`,
            confirmText: 'Delete',
            destructive: true,
        });
        if (!confirmed) {
            return;
        }

        try {
            await deleteMutation.mutateAsync(structure.employeeId);
            toast({
                title: "Success",
                description: "Salary structure deleted successfully"
            });
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to delete salary structure",
                variant: "destructive"
            });
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (!selectedEmployeeId || !salaryStructure.basic) {
            toast({
                title: "Error",
                description: "Please select employee and enter basic salary",
                variant: "destructive"
            });
            return;
        }

        // Convert string inputs to SalaryEarnings numbers
        const earnings: SalaryEarnings = {
            basic: parseFloat(salaryStructure.basic) || 0,
            hra: parseFloat(salaryStructure.hra) || 0,
            conveyance: parseFloat(salaryStructure.conveyance) || 0,
            medical: parseFloat(salaryStructure.medical) || 0,
            lta: parseFloat(salaryStructure.lta) || 0,
            specialAllowance: parseFloat(salaryStructure.specialAllowance) || 0,
            mobileAllowance: parseFloat(salaryStructure.mobileAllowance) || 0
        };

        try {
            await createOrUpdateMutation.mutateAsync({
                employeeId: selectedEmployeeId,
                earnings
            });

            toast({
                title: "Success",
                description: editingStructure ? "Salary structure updated successfully" : "Salary structure created successfully"
            });
            setShowForm(false);
            handleFormBack();
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to save salary structure",
                variant: "destructive"
            });
        }
    };

    const handleFormBack = () => {
        setShowForm(false);
        setEditingStructure(null);
        setSelectedEmployeeId('');
        setSalaryStructure({
            basic: '',
            hra: '',
            conveyance: '',
            medical: '',
            lta: '',
            specialAllowance: '',
            mobileAllowance: ''
        });
    };

    const handlePageChange = (newPage: number) => {
        setCurrentPage(newPage);
    };

    const grossSalary = calculateGrossSalary(salaryStructure);

    // Show form component
    if (showForm) {
        return (
            <div className="min-h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="flex items-center gap-4">
                        <Button
                            variant="outline"
                            onClick={handleFormBack}
                            className="dark:border-slate-600 dark:hover:bg-slate-700"
                        >
                            <ChevronLeft className="h-4 w-4 mr-2" />
                            Back
                        </Button>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                                    {editingStructure ? 'Edit Salary Structure' : 'Create Salary Structure'}
                                </h1>
                                <p className="text-slate-600 dark:text-slate-400">
                                    {editingStructure ? 'Update salary structure for employee' : 'Set up salary structure for employee'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Form */}
                    <Card className="border-0 shadow-md bg-white dark:bg-slate-700">
                        <CardHeader className="border-b border-slate-200 dark:border-slate-600">
                            <CardTitle className="text-slate-900 dark:text-slate-100">
                                Salary Structure Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Employee Selection */}
                                <div className="space-y-2">
                                    <Label className="text-slate-700 dark:text-slate-300">Select Employee</Label>
                                    <SearchableEmployeeSelect
                                        employees={editingStructure ? employees : employeesWithoutStructure}
                                        value={selectedEmployeeId}
                                        onValueChange={setSelectedEmployeeId}
                                        disabled={!!editingStructure}
                                        placeholder="Choose an employee"
                                        showEmployeeDetails={true}
                                        className="w-full"
                                    />
                                </div>

                                {/* Employee Details */}
                                {selectedEmployeeId && (
                                    <div className="bg-slate-50 dark:bg-slate-600 p-4 rounded-lg">
                                        <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Employee Details</h4>
                                        {(() => {
                                            const empDetails = getEmployeeDetails(selectedEmployeeId);
                                            return empDetails ? (
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div>
                                                        <p className="text-sm text-slate-600 dark:text-slate-400">Department</p>
                                                        <p className="font-medium text-slate-900 dark:text-slate-100">{empDetails.department || 'N/A'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-slate-600 dark:text-slate-400">Position</p>
                                                        <p className="font-medium text-slate-900 dark:text-slate-100">{empDetails.position || 'N/A'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-slate-600 dark:text-slate-400">Joining Date</p>
                                                        <p className="font-medium text-slate-900 dark:text-slate-100">
                                                            {empDetails.joiningDate ? new Date(empDetails.joiningDate).toLocaleDateString('en-IN') : 'N/A'}
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : null;
                                        })()}
                                    </div>
                                )}

                                {/* Salary Structure */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Earnings Components</h4>

                                        <div className="space-y-2">
                                            <Label className="text-slate-700 dark:text-slate-300">Basic Salary *</Label>
                                            <Input
                                                type="number"
                                                placeholder="Enter basic salary"
                                                value={salaryStructure.basic}
                                                onChange={(e) => handleSalaryStructureChange('basic', e.target.value)}
                                                className="dark:border-slate-600 dark:bg-slate-600 dark:text-slate-100"
                                                required
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-slate-700 dark:text-slate-300">HRA</Label>
                                            <Input
                                                type="number"
                                                placeholder="House Rent Allowance"
                                                value={salaryStructure.hra}
                                                onChange={(e) => handleSalaryStructureChange('hra', e.target.value)}
                                                className="dark:border-slate-600 dark:bg-slate-600 dark:text-slate-100"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-slate-700 dark:text-slate-300">Conveyance Allowance</Label>
                                            <Input
                                                type="number"
                                                placeholder="Travel allowance"
                                                value={salaryStructure.conveyance}
                                                onChange={(e) => handleSalaryStructureChange('conveyance', e.target.value)}
                                                className="dark:border-slate-600 dark:bg-slate-600 dark:text-slate-100"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-slate-700 dark:text-slate-300">Medical Allowance</Label>
                                            <Input
                                                type="number"
                                                placeholder="Medical benefits"
                                                value={salaryStructure.medical}
                                                onChange={(e) => handleSalaryStructureChange('medical', e.target.value)}
                                                className="dark:border-slate-600 dark:bg-slate-600 dark:text-slate-100"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-slate-700 dark:text-slate-300">LTA</Label>
                                            <Input
                                                type="number"
                                                placeholder="Leave Travel Allowance"
                                                value={salaryStructure.lta}
                                                onChange={(e) => handleSalaryStructureChange('lta', e.target.value)}
                                                className="dark:border-slate-600 dark:bg-slate-600 dark:text-slate-100"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-slate-700 dark:text-slate-300">Special Allowance</Label>
                                            <Input
                                                type="number"
                                                placeholder="Special allowance"
                                                value={salaryStructure.specialAllowance}
                                                onChange={(e) => handleSalaryStructureChange('specialAllowance', e.target.value)}
                                                className="dark:border-slate-600 dark:bg-slate-600 dark:text-slate-100"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-slate-700 dark:text-slate-300">Mobile Allowance</Label>
                                            <Input
                                                type="number"
                                                placeholder="Mobile/communication allowance"
                                                value={salaryStructure.mobileAllowance}
                                                onChange={(e) => handleSalaryStructureChange('mobileAllowance', e.target.value)}
                                                className="dark:border-slate-600 dark:bg-slate-600 dark:text-slate-100"
                                            />
                                        </div>
                                    </div>

                                    {/* Summary */}
                                    <div className="space-y-4">
                                        <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Summary</h4>

                                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg space-y-3">
                                            <h5 className="font-semibold text-slate-900 dark:text-slate-100">Salary Breakdown</h5>

                                            {(Object.entries(salaryStructure) as [keyof SalaryStructureState, string][]).map(([key, value]) => {
                                                if (!value || parseFloat(value) === 0) return null;
                                                const labels: Record<string, string> = {
                                                    basic: 'Basic Salary',
                                                    hra: 'HRA',
                                                    conveyance: 'Conveyance',
                                                    medical: 'Medical',
                                                    lta: 'LTA',
                                                    specialAllowance: 'Special Allowance',
                                                    mobileAllowance: 'Mobile Allowance'
                                                };
                                                return (
                                                    <div key={key} className="flex justify-between text-sm">
                                                        <span className="text-slate-600 dark:text-slate-300">{labels[key]}:</span>
                                                        <span className="font-medium text-slate-900 dark:text-slate-100">
                                                            ₹{formatIndianNumber(parseFloat(value))}
                                                        </span>
                                                    </div>
                                                );
                                            })}

                                            <div className="border-t border-blue-200 dark:border-blue-700 pt-2">
                                                <div className="flex justify-between">
                                                    <span className="font-semibold text-slate-900 dark:text-slate-100">Gross Salary:</span>
                                                    <span className="font-bold text-blue-600 dark:text-blue-400 text-lg">
                                                        ₹{formatIndianNumber(grossSalary)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex justify-end gap-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleFormBack}
                                        className="dark:border-slate-600 dark:hover:bg-slate-600"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={createOrUpdateMutation.isPending || !selectedEmployeeId || !salaryStructure.basic}
                                        className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white"
                                    >
                                        {createOrUpdateMutation.isPending ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="h-4 w-4 mr-2" />
                                                {editingStructure ? 'Update Structure' : 'Create Structure'}
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
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
                            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                                    Salary Structure Management
                                </h1>
                                <p className="text-slate-600 dark:text-slate-400">
                                    Manage employee salary structures and components
                                </p>
                            </div>
                        </div>

                        <Button
                            onClick={handleCreateNew}
                            className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Create New Structure
                        </Button>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border-0 shadow-sm bg-white dark:bg-slate-700">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                    <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">Total Structures</p>
                                    <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{pagination.total}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm bg-white dark:bg-slate-700">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                                    <Building className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">Without Structure</p>
                                    <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{employeesWithoutStructure.length}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm bg-white dark:bg-slate-700">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                    <Calculator className="h-5 w-5 text-green-600 dark:text-green-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">Gross Salary</p>
                                    <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                                        ₹{salaryStructures.length > 0 ?
                                            formatIndianNumber(salaryStructures.reduce((sum, s) => sum + s.grossSalary, 0))
                                            : '0'}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Search and Filters */}
                <Card className="border-0 shadow-md bg-white dark:bg-slate-700">
                    <CardHeader className="border-b border-slate-200 dark:border-slate-600">
                        <CardTitle className="text-slate-900 dark:text-slate-100">
                            Search & Filter
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                                    <Input
                                        placeholder="Search by employee name or ID..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10 dark:border-slate-600 dark:bg-slate-600 dark:text-slate-100"
                                    />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Salary Structures Table */}
                <Card className="border-0 shadow-md bg-white dark:bg-slate-700">
                    <CardHeader className="border-b border-slate-200 dark:border-slate-600">
                        <CardTitle className="text-slate-900 dark:text-slate-100">
                            Salary Structures
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        {loading ? (
                            <div className="flex justify-center items-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                            </div>
                        ) : salaryStructures.length === 0 ? (
                            <div className="text-center py-12">
                                <DollarSign className="h-12 w-12 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
                                <p className="text-slate-600 dark:text-slate-400 text-lg">No salary structures found</p>
                                <p className="text-slate-500 dark:text-slate-500 text-sm mt-2">
                                    Create salary structures for your employees
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-slate-200 dark:border-slate-600">
                                                <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">Employee</th>
                                                <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">Department</th>
                                                <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">Basic Salary</th>
                                                <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">Gross Salary</th>
                                                <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">Last Updated</th>
                                                <th className="text-right py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {salaryStructures.map((structure) => {
                                                const employee = getEmployeeDetails(structure.employeeId) || structure.employee;
                                                return (
                                                    <tr key={structure.employeeId} className="border-b border-slate-100 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600">
                                                        <td className="py-3 px-4">
                                                            <div>
                                                                <p className="font-medium text-slate-900 dark:text-slate-100">
                                                                    {getEmployeeName(structure)}
                                                                </p>
                                                                <p className="text-sm text-slate-500 dark:text-slate-400">{structure.employeeId}</p>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-4 text-slate-900 dark:text-slate-100">
                                                            {/* @ts-ignore */}
                                                            {employee?.department || structure.employee?.department || 'N/A'}
                                                        </td>
                                                        <td className="py-3 px-4 text-slate-900 dark:text-slate-100">
                                                            ₹{formatIndianNumber(structure.earnings.basic)}
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <span className="font-semibold text-green-600 dark:text-green-400">
                                                                ₹{formatIndianNumber(structure.grossSalary)}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4 text-slate-900 dark:text-slate-100">
                                                            {structure.updatedAt ? new Date(structure.updatedAt).toLocaleDateString('en-IN') : 'N/A'}
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <div className="flex justify-end gap-2">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleEdit(structure)}
                                                                    className="h-8 w-8 p-0 text-slate-600 hover:text-green-600 dark:text-slate-400 dark:hover:text-green-400"
                                                                    title="Edit"
                                                                >
                                                                    <Edit className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleDelete(structure)}
                                                                    className="h-8 w-8 p-0 text-slate-600 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
                                                                    title="Delete"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
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

export default SalaryStructureManagement;
