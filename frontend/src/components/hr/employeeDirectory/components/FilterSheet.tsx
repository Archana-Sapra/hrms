import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { EMPLOYMENT_TYPES } from '../employmentTypes';
import type { useEmployeeFilters } from '../useEmployeeFilters';

type Filters = ReturnType<typeof useEmployeeFilters>;


export function FilterSheet({
    open, onOpenChange, filters, departments,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    filters: Filters;
    departments: string[];
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>Filter employees</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div>
                        <Label htmlFor="filter-dept">Department</Label>
                        <Select value={filters.department} onValueChange={filters.setDepartment}>
                            <SelectTrigger id="filter-dept" className="mt-1.5 w-full">
                                <SelectValue placeholder="All departments" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All departments</SelectItem>
                                {departments.map((d) => (
                                    <SelectItem key={d} value={d}>{d}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label htmlFor="filter-type">Employment type</Label>
                        <Select value={filters.employmentType} onValueChange={filters.setEmploymentType}>
                            <SelectTrigger id="filter-type" className="mt-1.5 w-full">
                                <SelectValue placeholder="All types" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All types</SelectItem>
                                {EMPLOYMENT_TYPES.map((t) => (
                                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label htmlFor="filter-link">Account status</Label>
                        <Select
                            value={filters.linkState}
                            onValueChange={(v) => filters.setLinkState(v as Filters['linkState'])}
                        >
                            <SelectTrigger id="filter-link" className="mt-1.5 w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All employees</SelectItem>
                                <SelectItem value="linked">Linked to a user</SelectItem>
                                <SelectItem value="unlinked">Not linked</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Filters apply live — "Done" only dismisses, so it isn't a primary action. */}
                <DialogFooter className="items-center gap-2 sm:justify-between sm:gap-2">
                    <p className="text-sm tabular-nums text-muted-foreground" aria-live="polite">
                        {filters.visible.length} of {filters.total} employees
                    </p>
                    <div className="flex items-center gap-2">
                        {filters.activeFilterCount > 0 && (
                            <Button
                                variant="ghost"
                                className="h-11"
                                onClick={filters.clearFilters}
                            >
                                Clear all
                            </Button>
                        )}
                        <Button variant="outline" className="h-11" onClick={() => onOpenChange(false)}>
                            Done
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
