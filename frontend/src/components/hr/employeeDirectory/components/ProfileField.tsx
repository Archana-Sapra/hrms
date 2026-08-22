import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
export type ProfileFieldType = 'text' | 'email' | 'tel' | 'date' | 'select';

// Employee.address is `string | { street?, city?, state?, pincode? }`. The
// legacy object form must never reach an <input>: String(obj) yields
// "[object Object]", which the save path would then persist over the real
// address. Flatten it to a comma-joined line instead so it round-trips as text.
function toEditableString(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') {
        const parts = Object.values(value as Record<string, unknown>)
            .filter((v): v is string => typeof v === 'string' && v.trim() !== '');
        return parts.join(', ');
    }
    return String(value);
}

// No sanitizeText here. React escapes text nodes on render, and sanitizeText
// escapes for HTML *attribute* contexts — running both turned an employee ID of
// "CFG/CIAML/15FBD" into the literal "CFG&#x2F;CIAML&#x2F;15FBD" on screen.
// Values render as-is; JSX handles the escaping.
function formatDisplay(value: unknown, type: ProfileFieldType): string {
    if (value === null || value === undefined || value === '') return '—';
    if (type === 'date') {
        const d = new Date(String(value));
        return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB');
    }
    if (typeof value === 'object') {
        return toEditableString(value) || '—';
    }
    return String(value);
}

function toDateInputValue(value: unknown): string {
    if (!value) return '';
    const d = new Date(String(value));
    return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
}

export function ProfileField({
    label, name, value, type = 'text', options = [], isEditing, error, onChange,
}: {
    label: string;
    name: string;
    value: unknown;
    type?: ProfileFieldType;
    options?: string[];
    isEditing: boolean;
    error?: string;
    onChange: (name: string, value: string) => void;
}) {
    const fieldId = `field-${name}`;
    const errorId = `${fieldId}-error`;

    if (!isEditing) {
        const display = formatDisplay(value, type);
        const isEmpty = display === '—';
        return (
            // Each field is one cell of its section's grid, so the label stacks
            // above the value. No per-cell rule: with a multi-column grid the
            // last cell of each row is not `:last-child`, so borders stranded
            // themselves mid-row. Spacing separates the fields instead.
            <div className="py-2">
                <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
                <dd
                    className={`mt-1 text-sm wrap-break-word ${
                        isEmpty ? 'text-muted-foreground/60' : 'text-foreground'
                    }`}
                >
                    {display}
                </dd>
            </div>
        );
    }

    const stringValue = type === 'date' ? toDateInputValue(value) : toEditableString(value);

    return (
        <div className="py-1.5">
            <Label htmlFor={fieldId} className="text-xs font-medium text-muted-foreground">
                {label}
            </Label>
            {type === 'select' ? (
                <Select value={stringValue} onValueChange={(v) => onChange(name, v)}>
                    <SelectTrigger id={fieldId} className="mt-1" aria-invalid={!!error} aria-describedby={error ? errorId : undefined}>
                        <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent>
                        {options.map((o) => (
                            <SelectItem key={o} value={o}>{o}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            ) : (
                <Input
                    id={fieldId}
                    type={type}
                    value={stringValue}
                    onChange={(e) => onChange(name, e.target.value)}
                    aria-invalid={!!error}
                    aria-describedby={error ? errorId : undefined}
                    className="mt-1"
                />
            )}
            {error && (
                <p id={errorId} className="mt-1 text-xs text-destructive">{error}</p>
            )}
        </div>
    );
}
