import React from 'react';
import { ArrowLeft, FileText, User, Shield, GraduationCap, Upload, Eye, Plus, X } from 'lucide-react';
import { useToast } from '../../ui/toast';
import BusyOverlay from '../../ui/BusyOverlay';
import { useEmployeeDocuments, useUploadDocument, useDeleteDocument } from '@/hooks/queries';
import { Document, DocumentType } from '@/types';
import { LucideIcon } from 'lucide-react';

interface EmployeeProfile {
  employeeId: string;
  firstName: string;
  lastName: string;
}

interface DocumentManagerProps {
  employeeProfile: EmployeeProfile;
  onBack: () => void;
}

interface DocumentTypeConfig {
  key: DocumentType;
  label: string;
  icon: LucideIcon;
  accept: string;
}

const DocumentManager: React.FC<DocumentManagerProps> = ({ employeeProfile, onBack }) => {
  const { toast } = useToast();

  const documentTypes: DocumentTypeConfig[] = [
    { key: 'profile_picture', label: 'Profile Photo', icon: User, accept: 'image/*' },
    { key: 'aadhaar', label: 'Aadhaar Card', icon: Shield, accept: '.pdf,.jpg,.jpeg,.png' },
    { key: 'pan', label: 'PAN Card', icon: Shield, accept: '.pdf,.jpg,.jpeg,.png' },
    { key: '10th_marksheet', label: '10th Certificate', icon: GraduationCap, accept: '.pdf,.jpg,.jpeg,.png' },
    { key: '12th_marksheet', label: '12th Certificate', icon: GraduationCap, accept: '.pdf,.jpg,.jpeg,.png' },
    { key: 'college_marksheet', label: 'College Certificate', icon: GraduationCap, accept: '.pdf,.jpg,.jpeg,.png' },
  ];

  // Fetch documents for this employee
  const { data: documents = [], isLoading: loading } = useEmployeeDocuments(employeeProfile?.employeeId, {
    enabled: !!employeeProfile?.employeeId
  });

  const uploadMutation = useUploadDocument();
  const deleteMutation = useDeleteDocument();

  const handleFileUpload = (docType: DocumentType, file: File): void => {
    uploadMutation.mutate({
      employeeId: employeeProfile.employeeId,
      documentType: docType,
      file,
    }, {
      onSuccess: () => {
        toast({
          title: "Success",
          description: "Document uploaded successfully",
          variant: "default"
        });
      },
      onError: (error: Error) => {
        toast({
          title: "Error",
          description: error.message || "Failed to upload document",
          variant: "error"
        });
      }
    });
  };

  const handleFileDelete = (documentId: string, docType: DocumentType): void => {
    deleteMutation.mutate({
      documentId,
      employeeId: employeeProfile.employeeId,
      documentType: docType,
    }, {
      onSuccess: () => {
        toast({
          title: "Success",
          description: "Document deleted successfully",
          variant: "default"
        });
      },
      onError: (error: Error) => {
        toast({
          title: "Error",
          description: error.message || "Failed to delete document",
          variant: "error"
        });
      }
    });
  };

  const getDocumentForType = (docType: DocumentType): Document | undefined => {
    return documents.find(doc => doc.documentType === docType);
  };

  const isImage = (fileName: string): boolean => {
    return /\.(jpg|jpeg|png|gif)$/i.test(fileName);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading documents...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Simple Header */}
      <div className="border-b border-border bg-card shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to employee profile"
              className="rounded-lg p-2 transition-colors hover:bg-accent"
            >
              <ArrowLeft className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-foreground">
                {employeeProfile.firstName} {employeeProfile.lastName}
              </h1>
              <p className="text-sm text-muted-foreground">
                Employee Documents
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Document Grid */}
      <div className="px-6 py-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {documentTypes.map((docType) => {
            const IconComponent = docType.icon;
            const existingDoc = getDocumentForType(docType.key);

            return (
              <div key={docType.key} className="min-h-70 overflow-hidden rounded-lg border border-border bg-card p-6 transition-shadow hover:shadow-md">
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-lg bg-muted p-2">
                    <IconComponent className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                  </div>
                  <h3 className="font-medium text-foreground">{docType.label}</h3>
                </div>

                {existingDoc ? (
                  /* Document exists - show preview with actions */
                  <div className="space-y-4">
                    {/* Document preview */}
                    {isImage(existingDoc.fileName) ? (
                      <div className="h-32 overflow-hidden rounded-lg bg-muted">
                        <img
                          src={existingDoc.s3Url}
                          alt={existingDoc.fileName}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex h-32 items-center justify-center rounded-lg bg-muted">
                        <FileText className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
                      </div>
                    )}

                    {/* File info */}
                    <div className="space-y-2">
                      <p className="truncate text-sm font-medium text-foreground" title={existingDoc.fileName}>
                        {existingDoc.fileName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(existingDoc.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <a
                        href={existingDoc.s3Url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground transition-colors hover:bg-primary/90"
                      >
                        <Eye className="h-4 w-4" aria-hidden="true" />
                        View
                      </a>
                      <button
                        type="button"
                        onClick={() => handleFileDelete(existingDoc._id, docType.key)}
                        aria-label={`Delete ${docType.label}`}
                        className="rounded-md bg-muted px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>

                    {/* Replace option */}
                    <div className="border-t border-border pt-3">
                      <label className="flex cursor-pointer items-center justify-center gap-2 px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
                        <Upload className="h-4 w-4" aria-hidden="true" />
                        Replace
                        <input
                          type="file"
                          accept={docType.accept}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(docType.key, file);
                          }}
                          className="hidden"
                          disabled={uploadMutation.isPending || deleteMutation.isPending}
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  /* No document - show upload */
                  <div className="space-y-4">
                    <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-border transition-colors hover:border-primary/50">
                      <label className="flex cursor-pointer flex-col items-center gap-2 p-4 text-center">
                        <div className="rounded-full bg-muted p-3">
                          <Plus className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">Upload Document</p>
                          <p className="mt-1 text-xs text-muted-foreground">PDF, JPG, PNG</p>
                        </div>
                        <input
                          type="file"
                          accept={docType.accept}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(docType.key, file);
                          }}
                          className="hidden"
                          disabled={uploadMutation.isPending || deleteMutation.isPending}
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <BusyOverlay
          show={uploadMutation.isPending || deleteMutation.isPending}
          message="Uploading..."
        />
      </div>
    </div>
  );
};

export default DocumentManager;
