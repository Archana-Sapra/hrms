import React, { useState } from 'react';
import { UserCheck, Calendar, Mail, Phone, Building, RotateCcw, Eye } from 'lucide-react';
import { useEmployees, useEmployee, useToggleEmployeeStatus } from '../../../hooks/queries';
import { useToast } from '../../ui/toast';
import { useConfirm } from '../../ui/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { EmployeeAvatar } from './components/EmployeeAvatar';
import { employeeDisplayName } from './employeeName';
import { formatDate } from '../../../utils/istUtils';
import { Employee } from '../../../types';

// Employee.address is `string | { street?, city?, state?, pincode? }`. The
// object form cannot render as a ReactNode, so flatten it to one line — same
// field order as ProfileDisplay.tsx.
function formatAddress(address: Employee['address']): string {
    if (!address) return 'N/A';
    if (typeof address === 'string') return address.trim() || 'N/A';
    const parts = [address.street, address.city, address.state, address.pincode]
        .filter((p): p is string => typeof p === 'string' && p.trim() !== '');
    return parts.length > 0 ? parts.join(', ') : 'N/A';
}

const InactiveEmployees: React.FC = () => {
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [activatingId, setActivatingId] = useState<string | null>(null);
    const { toast } = useToast();
    const confirm = useConfirm();

    // Fetch inactive employees
    const { data: inactiveEmployees = [], isLoading: loading } = useEmployees({ status: 'inactive' });

    // Fetch employee details when modal is open
    const { data: employeeDetails, isLoading: loadingDetails } = useEmployee(selectedEmployeeId || '');

    const toggleStatusMutation = useToggleEmployeeStatus();

    const handleViewEmployee = (employeeId: string) => {
        setSelectedEmployeeId(employeeId);
        setViewModalOpen(true);
    };

    const handleCloseModal = () => {
        setViewModalOpen(false);
        setSelectedEmployeeId(null);
    };

    const handleReactivateEmployee = async (employeeId: string, employeeName: string) => {
        const confirmed = await confirm({
            title: 'Reactivate employee?',
            description: `Are you sure you want to reactivate ${employeeName}? This will restore their access to the system.`,
            confirmText: 'Reactivate',
        });
        if (!confirmed) {
            return;
        }

        setActivatingId(employeeId);

        toggleStatusMutation.mutate(
            employeeId,
            {
                onSuccess: () => {
                    toast({
                        title: "Employee Reactivated",
                        description: "Employee reactivated successfully"
                    });

                    // Close modal if viewing this employee
                    if (employeeDetails && employeeDetails._id === employeeId) {
                        handleCloseModal();
                    }
                    setActivatingId(null);
                },
                onError: (error: Error) => {
                    console.error('Failed to reactivate employee:', error);
                    toast({
                        title: "Error",
                        description: error.message || "Failed to reactivate employee",
                        variant: "destructive"
                    });
                    setActivatingId(null);
                }
            }
        );
    };

    if (loading) {
        return (
            <div className="rounded-xl border border-border bg-card">
                <div className="border-b border-border px-4 py-3">
                    <h2 className="text-sm font-semibold text-foreground">Inactive employees</h2>
                </div>
                <div className="p-4">
                    <div className="animate-pulse space-y-3" aria-hidden="true">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-16 rounded-lg bg-muted"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-border bg-card">
            {/* Matches the Active view's header weight. This was a red icon
                tile beside an xl bold heading, plus an amber "Deactivated
                accounts" note restating what the heading, the count and the
                selected tab all already said — three separate signals for one
                fact, in a louder visual language than the rest of the
                directory. */}
            <div className="flex items-baseline gap-2 border-b border-border px-4 py-3">
                <h2 className="text-sm font-semibold text-foreground">Inactive employees</h2>
                <span className="text-sm tabular-nums text-muted-foreground">
                    {inactiveEmployees.length}
                </span>
            </div>

            <div className="p-4">
                {inactiveEmployees.length === 0 ? (
                    // Matches the Active list's empty state: a muted icon and
                    // two lines. The green circle around a "user removed" icon
                    // sent two conflicting signals at once.
                    <div className="p-8 text-center">
                        <UserCheck className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
                        <p className="mt-3 font-medium text-foreground">No inactive employees</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Everyone in the directory is currently active.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Mobile: cards */}
                        <ul className="space-y-3 md:hidden">
                            {inactiveEmployees.map((employee: Employee) => {
                                const name = employeeDisplayName(employee);
                                return (
                                    <li
                                        key={employee._id}
                                        className="rounded-lg border border-border bg-muted/40 p-4"
                                    >
                                        <div className="flex items-start gap-3">
                                            <EmployeeAvatar name={name} src={employee.profilePicture} className="size-10" />
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate font-semibold text-foreground">{name}</p>
                                                <p className="text-sm text-muted-foreground">ID: {employee.employeeId}</p>
                                            </div>
                                            <Badge variant="error" className="shrink-0">Inactive</Badge>
                                        </div>

                                        <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                                            <div className="flex items-center gap-2">
                                                <Mail className="size-4 shrink-0" aria-hidden="true" />
                                                <span className="truncate">{employee.email}</span>
                                            </div>
                                            {employee.phone && (
                                                <div className="flex items-center gap-2">
                                                    <Phone className="size-4 shrink-0" aria-hidden="true" />
                                                    <span>{employee.phone}</span>
                                                </div>
                                            )}
                                            {employee.department && (
                                                <div className="flex items-center gap-2">
                                                    <Building className="size-4 shrink-0" aria-hidden="true" />
                                                    <span className="truncate">{employee.department}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2">
                                                <Calendar className="size-4 shrink-0" aria-hidden="true" />
                                                <span>Joined {formatDate(employee.joiningDate, false, 'DD MMM YYYY')}</span>
                                            </div>
                                        </div>

                                        <div className="mt-4 flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-11 flex-1"
                                                onClick={() => handleViewEmployee(employee._id)}
                                            >
                                                <Eye className="size-4" aria-hidden="true" />
                                                View
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-11 flex-1"
                                                disabled={activatingId === employee._id}
                                                onClick={() => handleReactivateEmployee(employee._id, name)}
                                            >
                                                <RotateCcw className="size-4" aria-hidden="true" />
                                                {activatingId === employee._id ? 'Reactivating…' : 'Reactivate'}
                                            </Button>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>

                        {/* Desktop: table */}
                        <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
                            <table className="min-w-full text-sm">
                                <thead className="bg-muted/50">
                                    <tr>
                                        <th scope="col" className="p-3 text-left font-medium text-muted-foreground">Employee</th>
                                        <th scope="col" className="p-3 text-left font-medium text-muted-foreground">Contact</th>
                                        <th scope="col" className="p-3 text-left font-medium text-muted-foreground">Department</th>
                                        <th scope="col" className="p-3 text-left font-medium text-muted-foreground">Joined</th>
                                        <th scope="col" className="p-3 text-right font-medium text-muted-foreground">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {inactiveEmployees.map((employee: Employee) => {
                                        const name = employeeDisplayName(employee);
                                        return (
                                            <tr key={employee._id} className="hover:bg-accent/40">
                                                <td className="p-3">
                                                    <div className="flex items-center gap-3">
                                                        <EmployeeAvatar name={name} src={employee.profilePicture} className="size-9" />
                                                        <div className="min-w-0">
                                                            <p className="truncate font-medium text-foreground">{name}</p>
                                                            <p className="text-xs text-muted-foreground">ID: {employee.employeeId}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-3 text-muted-foreground">
                                                    <div className="truncate">{employee.email}</div>
                                                    {employee.phone && <div className="text-xs">{employee.phone}</div>}
                                                </td>
                                                <td className="max-w-40 truncate p-3 text-foreground">{employee.department || '—'}</td>
                                                <td className="p-3 whitespace-nowrap text-foreground">
                                                    {formatDate(employee.joiningDate, false, 'DD MMM YYYY')}
                                                </td>
                                                <td className="p-3 text-right whitespace-nowrap">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleViewEmployee(employee._id)}
                                                        >
                                                            <Eye className="size-4" aria-hidden="true" />
                                                            View
                                                        </Button>
                                                        {/* Outline, not primary: this repeats once per row, and
                                                            a column of filled buttons made a rare, consequential
                                                            action the loudest thing on the page. The confirm
                                                            dialog is what guards it. */}
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            disabled={activatingId === employee._id}
                                                            onClick={() => handleReactivateEmployee(employee._id, name)}
                                                        >
                                                            <RotateCcw className="size-4" aria-hidden="true" />
                                                            {activatingId === employee._id ? 'Reactivating…' : 'Reactivate'}
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            {/* Employee Details Modal */}
            <Dialog open={viewModalOpen} onOpenChange={(open) => !open && handleCloseModal()}>
                <DialogContent className="max-h-[90vh] max-w-4xl gap-0 overflow-y-auto p-0">
                    {/* Modal Header */}
                    <DialogHeader className="border-b border-border p-6 pr-14 text-left">
                        <DialogTitle className="text-2xl font-bold text-foreground">
                            Employee Details
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            Details for this deactivated employee.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Modal Content */}
                    <div className="p-6">
                        {loadingDetails ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                                <span className="ml-3 text-muted-foreground">Loading employee details...</span>
                            </div>
                        ) : employeeDetails ? (
                            <div className="space-y-6">
                                {/* Employee Header */}
                                <div className="rounded-lg bg-muted/40 p-4">
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex items-center gap-3">
                                            <EmployeeAvatar
                                                name={employeeDisplayName(employeeDetails)}
                                                src={employeeDetails.profilePicture}
                                                className="size-12"
                                            />
                                            <div>
                                                <h3 className="text-xl font-semibold text-foreground">
                                                    {employeeDetails.firstName} {employeeDetails.lastName}
                                                </h3>
                                                <p className="text-muted-foreground">
                                                    {employeeDetails.position} • {employeeDetails.department}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    Employee ID: {employeeDetails.employeeId}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Badge variant="error">Inactive</Badge>
                                        </div>
                                    </div>
                                </div>

                                {/* Employee Details Grid */}
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                                    {/* Contact Information */}
                                    <div className="space-y-3">
                                        <h4 className="border-b border-border pb-2 font-semibold text-foreground">
                                            Contact Information
                                        </h4>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex items-center space-x-2">
                                                <Mail className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                                                <span className="text-foreground">{employeeDetails.email}</span>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Phone className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                                                <span className="text-foreground">{employeeDetails.phone}</span>
                                            </div>
                                            <div className="flex items-start space-x-2">
                                                <Building className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                                                <span className="text-foreground">{formatAddress(employeeDetails.address)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Personal Information */}
                                    <div className="space-y-3">
                                        <h4 className="border-b border-border pb-2 font-semibold text-foreground">
                                            Personal Information
                                        </h4>
                                        <div className="space-y-2 text-sm text-foreground">
                                            <div><span className="font-medium">Date of Birth:</span> {formatDate(employeeDetails.dateOfBirth, false, 'DD MMM YYYY')}</div>
                                            <div><span className="font-medium">Gender:</span> {employeeDetails.gender}</div>
                                            <div><span className="font-medium">Marital Status:</span> {employeeDetails.maritalStatus}</div>
                                            <div><span className="font-medium">Father's Name:</span> {employeeDetails.fatherName || 'N/A'}</div>
                                            <div><span className="font-medium">Mother's Name:</span> {employeeDetails.motherName || 'N/A'}</div>
                                        </div>
                                    </div>

                                    {/* Work Information */}
                                    <div className="space-y-3">
                                        <h4 className="border-b border-border pb-2 font-semibold text-foreground">
                                            Work Information
                                        </h4>
                                        <div className="space-y-2 text-sm text-foreground">
                                            <div><span className="font-medium">Company:</span> {employeeDetails.companyName || 'N/A'}</div>
                                            <div><span className="font-medium">Employment Type:</span> {employeeDetails.employmentType}</div>
                                            <div><span className="font-medium">Joining Date:</span> {formatDate(employeeDetails.joiningDate, false, 'DD MMM YYYY')}</div>
                                            <div><span className="font-medium">Office:</span> {employeeDetails.officeAddress || 'N/A'}</div>
                                            <div><span className="font-medium">Supervisor:</span> {employeeDetails.reportingSupervisor || 'N/A'}</div>
                                        </div>
                                    </div>

                                    {/* Government Documents */}
                                    <div className="space-y-3">
                                        <h4 className="border-b border-border pb-2 font-semibold text-foreground">
                                            Government Documents
                                        </h4>
                                        <div className="space-y-2 text-sm text-foreground">
                                            <div><span className="font-medium">Aadhaar Number:</span> {employeeDetails.aadhaarNumber || 'N/A'}</div>
                                            <div><span className="font-medium">PAN Number:</span> {employeeDetails.panNumber || 'N/A'}</div>
                                        </div>
                                    </div>

                                    {/* Banking Information */}
                                    <div className="space-y-3">
                                        <h4 className="border-b border-border pb-2 font-semibold text-foreground">
                                            Banking Information
                                        </h4>
                                        <div className="space-y-2 text-sm text-foreground">
                                            <div><span className="font-medium">Bank Name:</span> {employeeDetails.bankName || 'N/A'}</div>
                                            <div><span className="font-medium">Account Number:</span> {employeeDetails.bankAccountNumber || 'N/A'}</div>
                                            <div><span className="font-medium">IFSC Code:</span> {employeeDetails.bankIFSCCode || 'N/A'}</div>
                                        </div>
                                    </div>

                                    {/* Emergency Contact */}
                                    <div className="space-y-3">
                                        <h4 className="border-b border-border pb-2 font-semibold text-foreground">
                                            Emergency Contact
                                        </h4>
                                        <div className="space-y-2 text-sm text-foreground">
                                            <div><span className="font-medium">Name:</span> {employeeDetails.emergencyContactName || "N/A"}</div>
                                            <div><span className="font-medium">Phone:</span> {employeeDetails.emergencyContactNumber || "N/A"}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons in Modal */}
                                <div className="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row">
                                    <Button
                                        size="lg"
                                        className="flex-1 sm:flex-initial"
                                        disabled={activatingId === employeeDetails._id}
                                        onClick={() => handleReactivateEmployee(employeeDetails._id, employeeDisplayName(employeeDetails))}
                                    >
                                        <RotateCcw className="size-4" aria-hidden="true" />
                                        {activatingId === employeeDetails._id ? 'Reactivating…' : 'Reactivate Employee'}
                                    </Button>

                                    <Button
                                        size="lg"
                                        variant="outline"
                                        className="flex-1 sm:flex-initial"
                                        onClick={handleCloseModal}
                                    >
                                        Close
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="py-12 text-center text-muted-foreground">
                                Failed to load employee details
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default InactiveEmployees;
