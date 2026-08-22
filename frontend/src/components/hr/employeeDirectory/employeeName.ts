import type { Employee } from '@/types';

export function employeeDisplayName(
    e: Pick<Employee, 'name' | 'firstName' | 'lastName'>,
): string {
    return e.name?.trim() || `${e.firstName ?? ''} ${e.lastName ?? ''}`.trim();
}
