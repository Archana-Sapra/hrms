import { useState } from 'react';
import { User, Shield, GraduationCap, type LucideIcon } from 'lucide-react';
import { useToast } from '../../ui/toast';
import BusyOverlay from '../../ui/BusyOverlay';
import { useEmployeeDocuments, useUploadDocument, useDeleteDocument } from '@/hooks/queries';
import { DocumentCard } from './documents/DocumentCard';
import { DeleteDocumentDialog } from './documents/DeleteDocumentDialog';
import type { Document, DocumentType } from '@/types';

interface DocumentTypeConfig {
    key: DocumentType;
    label: string;
    icon: LucideIcon;
    accept: string;
}

const DOCUMENT_TYPES: DocumentTypeConfig[] = [
    { key: 'profile_picture', label: 'Profile Photo', icon: User, accept: 'image/*' },
    { key: 'aadhaar', label: 'Aadhaar Card', icon: Shield, accept: '.pdf,.jpg,.jpeg,.png' },
    { key: 'pan', label: 'PAN Card', icon: Shield, accept: '.pdf,.jpg,.jpeg,.png' },
    { key: '10th_marksheet', label: '10th Certificate', icon: GraduationCap, accept: '.pdf,.jpg,.jpeg,.png' },
    { key: '12th_marksheet', label: '12th Certificate', icon: GraduationCap, accept: '.pdf,.jpg,.jpeg,.png' },
    { key: 'college_marksheet', label: 'College Certificate', icon: GraduationCap, accept: '.pdf,.jpg,.jpeg,.png' },
];

/**
 * Document slots for one employee.
 *
 * Cards size to their content and the grid is denser. The previous build gave
 * every slot `min-h-70` and `p-6` inside a `gap-6` three-column grid, so six
 * slots — five of them usually empty — filled the viewport with padding.
 */
export default function DocumentManager({
    employeeProfile,
}: {
    employeeProfile: { employeeId: string; firstName: string; lastName: string };
    /** Accepted for call-site compatibility; the tab owns its own navigation. */
    onBack?: () => void;
}) {
    const { toast } = useToast();
    const [pendingDelete, setPendingDelete] = useState<
        { doc: Document; label: string } | null
    >(null);

    const { data: documents = [], isLoading } = useEmployeeDocuments(
        employeeProfile?.employeeId,
        { enabled: !!employeeProfile?.employeeId },
    );

    const uploadMutation = useUploadDocument();
    const deleteMutation = useDeleteDocument();
    const busy = uploadMutation.isPending || deleteMutation.isPending;

    // No client-side size cap: the limit lives in the backend
    // (`utils/uploadLimits.ts`) and is enforced by multer and
    // `fileValidationService`, which returns the message shown below. Repeating
    // the number here would be a second source of truth that silently drifts
    // the moment the real one changes.
    const handleUpload = (docType: DocumentType, label: string, file: File) => {
        uploadMutation.mutate(
            { employeeId: employeeProfile.employeeId, documentType: docType, file },
            {
                onSuccess: () => toast({ title: `${label} uploaded` }),
                onError: (error: Error) => toast({
                    variant: 'error',
                    title: 'Upload failed',
                    description: error.message || 'Please try again.',
                }),
            },
        );
    };

    const handleConfirmDelete = () => {
        if (!pendingDelete) return;
        const { doc, label } = pendingDelete;

        deleteMutation.mutate(
            {
                documentId: doc._id,
                employeeId: employeeProfile.employeeId,
                documentType: doc.documentType,
            },
            {
                onSuccess: () => {
                    setPendingDelete(null);
                    toast({ title: `${label} deleted` });
                },
                onError: (error: Error) => {
                    setPendingDelete(null);
                    toast({
                        variant: 'error',
                        title: 'Delete failed',
                        description: error.message || 'Please try again.',
                    });
                },
            },
        );
    };

    if (isLoading) {
        return (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Loading documents">
                {DOCUMENT_TYPES.map((d) => (
                    <div key={d.key} className="h-32 animate-pulse rounded-xl bg-muted" />
                ))}
            </div>
        );
    }

    const uploadedCount = DOCUMENT_TYPES
        .filter((d) => documents.some((doc) => doc.documentType === d.key)).length;

    return (
        <div className="space-y-3">
            <p className="text-sm text-muted-foreground" aria-live="polite">
                {uploadedCount} of {DOCUMENT_TYPES.length} documents uploaded
            </p>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {DOCUMENT_TYPES.map((docType) => {
                    const doc = documents.find((d) => d.documentType === docType.key);
                    return (
                        <DocumentCard
                            key={docType.key}
                            docType={docType}
                            document={doc}
                            disabled={busy}
                            onUpload={(file) => handleUpload(docType.key, docType.label, file)}
                            onDelete={() => doc && setPendingDelete({ doc, label: docType.label })}
                        />
                    );
                })}
            </div>

            <DeleteDocumentDialog
                label={pendingDelete?.label ?? null}
                fileName={pendingDelete?.doc.fileName}
                onCancel={() => setPendingDelete(null)}
                onConfirm={handleConfirmDelete}
                isPending={deleteMutation.isPending}
            />

            <BusyOverlay show={uploadMutation.isPending} message="Uploading…" />
        </div>
    );
}
