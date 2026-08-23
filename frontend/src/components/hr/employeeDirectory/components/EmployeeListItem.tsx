import { ChevronRight } from 'lucide-react';
import { EmployeeAvatar } from './EmployeeAvatar';
import { employeeDisplayName } from '../employeeName';
import type { Employee } from '@/types';

export function EmployeeListItem({
    employee,
    isSelected,
    isLinked,
    showDepartment = true,
    onSelect,
}: {
    employee: Employee;
    isSelected: boolean;
    isLinked: boolean;
    /** False when a department filter is active — every visible row would
     *  otherwise repeat the department already named in the filter chip. */
    showDepartment?: boolean;
    onSelect: (id: string) => void;
}) {
    const name = employeeDisplayName(employee);
    const meta = [employee.position, showDepartment ? employee.department : null]
        .filter(Boolean)
        .join(' · ');

    return (
        // A plain list, not a listbox: an ARIA `option` must not contain a
        // focusable element, and the row's control is a real button. Selection
        // is conveyed with aria-current on that button instead.
        <li>
            <button
                type="button"
                onClick={() => onSelect(employee._id)}
                aria-current={isSelected ? 'true' : undefined}
                className={`relative flex w-full items-center gap-3 py-2.5 pl-4 pr-3 text-left transition-colors
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring
                    ${isSelected ? 'bg-accent' : 'hover:bg-accent/50'}`}
            >
                {/* A left rule marks selection structurally, so the state does
                    not rest on a background tint alone. */}
                {isSelected && (
                    <span
                        aria-hidden="true"
                        className="absolute inset-y-0 left-0 w-0.5 bg-foreground"
                    />
                )}

                <EmployeeAvatar name={name} src={employee.profilePicture} className="size-9" />

                {/* Name carries the weight; the role line is smaller, lighter
                    and non-bold. Previously both sat at near-identical weight,
                    so nothing anchored the eye down the column. */}
                <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium text-foreground">{name}</span>
                        {/* A dot, not a "Unlinked" pill: this is a secondary
                            attribute of a row, and a full badge on every
                            unlinked employee shouted louder than the names. */}
                        {!isLinked && (
                            <span
                                title="No user account"
                                aria-label="No user account"
                                role="img"
                                className="size-1.5 shrink-0 rounded-full bg-muted-foreground/60"
                            />
                        )}
                    </span>
                    {meta && (
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                            {meta}
                        </span>
                    )}
                </span>

                <ChevronRight
                    className="size-4 shrink-0 text-muted-foreground/50 lg:hidden"
                    aria-hidden="true"
                />
            </button>
        </li>
    );
}
