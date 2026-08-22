import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Leave } from '@/types';

function formatRange(leave: Leave): string {
    const start = new Date(leave.startDate).toLocaleDateString('en-GB');
    if (!leave.endDate || leave.endDate === leave.startDate) return start;
    return `${start} – ${new Date(leave.endDate).toLocaleDateString('en-GB')}`;
}

export function LeaveActionDialog({
    leave, action, onOpenChange, onConfirm, isPending,
}: {
    leave: Leave | null;
    action: 'approved' | 'rejected' | null;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    isPending: boolean;
}) {
    if (!leave || !action) return null;
    const approving = action === 'approved';

    return (
        <Dialog open onOpenChange={onOpenChange}>
            <DialogContent
                className="sm:max-w-md"
                onEscapeKeyDown={(e) => { if (isPending) e.preventDefault(); }}
                onPointerDownOutside={(e) => { if (isPending) e.preventDefault(); }}
                onInteractOutside={(e) => { if (isPending) e.preventDefault(); }}
            >
                <DialogHeader>
                    <DialogTitle>{approving ? 'Approve leave request?' : 'Reject leave request?'}</DialogTitle>
                    <DialogDescription>
                        {approving
                            ? 'The employee will be notified and their attendance updated.'
                            : 'The employee will be notified that this request was rejected.'}
                    </DialogDescription>
                </DialogHeader>

                <dl className="space-y-2 rounded-lg border border-border bg-muted/40 p-3 text-sm">
                    <div className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">Type</dt>
                        <dd className="font-medium text-foreground">{leave.leaveType}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">Dates</dt>
                        <dd className="font-medium text-foreground">{formatRange(leave)}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                        <dt className="shrink-0 text-muted-foreground">Reason</dt>
                        <dd className="text-right text-foreground">{leave.reason || '—'}</dd>
                    </div>
                </dl>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                        Cancel
                    </Button>
                    <Button
                        variant={approving ? 'default' : 'destructive'}
                        onClick={onConfirm}
                        disabled={isPending}
                    >
                        {isPending ? 'Saving…' : approving ? 'Approve' : 'Reject'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
