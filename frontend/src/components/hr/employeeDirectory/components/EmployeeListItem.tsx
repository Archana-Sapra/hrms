import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EmployeeAvatar } from './EmployeeAvatar';
import { employeeDisplayName } from '../employeeName';
import type { Employee } from '@/types';

export function EmployeeListItem({
    employee,
    isSelected,
    isLinked,
    onSelect,
}: {
    employee: Employee;
    isSelected: boolean;
    isLinked: boolean;
    onSelect: (id: string) => void;
}) {
    const name = employeeDisplayName(employee);
    const meta = [employee.position, employee.department].filter(Boolean).join(' · ');

    return (
        <li role="option" aria-selected={isSelected}>
            <button
                type="button"
                onClick={() => onSelect(employee._id)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset
                    ${isSelected ? 'bg-accent' : 'hover:bg-accent/50'}`}
            >
                <EmployeeAvatar name={name} src={employee.profilePicture} className="size-10" />
                <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-foreground">{name}</span>
                    {meta && (
                        <span className="block truncate text-sm text-muted-foreground">{meta}</span>
                    )}
                </span>
                {!isLinked && (
                    <Badge variant="warning" className="shrink-0">Unlinked</Badge>
                )}
                <ChevronRight className="size-4 shrink-0 text-muted-foreground lg:hidden" aria-hidden="true" />
            </button>
        </li>
    );
}
