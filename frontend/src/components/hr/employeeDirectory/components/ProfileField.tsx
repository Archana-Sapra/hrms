import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { sanitizeText } from '@/utils/sanitization';

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

function formatDisplay(value: unknown, type: ProfileFieldType): string {
    if (value === null || value === undefined || value === '') return '—';
    if (type === 'date') {
        const d = new Date(String(value));
        return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB');
    }
    if (typeof value === 'object') {
        const flattened = toEditableString(value);
        return flattened ? sanitizeText(flattened) : '—';
    }
    return sanitizeText(String(value));
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
        return (
            <div className="py-1.5">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {label}
                </dt>
                <dd className="mt-0.5 text-sm text-foreground">{formatDisplay(value, type)}</dd>
            </div>
        );
    }

    const stringValue = type === 'date' ? toDateInputValue(value) : toEditableString(value);

    return (
        <div className="py-1.5">
            <Label htmlFor={fieldId} className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
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
