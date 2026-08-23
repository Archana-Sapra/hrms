/**
 * Employment type values as stored by the API, paired with the labels a person
 * should actually read. The raw values (`fulltime`, `intern`) were rendering
 * directly in the filter dropdown and in the active-filter chip.
 *
 * Kept out of FilterSheet.tsx so that file exports only its component — mixing
 * constant and component exports breaks Fast Refresh.
 */
export const EMPLOYMENT_TYPES: ReadonlyArray<{ value: string; label: string }> = [
    { value: 'fulltime', label: 'Full time' },
    { value: 'intern', label: 'Intern' },
    { value: 'remote', label: 'Remote' },
];

export const employmentTypeLabel = (value: string) =>
    EMPLOYMENT_TYPES.find((t) => t.value === value)?.label ?? value;
