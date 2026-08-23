import React from 'react';
import { FileText, User, Shield, GraduationCap, Plus, Eye, X, Upload, LucideIcon } from 'lucide-react';
import { useToast } from '../ui/toast';
import BusyOverlay from '../ui/BusyOverlay';
import { useEmployeeDocuments, useUploadDocument, useDeleteDocument } from '@/hooks/queries';
import useAuth from '../../hooks/authjwt';
import { Document, DocumentType } from '@/types';

/** One selectable document slot in the UI. */
interface DocumentKind {
  key: DocumentType;
  label: string;
  icon: LucideIcon;
  accept: string;
}

const MyDocuments: React.FC = () => {
  const userObject = useAuth();
  const { toast } = useToast();

  const documentTypes: DocumentKind[] = [
    { key: 'profile_picture', label: 'Profile Photo', icon: User, accept: 'image/*' },
    { key: 'aadhaar', label: 'Aadhaar Card', icon: Shield, accept: '.pdf,.jpg,.jpeg,.png' },
    { key: 'pan', label: 'PAN Card', icon: Shield, accept: '.pdf,.jpg,.jpeg,.png' },
    { key: '10th_marksheet', label: '10th Certificate', icon: GraduationCap, accept: '.pdf,.jpg,.jpeg,.png' },
    { key: '12th_marksheet', label: '12th Certificate', icon: GraduationCap, accept: '.pdf,.jpg,.jpeg,.png' },
    { key: 'college_marksheet', label: 'College Certificate', icon: GraduationCap, accept: '.pdf,.jpg,.jpeg,.png' },
  ];

  // Fetch documents for current user
  const { data: documents = [], isLoading: loading } = useEmployeeDocuments(userObject?.employeeId, {
    enabled: !!userObject?.employeeId
  });

  const uploadMutation = useUploadDocument();
  const deleteMutation = useDeleteDocument();

  const handleFileUpload = (docType: DocumentType, file: File): void => {
    const employeeId = userObject?.employeeId;
    if (!employeeId) return;

    uploadMutation.mutate({
      employeeId,
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
          variant: "destructive"
        });
      }
    });
  };

  const handleFileDelete = (documentId: string, documentType: DocumentType): void => {
    const employeeId = userObject?.employeeId;
    if (!employeeId) return;

    deleteMutation.mutate({
      documentId,
      employeeId,
      documentType,
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
          variant: "destructive"
        });
      }
    });
  };

  const getDocumentForType = (docType: string): Document | undefined => {
    return documents.find((doc: Document) => doc.documentType === docType);
  };

  const isImage = (fileName: string): boolean => {
    return /\.(jpg|jpeg|png|gif)$/i.test(fileName);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading documents...</div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50 dark:bg-slate-900">
      {/* Simple Header */}
      <div className="bg-white dark:bg-slate-800 shadow-sm border-b border-gray-200 dark:border-slate-700">
        <div className="px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              My Documents
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Upload and manage your personal documents
            </p>
          </div>
        </div>
      </div>

      {/* Document Grid */}
      <div className="px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {documentTypes.map((docType) => {
          const IconComponent = docType.icon;
          const existingDoc = getDocumentForType(docType.key);

          return (
            <div key={docType.key} className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6 hover:shadow-md transition-shadow overflow-hidden min-h-[280px]">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gray-100 dark:bg-slate-700 rounded-lg">
                  <IconComponent className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </div>
                <h3 className="font-medium text-gray-900 dark:text-white">{docType.label}</h3>
              </div>

              {existingDoc ? (
                /* Document exists - show preview with actions */
                <div className="space-y-4">
                  {/* Document preview */}
                  {isImage(existingDoc.fileName) ? (
                    <div className="h-32 bg-gray-100 dark:bg-slate-700 rounded-lg overflow-hidden">
                      <img
                        src={existingDoc.s3Url}
                        alt={existingDoc.fileName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-32 bg-gray-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                      <FileText className="w-12 h-12 text-gray-400" />
                    </div>
                  )}

                  {/* File info */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate" title={existingDoc.fileName}>
                      {existingDoc.fileName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(existingDoc.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <a
                      href={existingDoc.s3Url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </a>
                    <button
                      onClick={() => handleFileDelete(existingDoc._id, docType.key)}
                      aria-label={`Delete ${docType.label}`}
                      className="px-3 py-2 bg-muted hover:bg-accent text-muted-foreground hover:text-accent-foreground rounded-md transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Replace option */}
                  <div className="pt-3 border-t border-gray-100 dark:border-slate-700">
                    <label className="cursor-pointer flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                      <Upload className="w-4 h-4" />
                      Replace
                      <input
                        type="file"
                        accept={docType.accept}
                        onChange={(e) => {
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
                  <div className="h-32 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg flex items-center justify-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
                    <label className="cursor-pointer flex flex-col items-center gap-2 p-4 text-center">
                      <div className="p-3 bg-gray-100 dark:bg-slate-700 rounded-full">
                        <Plus className="w-6 h-6 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Upload Document</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">PDF, JPG, PNG</p>
                      </div>
                      <input
                        type="file"
                        accept={docType.accept}
                        onChange={(e) => {
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

export default MyDocuments;
