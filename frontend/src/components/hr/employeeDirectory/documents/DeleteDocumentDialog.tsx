import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

/**
 * Deleting a document is irreversible and the file is gone from S3, so it gets
 * a confirmation. The previous build fired the delete straight from a bare `X`
 * on the card — a single mis-tap on a phone, with no undo.
 */
export function DeleteDocumentDialog({
    label, fileName, onCancel, onConfirm, isPending,
}: {
    label: string | null;
    fileName?: string;
    onCancel: () => void;
    onConfirm: () => void;
    isPending: boolean;
}) {
    if (!label) return null;

    return (
        <Dialog open onOpenChange={(open) => { if (!open && !isPending) onCancel(); }}>
            <DialogContent
                className="sm:max-w-md"
                onEscapeKeyDown={(e) => { if (isPending) e.preventDefault(); }}
                onInteractOutside={(e) => { if (isPending) e.preventDefault(); }}
            >
                <DialogHeader>
                    <DialogTitle>Delete {label}?</DialogTitle>
                    <DialogDescription>
                        {fileName ? `“${fileName}” will be permanently removed. ` : ''}
                        This cannot be undone.
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        variant="outline"
                        className="h-11 sm:h-9"
                        onClick={onCancel}
                        disabled={isPending}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        className="h-11 sm:h-9"
                        onClick={onConfirm}
                        disabled={isPending}
                    >
                        {isPending ? 'Deleting…' : 'Delete'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
