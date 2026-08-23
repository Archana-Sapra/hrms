import { ChevronRight } from 'lucide-react';
import { EmployeeAvatar } from './EmployeeAvatar';
import { employeeDisplayName } from '../employeeName';
import type { Employee } from '@/types';

const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** "Department of Investment Banking" -> "Investment Banking". */
const trimDepartmentNoise = (s: string) =>
    s.replace(/^\s*(the\s+)?department\s+of\s+/i, '').replace(/\s+department\s*$/i, '').trim() || s;

/**
 * Department, unless the position already says it — "Investment Banking Intern
 * · Investment Banking" spends the whole line saying one thing twice.
 */
function departmentSuffix({ position, department }: Employee) {
    if (!department) return null;
    const label = trimDepartmentNoise(department);
    if (!position) return label;

    const dept = normalise(label);
    const pos = normalise(position);
    if (!dept) return null;

    // Substring covers "Investment Banking Analyst" vs "Investment Banking".
    if (pos.includes(dept) || dept.includes(pos)) return null;

    // Otherwise drop it only when every word of the department already appears
    // in the position, so "Accounts" hides behind "Account Assistant" but
    // "Care Taker · Investment Banking" keeps both.
    const posWords = new Set(pos.split(' '));
    const deptWords = dept.split(' ');
    const singular = (w: string) => (w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w);
    const covered = deptWords.every(
        (w) => posWords.has(w) || posWords.has(singular(w)) || [...posWords].some((p) => singular(p) === singular(w)),
    );

    return covered ? null : label;
}

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
    /** False when a department filter is active — the chip already names it. */
    showDepartment?: boolean;
    onSelect: (id: string) => void;
}) {
    const name = employeeDisplayName(employee);
    const meta = [employee.position, showDepartment ? departmentSuffix(employee) : null]
        .filter(Boolean)
        .join(' · ');

    return (
        // Not role="option" — an ARIA option must not contain a focusable element.
        <li>
            <button
                type="button"
                onClick={() => onSelect(employee._id)}
                aria-current={isSelected ? 'true' : undefined}
                className={`relative flex w-full items-center gap-3 py-2.5 pl-4 pr-3 text-left transition-colors
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring
                    ${isSelected ? 'bg-accent' : 'hover:bg-accent/50'}`}
            >
                {/* Selection needs more than a background tint. */}
                {isSelected && (
                    <span
                        aria-hidden="true"
                        className="absolute inset-y-0 left-0 w-0.5 bg-foreground"
                    />
                )}

                <EmployeeAvatar name={name} src={employee.profilePicture} className="size-9" />

                <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium text-foreground">{name}</span>
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
