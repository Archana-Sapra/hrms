import React, { useState, useEffect, FormEvent } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import SearchableEmployeeSelect from "../../ui/SearchableEmployeeSelect";
import {
    ArrowLeft,
    Download,
    Calculator,
    DollarSign,
    Receipt,
    Save,
    User,
    Minus,
    Plus,
    Trash2,
    Info
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { downloadSalarySlipPDF } from "../../../utils/pdfGenerator";
import { formatIndianNumber } from "../../../utils/indianNumber";
import {
    useEmployees,
    useSalaryStructure,
    useTaxCalculation,
    useCreateOrUpdateSalaryStructure,
    useCreateOrUpdateSalarySlip
} from "../../../hooks/queries";
import { SalarySlip, Employee, SalaryEarnings } from "../../../types";

interface SalarySlipFormProps {
    employeeId?: string;
    onBack?: () => void;
    editData?: SalarySlip | null;
}

interface CustomDeductionState {
    name: string;
    amount: string;
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

const SalarySlipForm: React.FC<SalarySlipFormProps> = ({ employeeId: propEmployeeId, onBack, editData = null }) => {
    const [selectedEmployee, setSelectedEmployee] = useState<string>(propEmployeeId || '');
    const [employeeDetails, setEmployeeDetails] = useState<Employee | null>(null);
    const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
    const [year, setYear] = useState<number>(new Date().getFullYear());
    const [taxRegime, setTaxRegime] = useState<'old' | 'new'>('new');
    const [enableTaxDeduction, setEnableTaxDeduction] = useState<boolean>(true);
    const [activeTab, setActiveTab] = useState('employee');

    // Salary structure state
    const [salaryStructure, setSalaryStructure] = useState<SalaryStructureState>({
        basic: '',
        hra: '',
        conveyance: '',
        medical: '',
        lta: '',
        specialAllowance: '',
        mobileAllowance: ''
    });

    const [salarySlip, setSalarySlip] = useState<SalarySlip | null>(null);
    const [isEditing, setIsEditing] = useState(!!editData);

    // Deductions state
    const [customDeductions, setCustomDeductions] = useState<CustomDeductionState[]>([]);

    const { toast } = useToast();

    // React Query hooks
    const { data: employeesData, isLoading: employeesLoading } = useEmployees();
    const employees: Employee[] = employeesData || [];

    const { data: salaryStructureData } = useSalaryStructure(selectedEmployee, {
        enabled: !!selectedEmployee
    });

    // Calculate gross salary
    const calculateGrossSalary = (): number => {
        return Object.values(salaryStructure).reduce((total, value) => {
            return total + (parseFloat(value) || 0);
        }, 0);
    };

    const grossSalary = calculateGrossSalary();
    const { data: taxCalculationData } = useTaxCalculation(grossSalary, taxRegime, {
        enabled: grossSalary > 0 && enableTaxDeduction
    });
    const taxCalculation = taxCalculationData || null;

    // Mutations
    const createOrUpdateStructureMutation = useCreateOrUpdateSalaryStructure();
    const createOrUpdateSlipMutation = useCreateOrUpdateSalarySlip();

    // Months array for dropdown
    const months = [
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

    // Calculate total custom deductions
    const calculateCustomDeductions = (): number => {
        return customDeductions.reduce((total, deduction) => {
            return total + (parseFloat(deduction.amount) || 0);
        }, 0);
    };

    // Convert amount to words
    const convertToWords = (amount: number): string => {
        const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
        const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
        const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

        function convertThreeDigit(num: number): string {
            let result = '';
            if (num >= 100) {
                result += ones[Math.floor(num / 100)] + ' Hundred ';
                num %= 100;
            }
            if (num >= 20) {
                result += tens[Math.floor(num / 10)] + ' ';
                num %= 10;
            } else if (num >= 10) {
                result += teens[num - 10] + ' ';
                num = 0;
            }
            if (num > 0) {
                result += ones[num] + ' ';
            }
            return result;
        }

        if (amount === 0) return 'Zero Rupees Only';

        let rupees = Math.floor(amount);
        let result = '';

        if (rupees >= 10000000) {
            result += convertThreeDigit(Math.floor(rupees / 10000000)) + 'Crore ';
            rupees %= 10000000;
        }
        if (rupees >= 100000) {
            result += convertThreeDigit(Math.floor(rupees / 100000)) + 'Lakh ';
            rupees %= 100000;
        }
        if (rupees >= 1000) {
            result += convertThreeDigit(Math.floor(rupees / 1000)) + 'Thousand ';
            rupees %= 1000;
        }
        if (rupees > 0) {
            result += convertThreeDigit(rupees);
        }

        result += 'Rupees Only';
        return result.trim();
    };

    // Load employee details when employee is selected or employees list is loaded
    useEffect(() => {
        if (selectedEmployee && employees.length > 0) {
            const employee = employees.find(emp => emp.employeeId === selectedEmployee);
            if (employee) {
                setEmployeeDetails(employee);
            } else {
                toast({
                    title: "Warning",
                    description: "Employee details not found",
                    variant: "destructive"
                });
            }
        }
    }, [selectedEmployee, employees, toast]);

    // Load salary structure from React Query when employee is selected (if not editing)
    useEffect(() => {
        if (salaryStructureData && !isEditing) {
            const earnings = salaryStructureData.earnings;
            setSalaryStructure({
                basic: String(earnings.basic || ''),
                hra: String(earnings.hra || ''),
                conveyance: String(earnings.conveyance || ''),
                medical: String(earnings.medical || ''),
                lta: String(earnings.lta || ''),
                specialAllowance: String(earnings.specialAllowance || ''),
                mobileAllowance: String(earnings.mobileAllowance || '')
            });
        }
    }, [salaryStructureData, isEditing]);

    // Load existing salary slip data if editing
    useEffect(() => {
        if (editData) {
            setSelectedEmployee(editData.employeeId);
            setMonth(editData.month);
            setYear(editData.year);
            setTaxRegime(editData.taxRegime || 'new');
            setEnableTaxDeduction(editData.enableTaxDeduction !== undefined ? editData.enableTaxDeduction : true);

            const earnings = editData.earnings;
            setSalaryStructure({
                basic: String(earnings.basic || ''),
                hra: String(earnings.hra || ''),
                conveyance: String(earnings.conveyance || ''),
                medical: String(earnings.medical || ''),
                lta: String(earnings.lta || ''),
                specialAllowance: String(earnings.specialAllowance || ''),
                mobileAllowance: String(earnings.mobileAllowance || '')
            });

            const customDeductions = editData.deductions?.customDeductions?.map(d => ({
                name: d.name,
                amount: String(d.amount)
            })) || [];

            setCustomDeductions(customDeductions);
            setIsEditing(true);
        }
    }, [editData]);


    const handleSalaryStructureChange = (field: keyof SalaryStructureState, value: string) => {
        setSalaryStructure(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Custom deductions handlers
    const addCustomDeduction = () => {
        setCustomDeductions(prev => [...prev, { name: '', amount: '' }]);
    };

    const removeCustomDeduction = (index: number) => {
        setCustomDeductions(prev => prev.filter((_, i) => i !== index));
    };

    const updateCustomDeduction = (index: number, field: keyof CustomDeductionState, value: string) => {
        setCustomDeductions(prev =>
            prev.map((deduction, i) =>
                i === index ? { ...deduction, [field]: value } : deduction
            )
        );
    };

    const saveSalaryStructure = async () => {
        if (!selectedEmployee || !salaryStructure.basic) {
            toast({
                title: "Error",
                description: "Please select employee and enter basic salary",
                variant: "destructive"
            });
            return;
        }

        // Convert structure to numbers
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
            await createOrUpdateStructureMutation.mutateAsync({
                employeeId: selectedEmployee,
                earnings
            });

            toast({
                title: "Success",
                description: "Salary structure saved successfully"
            });
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to save salary structure",
                variant: "destructive"
            });
        }
    };

    const handleSubmit = async () => { // Removed event because it might be called from button click directly without form submission
        if (!selectedEmployee || !salaryStructure.basic) {
            toast({
                title: "Error",
                description: "Please select employee and enter basic salary",
                variant: "destructive"
            });
            return;
        }

        // Convert structure to numbers
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
            // First save/update salary structure
            await createOrUpdateStructureMutation.mutateAsync({
                employeeId: selectedEmployee,
                earnings
            });

            // Then create/update salary slip
            const response = await createOrUpdateSlipMutation.mutateAsync({
                employeeId: selectedEmployee,
                month,
                year,
                earnings,
                deductions: {
                    customDeductions: customDeductions
                        .filter(d => d.name && d.amount)
                        .map(d => ({ name: d.name, amount: parseFloat(d.amount) || 0 }))
                },
                taxRegime,
                enableTaxDeduction
            });

            setSalarySlip(response);
            toast({
                title: "Success",
                description: isEditing ? "Salary slip updated successfully" : "Salary slip created successfully"
            });
            setActiveTab('preview');
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to save salary slip",
                variant: "destructive"
            });
        }
    };

    const downloadPDF = () => {
        try {
            if (!salarySlip) {
                toast({
                    title: "Error",
                    description: "No salary slip data available for download",
                    variant: "destructive"
                });
                return;
            }

            if (!employeeDetails) {
                toast({
                    title: "Error",
                    description: "Employee details not loaded",
                    variant: "destructive"
                });
                return;
            }

            // Get employee name - handle both name and firstName/lastName formats
            const employeeName = employeeDetails.name || 
                `${employeeDetails.firstName || ''} ${employeeDetails.lastName || ''}`.trim() || 
                employeeDetails.employeeId;
            const monthName = months.find(m => m.value === month)?.label || String(month);

            // Inject employee details if missing in slip - map Employee type to EmployeeInfo type
            const slipWithDetails = {
                ...salarySlip,
                employee: salarySlip.employee || {
                    firstName: employeeDetails.firstName || employeeDetails.name?.split(' ')[0] || '',
                    lastName: employeeDetails.lastName || employeeDetails.name?.split(' ').slice(1).join(' ') || '',
                    employeeId: employeeDetails.employeeId,
                    department: employeeDetails.department,
                    position: employeeDetails.position,
                    email: employeeDetails.email,
                    bankName: employeeDetails.bankDetails?.bankName,
                    bankAccountNumber: employeeDetails.bankDetails?.accountNumber,
                    panNumber: employeeDetails.bankDetails?.panNumber || employeeDetails.govtId?.pan,
                    joiningDate: employeeDetails.joiningDate
                }
            };

            downloadSalarySlipPDF(slipWithDetails, employeeName, monthName, {
                firstName: employeeDetails.firstName || employeeDetails.name?.split(' ')[0] || '',
                lastName: employeeDetails.lastName || employeeDetails.name?.split(' ').slice(1).join(' ') || '',
                companyName: employeeDetails.companyName,
                department: employeeDetails.department,
                position: employeeDetails.position,
                bankName: employeeDetails.bankDetails?.bankName,
                bankAccountNumber: employeeDetails.bankDetails?.accountNumber,
                panNumber: employeeDetails.bankDetails?.panNumber || employeeDetails.govtId?.pan,
                joiningDate: employeeDetails.joiningDate
            });

            toast({
                title: "Success",
                description: "PDF generation initiated"
            });
        } catch (error) {
            console.error('Error downloading PDF:', error);
            toast({
                title: "Error",
                description: "Failed to generate PDF",
                variant: "destructive"
            });
        }
    };

    const customDeductionsTotal = calculateCustomDeductions();
    const taxAmount = enableTaxDeduction ? (taxCalculation?.monthlyTax || 0) : 0;
    const netSalary = grossSalary - taxAmount - customDeductionsTotal;

    return (
        <div className="min-h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-3 sm:p-6">
            <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                    <Button
                        variant="outline"
                        onClick={onBack}
                        className="self-start dark:border-slate-600 dark:hover:bg-slate-700"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <Receipt className="h-4 w-4 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
                                {isEditing ? 'Edit Salary Slip' : 'Create Salary Slip'}
                            </h1>
                            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
                                {isEditing ? 'Update existing salary slip' : 'Generate a new salary slip for employee'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
                    <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-0 dark:bg-slate-700">
                        <TabsTrigger value="employee" className="dark:data-[state=active]:bg-slate-600 text-xs sm:text-sm">
                            <span className="hidden sm:inline">Employee & Period</span>
                            <span className="sm:hidden">Employee</span>
                        </TabsTrigger>
                        <TabsTrigger value="salary" className="dark:data-[state=active]:bg-slate-600 text-xs sm:text-sm">
                            <span className="hidden sm:inline">Salary Structure</span>
                            <span className="sm:hidden">Salary</span>
                        </TabsTrigger>
                        <TabsTrigger value="preview" className="dark:data-[state=active]:bg-slate-600 text-xs sm:text-sm">
                            <span className="hidden sm:inline">Preview & Generate</span>
                            <span className="sm:hidden">Preview</span>
                        </TabsTrigger>
                    </TabsList>

                    {/* Employee Selection Tab */}
                    <TabsContent value="employee" className="space-y-6">
                        <Card className="border-0 shadow-md bg-white dark:bg-slate-700">
                            <CardHeader className="border-b border-slate-200 dark:border-slate-600">
                                <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                                    <User className="h-5 w-5" />
                                    Employee Selection
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 space-y-6">
                                {/* Employee Selection - Fixed Layout */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-slate-700 dark:text-slate-300">Select Employee</Label>
                                        <SearchableEmployeeSelect
                                            employees={employees}
                                            value={selectedEmployee}
                                            onValueChange={setSelectedEmployee}
                                            disabled={employeesLoading || isEditing}
                                            placeholder={employeesLoading ? "Loading employees..." : "Choose an employee"}
                                            showEmployeeDetails={true}
                                            className="w-full"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
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
                                    </div>
                                </div>

                                {/* Employee Details Display */}
                                {employeeDetails && (
                                    <div className="border-t border-slate-200 dark:border-slate-600 pt-6">
                                        <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                                            Employee Information
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            <div className="bg-slate-50 dark:bg-slate-600 p-3 rounded-lg">
                                                <p className="text-sm text-slate-600 dark:text-slate-400">Full Name</p>
                                                <p className="font-medium text-slate-900 dark:text-slate-100">
                                                    {employeeDetails.name || `${employeeDetails.firstName || ''} ${employeeDetails.lastName || ''}`.trim() || 'N/A'}
                                                </p>
                                            </div>
                                            <div className="bg-slate-50 dark:bg-slate-600 p-3 rounded-lg">
                                                <p className="text-sm text-slate-600 dark:text-slate-400">Email</p>
                                                <p className="font-medium text-slate-900 dark:text-slate-100">{employeeDetails.email || 'N/A'}</p>
                                            </div>
                                            <div className="bg-slate-50 dark:bg-slate-600 p-3 rounded-lg">
                                                <p className="text-sm text-slate-600 dark:text-slate-400">Department</p>
                                                <p className="font-medium text-slate-900 dark:text-slate-100">{employeeDetails.department || 'N/A'}</p>
                                            </div>
                                            <div className="bg-slate-50 dark:bg-slate-600 p-3 rounded-lg">
                                                <p className="text-sm text-slate-600 dark:text-slate-400">Position</p>
                                                <p className="font-medium text-slate-900 dark:text-slate-100">{employeeDetails.position || 'N/A'}</p>
                                            </div>
                                            <div className="bg-slate-50 dark:bg-slate-600 p-3 rounded-lg">
                                                <p className="text-sm text-slate-600 dark:text-slate-400">Bank Name</p>
                                                <p className="font-medium text-slate-900 dark:text-slate-100">
                                                    {employeeDetails.bankName || employeeDetails.bankDetails?.bankName || 'N/A'}
                                                </p>
                                            </div>
                                            <div className="bg-slate-50 dark:bg-slate-600 p-3 rounded-lg">
                                                <p className="text-sm text-slate-600 dark:text-slate-400">Joining Date</p>
                                                <p className="font-medium text-slate-900 dark:text-slate-100">
                                                    {(() => {
                                                        const joiningDate = employeeDetails.joiningDate;
                                                        return joiningDate ? new Date(joiningDate).toLocaleDateString('en-IN') : 'N/A';
                                                    })()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-end">
                                    <Button
                                        onClick={() => setActiveTab('salary')}
                                        disabled={!selectedEmployee}
                                        className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white"
                                    >
                                        Next: Salary Structure
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Salary Structure Tab */}
                    <TabsContent value="salary" className="space-y-6">
                        <Card className="border-0 shadow-md bg-white dark:bg-slate-700">
                            <CardHeader className="border-b border-slate-200 dark:border-slate-600">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                                        <DollarSign className="h-5 w-5" />
                                        Salary Structure
                                    </CardTitle>
                                    <Button
                                        onClick={saveSalaryStructure}
                                        disabled={createOrUpdateStructureMutation.isPending || !selectedEmployee || !salaryStructure.basic}
                                        variant="outline"
                                        className="dark:border-slate-600 dark:hover:bg-slate-600"
                                    >
                                        {createOrUpdateStructureMutation.isPending ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-600 mr-2"></div>
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="h-4 w-4 mr-2" />
                                                Save Structure
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6 space-y-8">
                                {/* Earnings Section */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-600 pb-3">
                                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                            <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                                        </div>
                                        <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Earnings Components</h4>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                                        <div className="space-y-2">
                                            <Label className="text-slate-700 dark:text-slate-300">Basic Salary *</Label>
                                            <Input
                                                type="number"
                                                placeholder="Enter basic salary"
                                                value={salaryStructure.basic}
                                                onChange={(e) => handleSalaryStructureChange('basic', e.target.value)}
                                                className="dark:border-slate-600 dark:bg-slate-600 dark:text-slate-100"
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
                                </div>

                                {/* Custom Deductions Section */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-600 pb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                                                <Minus className="h-5 w-5 text-red-600 dark:text-red-400" />
                                            </div>
                                            <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Custom Deductions</h4>
                                        </div>
                                        <Button
                                            type="button"
                                            onClick={addCustomDeduction}
                                            variant="outline"
                                            size="sm"
                                            className="dark:border-slate-600 dark:hover:bg-slate-600 bg-red-50 hover:bg-red-100 border-red-200 text-red-700 hover:text-red-800 dark:bg-red-900/20 dark:border-red-700 dark:text-red-300"
                                        >
                                            <Plus className="h-4 w-4 mr-2" />
                                            Add Deduction
                                        </Button>
                                    </div>

                                    {customDeductions.length > 0 ? (
                                        <div className="space-y-3">
                                            {customDeductions.map((deduction, index) => (
                                                <div key={index} className="flex gap-3 items-center p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg">
                                                    <div className="flex-1">
                                                        <Input
                                                            placeholder="Deduction name (e.g., Leave deduction, Penalty)"
                                                            value={deduction.name}
                                                            onChange={(e) => updateCustomDeduction(index, 'name', e.target.value)}
                                                            className="border-red-300 dark:border-red-600 bg-white dark:bg-slate-700 focus:border-red-500 dark:focus:border-red-400"
                                                        />
                                                    </div>
                                                    <div className="w-32">
                                                        <Input
                                                            type="number"
                                                            placeholder="Amount"
                                                            value={deduction.amount}
                                                            onChange={(e) => updateCustomDeduction(index, 'amount', e.target.value)}
                                                            className="border-red-300 dark:border-red-600 bg-white dark:bg-slate-700 focus:border-red-500 dark:focus:border-red-400"
                                                        />
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        onClick={() => removeCustomDeduction(index)}
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-100 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/30 h-10 w-10 p-0"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                                            <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                                                <Minus className="h-8 w-8" />
                                            </div>
                                            <p className="text-sm font-medium mb-1">No deductions added</p>
                                            <p className="text-xs">Click "Add Deduction" to add leave cuts, penalties, or other deductions</p>
                                        </div>
                                    )}
                                </div>

                                {/* Tax Configuration & Summary Section */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Tax Configuration */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-600 pb-3">
                                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                                <Calculator className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Tax Configuration</h4>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-6 w-6 p-0 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
                                                            title="Tax Calculation Details"
                                                        >
                                                            <Info className="h-4 w-4" />
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-96 p-4 dark:bg-slate-800 dark:border-slate-600">
                                                        <div className="space-y-4">
                                                            <h5 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Tax Calculation Configuration</h5>

                                                            <div className="space-y-3 text-sm">
                                                                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                                                                    <h6 className="font-medium text-blue-800 dark:text-blue-200 mb-2">New Tax Regime (Default)</h6>
                                                                    <ul className="space-y-1 text-blue-700 dark:text-blue-300">
                                                                        <li>• Standard Deduction: ₹75,000</li>
                                                                        <li>• Up to ₹3,00,000: 0%</li>
                                                                        <li>• ₹3,00,001 - ₹7,00,000: 5%</li>
                                                                        <li>• ₹7,00,001 - ₹10,00,000: 10%</li>
                                                                        <li>• ₹10,00,001 - ₹12,00,000: 15%</li>
                                                                        <li>• ₹12,00,001 - ₹15,00,000: 20%</li>
                                                                        <li>• Above ₹15,00,000: 30%</li>
                                                                        <li>• Rebate: ₹25,000 (income ≤ ₹7,00,000)</li>
                                                                        <li>• Health & Education Cess: 4%</li>
                                                                    </ul>
                                                                </div>

                                                                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                                                                    <h6 className="font-medium text-green-800 dark:text-green-200 mb-2">Old Tax Regime</h6>
                                                                    <ul className="space-y-1 text-green-700 dark:text-green-300">
                                                                        <li>• Standard Deduction: ₹50,000</li>
                                                                        <li>• Section 80C Deduction: 10% of income (max ₹1,50,000)</li>
                                                                        <li>• Up to ₹2,50,000: 0%</li>
                                                                        <li>• ₹2,50,001 - ₹5,00,000: 5%</li>
                                                                        <li>• ₹5,00,001 - ₹10,00,000: 20%</li>
                                                                        <li>• Above ₹10,00,000: 30%</li>
                                                                        <li>• Rebate: ₹12,500 (income ≤ ₹5,00,000)</li>
                                                                        <li>• Health & Education Cess: 4%</li>
                                                                    </ul>
                                                                </div>

                                                                <div className="bg-slate-50 dark:bg-slate-600 p-3 rounded-lg">
                                                                    <p className="text-xs text-slate-600 dark:text-slate-400">
                                                                        <strong>Note:</strong> Tax calculations are based on FY 2024-25 slabs.
                                                                        Monthly TDS is calculated as (Annual Tax ÷ 12). All calculations
                                                                        include Health & Education Cess at 4%.
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </PopoverContent>
                                                </Popover>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                                        <Calculator className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                                    </div>
                                                    <div>
                                                        <Label className="text-slate-900 dark:text-slate-100 font-medium">Enable Tax Deduction</Label>
                                                        <p className="text-sm text-slate-600 dark:text-slate-400">
                                                            Toggle to include or exclude tax calculation in salary slip
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => setEnableTaxDeduction(!enableTaxDeduction)}
                                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${enableTaxDeduction
                                                                ? 'bg-blue-600 dark:bg-blue-500'
                                                                : 'bg-slate-300 dark:bg-slate-600'
                                                            }`}
                                                    >
                                                        <span
                                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enableTaxDeduction ? 'translate-x-6' : 'translate-x-1'
                                                                }`}
                                                        />
                                                    </button>
                                                    <span className="ml-3 text-sm font-medium text-slate-900 dark:text-slate-100">
                                                        {enableTaxDeduction ? 'Enabled' : 'Disabled'}
                                                    </span>
                                                </div>
                                            </div>

                                            {enableTaxDeduction && (
                                                <div className="space-y-4">
                                                    <Label className="text-slate-700 dark:text-slate-300">Tax Regime</Label>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <button
                                                            type="button"
                                                            onClick={() => setTaxRegime('new')}
                                                            className={`p-4 rounded-lg border-2 text-left transition-all ${taxRegime === 'new'
                                                                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
                                                                    : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 hover:border-blue-300'
                                                                }`}
                                                        >
                                                            <div className="font-semibold text-slate-900 dark:text-slate-100 mb-1">New Regime</div>
                                                            <p className="text-xs text-slate-500 dark:text-slate-400">Lower tax rates, no exemptions</p>
                                                            {taxRegime === 'new' && (
                                                                <div className="mt-2 text-xs font-medium text-blue-600 dark:text-blue-400">Selected</div>
                                                            )}
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => setTaxRegime('old')}
                                                            className={`p-4 rounded-lg border-2 text-left transition-all ${taxRegime === 'old'
                                                                    ? 'border-green-600 bg-green-50 dark:bg-green-900/20 dark:border-green-400'
                                                                    : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 hover:border-green-300'
                                                                }`}
                                                        >
                                                            <div className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Old Regime</div>
                                                            <p className="text-xs text-slate-500 dark:text-slate-400">Higher rates, claims exemptions</p>
                                                            {taxRegime === 'old' && (
                                                                <div className="mt-2 text-xs font-medium text-green-600 dark:text-green-400">Selected</div>
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Totals Summary */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-600 pb-3">
                                            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                                                <Receipt className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                            </div>
                                            <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Live Calculation</h4>
                                        </div>

                                        <div className="bg-slate-50 dark:bg-slate-700/50 p-6 rounded-lg space-y-4">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-slate-600 dark:text-slate-400">Gross Salary</span>
                                                <span className="font-semibold text-slate-900 dark:text-slate-100">
                                                    ₹{formatIndianNumber(grossSalary)}
                                                </span>
                                            </div>

                                            {enableTaxDeduction && (
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-slate-600 dark:text-slate-400">
                                                        Monthly TDS ({taxRegime === 'new' ? 'New' : 'Old'} Regime)
                                                    </span>
                                                    <span className="font-semibold text-orange-600 dark:text-orange-400">
                                                        - ₹{formatIndianNumber(taxCalculation?.monthlyTax || 0)}
                                                    </span>
                                                </div>
                                            )}

                                            {customDeductions.length > 0 && (
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-slate-600 dark:text-slate-400">Total Custom Deductions</span>
                                                    <span className="font-semibold text-red-600 dark:text-red-400">
                                                        - ₹{formatIndianNumber(customDeductionsTotal)}
                                                    </span>
                                                </div>
                                            )}

                                            <div className="border-t border-slate-200 dark:border-slate-600 pt-4 mt-2">
                                                <div className="flex justify-between items-center">
                                                    <span className="font-bold text-lg text-slate-900 dark:text-slate-100">Net Salary</span>
                                                    <span className="font-bold text-xl text-green-600 dark:text-green-400">
                                                        ₹{formatIndianNumber(netSalary)}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-right">
                                                    {convertToWords(netSalary)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-600">
                                    <Button
                                        onClick={() => setActiveTab('employee')}
                                        variant="outline"
                                        className="dark:border-slate-600 dark:hover:bg-slate-600"
                                    >
                                        Back
                                    </Button>
                                    <Button
                                        onClick={handleSubmit}
                                        disabled={createOrUpdateSlipMutation.isPending || !selectedEmployee}
                                        className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white"
                                    >
                                        {createOrUpdateSlipMutation.isPending ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                Generating...
                                            </>
                                        ) : (
                                            <>
                                                <Receipt className="h-4 w-4 mr-2" />
                                                Generate Slip
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Preview Tab */}
                    <TabsContent value="preview" className="space-y-6">
                        <Card className="border-0 shadow-md bg-white dark:bg-slate-700">
                            <CardHeader className="border-b border-slate-200 dark:border-slate-600">
                                <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                                    <Receipt className="h-5 w-5" />
                                    Salary Slip Preview
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                {salarySlip ? (
                                    <div className="space-y-8">
                                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 text-center">
                                            <div className="p-3 bg-green-100 dark:bg-green-800 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                                                <Receipt className="h-8 w-8 text-green-600 dark:text-green-200" />
                                            </div>
                                            <h3 className="text-xl font-bold text-green-800 dark:text-green-200 mb-2">
                                                Salary Slip Generated Successfully!
                                            </h3>
                                            <p className="text-green-700 dark:text-green-300 max-w-lg mx-auto">
                                                The salary slip for {months.find(m => m.value === month)?.label} {year} has been
                                                {isEditing ? ' updated' : ' created'} and is ready for download.
                                            </p>

                                            <div className="mt-6 flex justify-center gap-4">
                                                <Button
                                                    onClick={downloadPDF}
                                                    className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white"
                                                >
                                                    <Download className="h-4 w-4 mr-2" />
                                                    Download PDF
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Preview Details */}
                                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg p-6 shadow-sm">
                                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 dark:border-slate-600 pb-4 mb-6 gap-4">
                                                <div>
                                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Payslip</h2>
                                                    <p className="text-slate-600 dark:text-slate-400">
                                                        {months.find(m => m.value === month)?.label} {year}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg">Indra Financial Services Limited</h3>
                                                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs ml-auto">
                                                        C-756, Front Basement, New Friends Colony, South Delhi 110025
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-8">
                                                <div>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">Employee Name</p>
                                                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                                                        {employeeDetails?.name || `${employeeDetails?.firstName || ''} ${employeeDetails?.lastName || ''}`.trim() || '-'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">Employee ID</p>
                                                    <p className="font-semibold text-slate-900 dark:text-slate-100">{employeeDetails?.employeeId || '-'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">Department</p>
                                                    <p className="font-semibold text-slate-900 dark:text-slate-100">{employeeDetails?.department || '-'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">Position</p>
                                                    <p className="font-semibold text-slate-900 dark:text-slate-100">{employeeDetails?.position || '-'}</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                {/* Earnings */}
                                                <div>
                                                    <div className="bg-slate-100 dark:bg-slate-700 px-3 py-2 rounded mb-3">
                                                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Earnings</h4>
                                                    </div>
                                                    <div className="space-y-2">
                                                        {Object.entries(salaryStructure).map(([key, value]) => {
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
                                                                    <span className="text-slate-600 dark:text-slate-400">{labels[key]}</span>
                                                                    <span className="font-medium text-slate-900 dark:text-slate-100">
                                                                        ₹{formatIndianNumber(parseFloat(value))}
                                                                    </span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                    <div className="border-t border-slate-200 dark:border-slate-600 mt-4 pt-2 flex justify-between">
                                                        <span className="font-bold text-slate-800 dark:text-slate-200">Total Earnings</span>
                                                        <span className="font-bold text-slate-800 dark:text-slate-200">
                                                            ₹{formatIndianNumber(grossSalary)}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Deductions */}
                                                <div>
                                                    <div className="bg-slate-100 dark:bg-slate-700 px-3 py-2 rounded mb-3">
                                                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Deductions</h4>
                                                    </div>
                                                    <div className="space-y-2">
                                                        {enableTaxDeduction && (
                                                            <div className="flex justify-between text-sm">
                                                                <span className="text-slate-600 dark:text-slate-400">TDS (Income Tax)</span>
                                                                <span className="font-medium text-slate-900 dark:text-slate-100">
                                                                    ₹{formatIndianNumber(taxCalculation?.monthlyTax || 0)}
                                                                </span>
                                                            </div>
                                                        )}

                                                        {customDeductions.map((deduction, index) => (
                                                            <div key={index} className="flex justify-between text-sm">
                                                                <span className="text-slate-600 dark:text-slate-400">{deduction.name}</span>
                                                                <span className="font-medium text-slate-900 dark:text-slate-100">
                                                                    ₹{formatIndianNumber(parseFloat(deduction.amount) || 0)}
                                                                </span>
                                                            </div>
                                                        ))}

                                                        {!enableTaxDeduction && customDeductions.length === 0 && (
                                                            <p className="text-sm text-slate-400 italic">No deductions</p>
                                                        )}
                                                    </div>
                                                    <div className="border-t border-slate-200 dark:border-slate-600 mt-4 pt-2 flex justify-between">
                                                        <span className="font-bold text-slate-800 dark:text-slate-200">Total Deductions</span>
                                                        <span className="font-bold text-slate-800 dark:text-slate-200">
                                                            ₹{formatIndianNumber((taxAmount + customDeductionsTotal))}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mt-8 border border-blue-100 dark:border-blue-900">
                                                <div>
                                                    <p className="text-sm text-slate-600 dark:text-slate-400">Net Salary Payable</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                                                        {convertToWords(netSalary)}
                                                    </p>
                                                </div>
                                                <span className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                                                    ₹{formatIndianNumber(netSalary)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <Receipt className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                                        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">No Slip Generated Yet</h3>
                                        <p className="text-slate-500 dark:text-slate-400 mt-2 mb-6">
                                            Complete the Employee and Salary Structure steps to generate a preview.
                                        </p>
                                        <Button onClick={() => setActiveTab('employee')}>
                                            Go to First Step
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};

export default SalarySlipForm;
