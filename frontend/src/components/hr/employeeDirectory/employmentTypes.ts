/**
 * API values paired with display labels.
 *
 * Kept out of FilterSheet.tsx — mixing constant and component exports breaks Fast Refresh.
 */
export const EMPLOYMENT_TYPES: ReadonlyArray<{ value: string; label: string }> = [
    { value: 'fulltime', label: 'Full time' },
    { value: 'intern', label: 'Intern' },
    { value: 'remote', label: 'Remote' },
];

export const employmentTypeLabel = (value: string) =>
    EMPLOYMENT_TYPES.find((t) => t.value === value)?.label ?? value;
