import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useUpdateLeaveStatus } from '@/hooks/queries';
import { useToast } from '@/components/ui/toast';
import { LeaveActionDialog } from './components/LeaveActionDialog';
import type { Leave } from '@/types';

type LeaveAction = 'approved' | 'rejected';

function statusVariant(status: string) {
    if (status === 'approved') return 'success' as const;
    if (status === 'rejected') return 'error' as const;
    return 'warning' as const;
}

function formatRange(leave: Leave): string {
    const start = new Date(leave.startDate).toLocaleDateString('en-GB');
    if (!leave.endDate || leave.endDate === leave.startDate) return start;
    return `${start} – ${new Date(leave.endDate).toLocaleDateString('en-GB')}`;
}

export default function LeaveSection({ leaves }: { leaves: Leave[] }) {
    const { toast } = useToast();
    const updateStatus = useUpdateLeaveStatus();
    const [pendingAction, setPendingAction] = useState<{ leave: Leave; action: LeaveAction } | null>(null);

    const handleConfirm = () => {
        if (!pendingAction) return;
        const { leave, action } = pendingAction;
        updateStatus.mutate(
            { leaveId: leave._id, status: action },
            {
                onSuccess: () => {
                    toast({
                        title: action === 'approved' ? 'Leave approved' : 'Leave rejected',
                        description: `${leave.leaveType} · ${formatRange(leave)}`,
                    });
                    setPendingAction(null);
                },
                onError: (error: Error) => {
                    toast({
                        variant: 'destructive',
                        title: 'Could not update request',
                        description: error.message || 'Please try again.',
                    });
                },
            },
        );
    };

    if (leaves.length === 0) {
        return (
            <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                No leave requests yet.
            </p>
        );
    }

    const sorted = [...leaves].sort(
        (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
    );

    return (
        <>
            {/* Mobile: cards */}
            <ul className="space-y-2 md:hidden">
                {sorted.map((leave) => (
                    <li key={leave._id} className="rounded-lg border border-border bg-card p-3">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <p className="font-medium text-foreground">{leave.leaveType}</p>
                                <p className="text-sm text-muted-foreground">{formatRange(leave)}</p>
                            </div>
                            <Badge variant={statusVariant(leave.status)}>{leave.status}</Badge>
                        </div>
                        {leave.reason && (
                            <p className="mt-2 text-sm text-muted-foreground">{leave.reason}</p>
                        )}
                        {leave.status === 'pending' && (
                            <div className="mt-3 flex gap-2">
                                <Button
                                    size="sm"
                                    className="h-11 flex-1"
                                    onClick={() => setPendingAction({ leave, action: 'approved' })}
                                >
                                    Approve
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-11 flex-1"
                                    onClick={() => setPendingAction({ leave, action: 'rejected' })}
                                >
                                    Reject
                                </Button>
                            </div>
                        )}
                    </li>
                ))}
            </ul>

            {/* Desktop: table */}
            <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
                <table className="min-w-full text-sm">
                    <thead className="bg-muted/50">
                        <tr>
                            <th scope="col" className="p-3 text-left font-medium text-muted-foreground">Type</th>
                            <th scope="col" className="p-3 text-left font-medium text-muted-foreground">Period</th>
                            <th scope="col" className="p-3 text-left font-medium text-muted-foreground">Status</th>
                            <th scope="col" className="p-3 text-left font-medium text-muted-foreground">Reason</th>
                            <th scope="col" className="p-3 text-right font-medium text-muted-foreground">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {sorted.map((leave) => (
                            <tr key={leave._id} className="hover:bg-accent/40">
                                <td className="p-3 whitespace-nowrap text-foreground">{leave.leaveType}</td>
                                <td className="p-3 whitespace-nowrap text-foreground">{formatRange(leave)}</td>
                                <td className="p-3"><Badge variant={statusVariant(leave.status)}>{leave.status}</Badge></td>
                                <td className="max-w-xs truncate p-3 text-muted-foreground" title={leave.reason}>
                                    {leave.reason || '—'}
                                </td>
                                <td className="p-3 text-right whitespace-nowrap">
                                    {leave.status === 'pending' && (
                                        <div className="flex justify-end gap-2">
                                            <Button size="sm" onClick={() => setPendingAction({ leave, action: 'approved' })}>
                                                Approve
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={() => setPendingAction({ leave, action: 'rejected' })}>
                                                Reject
                                            </Button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <LeaveActionDialog
                leave={pendingAction?.leave ?? null}
                action={pendingAction?.action ?? null}
                onOpenChange={(open) => {
                    // Ignore dismissal (X, Escape, overlay click) while the
                    // mutation is in flight — the request completes regardless,
                    // and closing early strips the pending feedback.
                    if (!open && !updateStatus.isPending) setPendingAction(null);
                }}
                onConfirm={handleConfirm}
                isPending={updateStatus.isPending}
            />
        </>
    );
}
