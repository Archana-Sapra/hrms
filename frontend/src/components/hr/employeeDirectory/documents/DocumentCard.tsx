import { FileText, Upload, Eye, Plus, Trash2, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Document, DocumentType } from '@/types';

const isImage = (fileName: string): boolean => /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);

/**
 * One document slot: either a filled card or an upload target.
 *
 * The two states are deliberately different heights. The previous build forced
 * every card to `min-h-70` so an empty slot reserved as much room as a filled
 * one, which is why six mostly-empty slots filled the screen with dead space.
 * A slot that holds nothing should not claim the space of one that does.
 */
export function DocumentCard({
    docType, document: doc, disabled, onUpload, onDelete,
}: {
    docType: { key: DocumentType; label: string; icon: LucideIcon; accept: string };
    document?: Document;
    disabled: boolean;
    onUpload: (file: File) => void;
    onDelete: () => void;
}) {
    const { key, label, icon: Icon, accept } = docType;
    const inputId = `upload-${key}`;

    const fileInput = (
        <input
            id={inputId}
            type="file"
            accept={accept}
            className="sr-only"
            disabled={disabled}
            onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUpload(file);
                // Reset so re-picking the same filename still fires a change.
                e.target.value = '';
            }}
        />
    );

    if (!doc) {
        return (
            <div className="rounded-xl border border-dashed border-border bg-card transition-colors hover:border-primary/50">
                {/* The whole tile is the label, so the entire card is the tap
                    target rather than a small button inside a tall box. */}
                <label
                    htmlFor={inputId}
                    className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 p-4 text-center focus-within:ring-2 focus-within:ring-ring focus-within:outline-none"
                >
                    <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
                        {label}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Plus className="size-3.5" aria-hidden="true" />
                        Upload · PDF, JPG, PNG
                    </span>
                    {fileInput}
                </label>
            </div>
        );
    }

    const uploaded = new Date(doc.uploadedAt || doc.createdAt);
    const meta = isNaN(uploaded.getTime())
        ? ''
        : `Uploaded ${uploaded.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;

    return (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex items-center gap-3 p-3">
                {/* Thumbnail doubles as the type indicator, so the header row
                    the previous build spent on an icon-plus-label is gone. */}
                <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                    {isImage(doc.fileName) ? (
                        <img
                            src={doc.s3Url}
                            alt=""
                            loading="lazy"
                            className="size-full object-cover"
                        />
                    ) : (
                        <FileText className="size-5 text-muted-foreground" aria-hidden="true" />
                    )}
                </div>

                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{label}</p>
                    <p className="truncate text-xs text-muted-foreground" title={doc.fileName}>
                        {meta || doc.fileName}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-1 border-t border-border p-1.5">
                <Button asChild variant="ghost" className="h-11 flex-1 sm:h-9">
                    <a href={doc.s3Url} target="_blank" rel="noopener noreferrer">
                        <Eye className="size-4 mr-1.5" aria-hidden="true" />
                        View
                    </a>
                </Button>

                <Button asChild variant="ghost" className="h-11 flex-1 sm:h-9">
                    <label htmlFor={inputId} className="cursor-pointer">
                        <Upload className="size-4 mr-1.5" aria-hidden="true" />
                        Replace
                        {fileInput}
                    </label>
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    className="size-11 shrink-0 text-muted-foreground hover:text-destructive sm:size-9"
                    onClick={onDelete}
                    disabled={disabled}
                    aria-label={`Delete ${label}`}
                >
                    <Trash2 className="size-4" aria-hidden="true" />
                </Button>
            </div>
        </div>
    );
}
