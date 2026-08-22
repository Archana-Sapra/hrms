import { useState } from 'react';
import type { Employee, User } from '@/types';
import { employeeDisplayName } from './components/EmployeeAvatar';

export type LinkState = 'all' | 'linked' | 'unlinked';

export function useEmployeeFilters({
    employees,
    users,
}: {
    employees: Employee[];
    users: User[];
}) {
    const [search, setSearch] = useState('');
    const [department, setDepartment] = useState('all');
    const [employmentType, setEmploymentType] = useState('all');
    const [linkState, setLinkState] = useState<LinkState>('all');

    // employeeId -> linked user. One pass instead of a find/some per row.
    const linkedMap = new Map<string, User>();
    for (const u of users) {
        if (u.employeeId) linkedMap.set(u.employeeId, u);
    }

    const term = search.trim().toLowerCase();
    const visible = employees
        .filter((e) => {
            if (term && !employeeDisplayName(e).toLowerCase().includes(term)) return false;
            if (department !== 'all' && e.department !== department) return false;
            if (employmentType !== 'all' && e.employmentType !== employmentType) return false;
            if (linkState !== 'all') {
                const isLinked = linkedMap.has(e.employeeId);
                if (linkState === 'linked' && !isLinked) return false;
                if (linkState === 'unlinked' && isLinked) return false;
            }
            return true;
        })
        .sort((a, b) =>
            employeeDisplayName(a).localeCompare(employeeDisplayName(b), undefined, {
                sensitivity: 'base',
            }),
        );

    const activeFilterCount =
        (department !== 'all' ? 1 : 0) +
        (employmentType !== 'all' ? 1 : 0) +
        (linkState !== 'all' ? 1 : 0);

    const clearFilters = () => {
        setDepartment('all');
        setEmploymentType('all');
        setLinkState('all');
    };

    return {
        search, setSearch,
        department, setDepartment,
        employmentType, setEmploymentType,
        linkState, setLinkState,
        activeFilterCount, clearFilters,
        visible, total: employees.length, linkedMap,
    };
}
