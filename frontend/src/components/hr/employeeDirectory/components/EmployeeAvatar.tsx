import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import type { Employee } from '@/types';

// Deterministic fallback tint so an employee without a photo keeps the same
// colour across renders. Mirrors ui/avatarIcon, which can only ever render the
// *logged-in* user's picture and so is not reusable for a list of employees.
const AVATAR_TINTS = [
    'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
    'bg-purple-500', 'bg-pink-500', 'bg-indigo-500',
];

export function employeeDisplayName(
    e: Pick<Employee, 'name' | 'firstName' | 'lastName'>,
): string {
    return e.name?.trim() || `${e.firstName ?? ''} ${e.lastName ?? ''}`.trim();
}

export function EmployeeAvatar({
    name,
    src,
    className = 'size-9',
}: {
    name: string;
    src?: string;
    className?: string;
}) {
    const trimmed = name.trim();
    const initial = trimmed.charAt(0).toUpperCase();
    const tint = AVATAR_TINTS[(trimmed.charCodeAt(0) || 0) % AVATAR_TINTS.length];

    return (
        <Avatar className={`${className} shrink-0`}>
            {src && <AvatarImage src={src} alt="" />}
            <AvatarFallback className={`${tint} text-white text-sm font-medium`}>
                {initial}
            </AvatarFallback>
        </Avatar>
    );
}
