import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus,
  Edit,
  Trash2,
  Save,
  FileText,
  Calendar,
  Users,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import useAuth from '../../hooks/authjwt';
import BackButton from '../ui/BackButton';
import {
  usePolicies,
  useCreatePolicy,
  useUpdatePolicy,
  useUpdatePolicyStatus,
  useDeletePolicy,
  usePermanentDeletePolicy,
} from '@/hooks/queries';
import type { Policy, PolicyCategory, PolicyPriority, PolicyTargetAudience, User } from '@/types';

interface PolicyFormData {
  title: string;
  content: string;
  category: PolicyCategory;
  priority: PolicyPriority;
  effectiveDate: string;
  expiryDate: string;
  targetAudience: PolicyTargetAudience;
  acknowledgmentRequired: boolean;
  tags: string[];
}

interface PaginationState {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

interface PoliciesPageProps {
  onBack?: () => void;
}

const CATEGORIES: PolicyCategory[] = [
  'General',
  'HR',
  'IT',
  'Security',
  'Leave',
  'Attendance',
  'Code of Conduct',
  'Safety',
  'Other',
];

const PRIORITIES: PolicyPriority[] = ['Low', 'Medium', 'High', 'Critical'];

const TARGET_AUDIENCES: PolicyTargetAudience[] = [
  'All Employees',
  'HR Only',
  'Management Only',
  'IT Team',
  'Specific Departments',
];

const PoliciesPage = ({ onBack }: PoliciesPageProps): JSX.Element => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);

  // Policy form state
  const [policyForm, setPolicyForm] = useState<PolicyFormData>({
    title: '',
    content: '',
    category: 'General',
    priority: 'Medium',
    effectiveDate: '',
    expiryDate: '',
    targetAudience: 'All Employees',
    acknowledgmentRequired: false,
    tags: [],
  });

  // Pagination
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
  });

  const { toast } = useToast();
  const confirm = useConfirm();
  const user = useAuth() as User | null;

  // Fetch policies using React Query
  const { data: policiesData, isLoading: loading } = usePolicies({
    page: pagination.currentPage,
    limit: pagination.itemsPerPage,
  });

  const policies = policiesData?.policies || [];

  // Sync pagination state with API response
  useEffect(() => {
    if (policiesData?.pagination) {
      setPagination(prev => ({
        ...prev,
        totalPages: policiesData.pagination.totalPages,
        totalItems: policiesData.pagination.totalItems,
      }));
    }
  }, [policiesData?.pagination]);

  // Mutations
  const createPolicyMutation = useCreatePolicy();
  const updatePolicyMutation = useUpdatePolicy();
  const updatePolicyStatusMutation = useUpdatePolicyStatus();
  const deletePolicyMutation = useDeletePolicy();
  const permanentDeletePolicyMutation = usePermanentDeletePolicy();

  const handleFormChange = (field: keyof PolicyFormData, value: string | boolean | string[]): void => {
    setPolicyForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCreateNew = (): void => {
    setEditingPolicy(null);
    setPolicyForm({
      title: '',
      content: '',
      category: 'General',
      priority: 'Medium',
      effectiveDate: '',
      expiryDate: '',
      targetAudience: 'All Employees',
      acknowledgmentRequired: false,
      tags: [],
    });
    setShowForm(true);
  };

  const handleEdit = (policy: Policy): void => {
    setEditingPolicy(policy);
    setPolicyForm({
      title: policy.title,
      content: policy.content,
      category: policy.category,
      priority: policy.priority,
      effectiveDate: policy.effectiveDate ? new Date(policy.effectiveDate).toISOString().split('T')[0] : '',
      expiryDate: policy.expiryDate ? new Date(policy.expiryDate).toISOString().split('T')[0] : '',
      targetAudience: policy.targetAudience,
      acknowledgmentRequired: policy.acknowledgmentRequired,
      tags: policy.tags || [],
    });
    setShowForm(true);
  };

  const handleDelete = async (policy: Policy): Promise<void> => {
    const confirmed = await confirm({
      title: 'Deactivate policy?',
      description: `Are you sure you want to deactivate the policy "${policy.title}"?`,
      confirmText: 'Deactivate',
      destructive: true,
    });
    if (!confirmed) {
      return;
    }

    try {
      await deletePolicyMutation.mutateAsync(policy._id);

      toast({
        title: 'Success',
        description: 'Policy deactivated successfully',
      });
    } catch (error) {
      const err = error as { message?: string };
      toast({
        title: 'Error',
        description: err.message || 'Failed to deactivate policy',
        variant: 'destructive',
      });
    }
  };

  const handleRestore = async (policy: Policy): Promise<void> => {
    const confirmed = await confirm({
      title: 'Activate policy?',
      description: `Are you sure you want to activate the policy "${policy.title}"?`,
      confirmText: 'Activate',
    });
    if (!confirmed) {
      return;
    }

    try {
      await updatePolicyStatusMutation.mutateAsync({
        id: policy._id,
        isActive: true,
      });

      toast({
        title: 'Success',
        description: 'Policy activated successfully',
      });
    } catch (error) {
      const err = error as { message?: string };
      toast({
        title: 'Error',
        description: err.message || 'Failed to activate policy',
        variant: 'destructive',
      });
    }
  };

  const handlePermanentDelete = async (policy: Policy): Promise<void> => {
    const confirmed = await confirm({
      title: 'Permanently delete this policy?',
      description: (
        <>
          This will permanently delete the policy{' '}
          <strong>"{policy.title}"</strong> from the database. This action{' '}
          <strong>cannot be undone</strong>. You will be asked to type DELETE to
          confirm.
        </>
      ),
      confirmText: 'Continue',
      destructive: true,
    });
    if (!confirmed) {
      return;
    }

    const userInput = window.prompt('Type "DELETE" (in capital letters) to confirm permanent deletion:');
    if (userInput !== 'DELETE') {
      toast({
        title: 'Deletion Cancelled',
        description: 'Policy was not deleted - confirmation text did not match.',
      });
      return;
    }

    try {
      await permanentDeletePolicyMutation.mutateAsync(policy._id);

      toast({
        title: 'Success',
        description: 'Policy permanently deleted successfully',
      });

      // React Query automatically invalidates and refetches
    } catch (error) {
      const err = error as { message?: string };
      toast({
        title: 'Error',
        description: err.message || 'Failed to permanently delete policy',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();

    if (!policyForm.title || !policyForm.content) {
      toast({
        title: 'Error',
        description: 'Please fill in title and content',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const policyData: PolicyFormData = {
        ...policyForm,
        effectiveDate: policyForm.effectiveDate || new Date().toISOString(),
        expiryDate: policyForm.expiryDate || '',
      };

      if (editingPolicy) {
        await updatePolicyMutation.mutateAsync({
          id: editingPolicy._id,
          ...policyData,
        });
        toast({
          title: 'Success',
          description: 'Policy updated successfully',
        });
      } else {
        await createPolicyMutation.mutateAsync(policyData);
        toast({
          title: 'Success',
          description: 'Policy created successfully',
        });
      }

      setShowForm(false);
    } catch (error) {
      const err = error as { message?: string };
      toast({
        title: 'Error',
        description: err.message || 'Failed to save policy',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleFormBack = (): void => {
    setShowForm(false);
    setEditingPolicy(null);
  };

  const handlePageChange = (newPage: number): void => {
    setPagination((prev) => ({
      ...prev,
      currentPage: newPage,
    }));
  };

  const getPriorityColor = (priority: PolicyPriority): string => {
    const colors: Record<PolicyPriority, string> = {
      Low: 'text-gray-600 bg-gray-100',
      Medium: 'text-blue-600 bg-blue-100',
      High: 'text-orange-600 bg-orange-100',
      Critical: 'text-red-600 bg-red-100',
    };
    return colors[priority] || colors['Medium'];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

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
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {editingPolicy ? 'Edit Policy' : 'Create New Policy'}
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                  {editingPolicy ? 'Update policy information' : 'Add a new company policy'}
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          <Card className="border-0 shadow-md bg-white dark:bg-slate-700">
            <CardHeader className="border-b border-slate-200 dark:border-slate-600">
              <CardTitle className="text-slate-900 dark:text-slate-100">Policy Details</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Title */}
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">Policy Title *</Label>
                  <Input
                    placeholder="Enter policy title"
                    value={policyForm.title}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => handleFormChange('title', e.target.value)}
                    className="dark:border-slate-600 dark:bg-slate-600 dark:text-slate-100"
                    required
                  />
                </div>

                {/* Content */}
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">Policy Content *</Label>
                  <Textarea
                    className="h-40 resize-y"
                    placeholder="Enter detailed policy content..."
                    value={policyForm.content}
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) => handleFormChange('content', e.target.value)}
                    required
                  />
                </div>

                {/* Category and Priority */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">Category</Label>
                    <Select
                      value={policyForm.category}
                      onValueChange={(value: PolicyCategory) => handleFormChange('category', value)}
                    >
                      <SelectTrigger className="dark:border-slate-600 dark:bg-slate-600 dark:text-slate-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-slate-800 dark:border-slate-600">
                        {CATEGORIES.map((cat) => (
                          <SelectItem
                            key={cat}
                            value={cat}
                            className="dark:text-slate-100 dark:focus:bg-slate-700"
                          >
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">Priority</Label>
                    <Select
                      value={policyForm.priority}
                      onValueChange={(value: PolicyPriority) => handleFormChange('priority', value)}
                    >
                      <SelectTrigger className="dark:border-slate-600 dark:bg-slate-600 dark:text-slate-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-slate-800 dark:border-slate-600">
                        {PRIORITIES.map((priority) => (
                          <SelectItem
                            key={priority}
                            value={priority}
                            className="dark:text-slate-100 dark:focus:bg-slate-700"
                          >
                            {priority}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Target Audience */}
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">Target Audience</Label>
                  <Select
                    value={policyForm.targetAudience}
                    onValueChange={(value: PolicyTargetAudience) => handleFormChange('targetAudience', value)}
                  >
                    <SelectTrigger className="dark:border-slate-600 dark:bg-slate-600 dark:text-slate-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-800 dark:border-slate-600">
                      {TARGET_AUDIENCES.map((audience) => (
                        <SelectItem
                          key={audience}
                          value={audience}
                          className="dark:text-slate-100 dark:focus:bg-slate-700"
                        >
                          {audience}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">Effective Date</Label>
                    <Input
                      type="date"
                      value={policyForm.effectiveDate}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        handleFormChange('effectiveDate', e.target.value)
                      }
                      className="dark:border-slate-600 dark:bg-slate-600 dark:text-slate-100"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">Expiry Date (Optional)</Label>
                    <Input
                      type="date"
                      value={policyForm.expiryDate}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => handleFormChange('expiryDate', e.target.value)}
                      className="dark:border-slate-600 dark:bg-slate-600 dark:text-slate-100"
                    />
                  </div>
                </div>

                {/* Acknowledgment Required */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="acknowledgmentRequired"
                    checked={policyForm.acknowledgmentRequired}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      handleFormChange('acknowledgmentRequired', e.target.checked)
                    }
                    className="rounded border-slate-300 dark:border-slate-600"
                  />
                  <Label htmlFor="acknowledgmentRequired" className="text-slate-700 dark:text-slate-300">
                    Require employee acknowledgment
                  </Label>
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
                    disabled={saving || !policyForm.title || !policyForm.content}
                    className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {editingPolicy ? 'Update Policy' : 'Create Policy'}
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
          <BackButton onClick={() => navigate('/dashboard')} label="Back to Dashboard" variant="ghost" className="w-auto" />
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Company Policies</h1>
                <p className="text-slate-600 dark:text-slate-400">Manage and maintain company policies and procedures</p>
              </div>
            </div>

            <Button
              onClick={handleCreateNew}
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New Policy
            </Button>
          </div>
        </div>

        {/* Policies Table */}
        <Card className="border-0 shadow-md bg-white dark:bg-slate-700">
          <CardHeader className="border-b border-slate-200 dark:border-slate-600">
            <CardTitle className="text-slate-900 dark:text-slate-100">Policies ({pagination.totalItems})</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : policies.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
                <p className="text-slate-600 dark:text-slate-400 text-lg">No policies found</p>
                <p className="text-slate-500 dark:text-slate-500 text-sm mt-2">
                  Create your first company policy to get started
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-600">
                        <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">Title</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">Category</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">Priority</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">Status</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">Target</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">Created</th>
                        <th className="text-right py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {policies.map((policy) => (
                        <tr
                          key={policy._id}
                          className="border-b border-slate-100 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600"
                        >
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium text-slate-900 dark:text-slate-100">{policy.title}</p>
                              {policy.acknowledgmentRequired && (
                                <span className="inline-flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
                                  <AlertTriangle className="h-3 w-3" />
                                  Acknowledgment Required
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-600 dark:text-slate-200">
                              {policy.category}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(
                                policy.priority
                              )}`}
                            >
                              {policy.priority}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                policy.isActive !== false
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                              }`}
                            >
                              {policy.isActive !== false ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-900 dark:text-slate-100">
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              <span className="text-sm">{policy.targetAudience}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-900 dark:text-slate-100">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span className="text-sm">{formatDate(policy.createdAt)}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(policy)}
                                className="h-8 w-8 p-0 text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
                                title="Edit"
                                disabled={policy.isActive === false}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              {policy.isActive !== false ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(policy)}
                                  className="h-8 w-8 p-0 text-slate-600 hover:text-orange-600 dark:text-slate-400 dark:hover:text-orange-400"
                                  title="Deactivate Policy"
                                >
                                  <EyeOff className="h-4 w-4" />
                                </Button>
                              ) : (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRestore(policy)}
                                    className="h-8 w-8 p-0 text-slate-600 hover:text-green-600 dark:text-slate-400 dark:hover:text-green-400"
                                    title="Activate Policy"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handlePermanentDelete(policy)}
                                    className="h-8 w-8 p-0 text-slate-600 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
                                    title="Permanently Delete Policy"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex justify-between items-center mt-6 pt-6 border-t border-slate-200 dark:border-slate-600">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Showing {(pagination.currentPage - 1) * pagination.itemsPerPage + 1} to{' '}
                      {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of{' '}
                      {pagination.totalItems} results
                    </p>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pagination.currentPage - 1)}
                        disabled={pagination.currentPage === 1}
                        className="dark:border-slate-600 dark:hover:bg-slate-600"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>

                      <span className="text-sm text-slate-600 dark:text-slate-400 px-3">
                        Page {pagination.currentPage} of {pagination.totalPages}
                      </span>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pagination.currentPage + 1)}
                        disabled={pagination.currentPage === pagination.totalPages}
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

export default PoliciesPage;
