import type { Employee } from '@/types';
import { employeeDisplayName } from './employeeName';

/**
 * Matches name, email and employee ID. `term` must be pre-trimmed and lowercased.
 *
 * Plain substring tests, never regex: employeeId contains slashes (CFG/CIAML/15FBD).
 */
export const matchesEmployeeSearch = (employee: Employee, term: string) => {
    if (!term) return true;
    return (
        employeeDisplayName(employee).toLowerCase().includes(term) ||
        (employee.email ?? '').toLowerCase().includes(term) ||
        (employee.employeeId ?? '').toLowerCase().includes(term)
    );
};
