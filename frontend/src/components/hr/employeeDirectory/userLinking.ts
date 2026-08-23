import type { User } from '@/types';

/**
 * Accounts with no employee profile, any role — admin and HR staff have
 * profiles too. An unlinked employee account additionally cannot log in, which
 * login enforces on its own.
 */
export const orphanedUsers = (users: User[]) => users.filter((u) => !u.employeeId);

/** Matches name and email. `term` must be pre-trimmed and lowercased. */
export const matchesUserSearch = (user: User, term: string) => {
    if (!term) return true;
    return (
        user.name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term)
    );
};
