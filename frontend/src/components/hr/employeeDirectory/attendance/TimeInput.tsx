import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface TimeInputProps {
    value: string;
    onChange: (value: string) => void;
    className?: string;
    /** Labels the group for assistive tech, e.g. "Check in time". */
    label: string;
    describedById?: string;
    invalid?: boolean;
}

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

type Parts = { hour: string; minute: string; period: 'AM' | 'PM' };

/**
 * Derive the 12-hour parts from the `datetime-local` string on every render.
 * The previous build mirrored them into state and re-synced with an effect,
 * which cascaded a render on each keystroke and could drift from the prop.
 */
function toParts(value: string): Parts {
    if (!value) return { hour: '', minute: '', period: 'AM' };
    const time = value.split('T')[1] ?? '';
    const [rawHour, rawMinute] = time.split(':');
    const h24 = Number(rawHour);
    if (!Number.isFinite(h24) || rawMinute === undefined) {
        return { hour: '', minute: '', period: 'AM' };
    }
    const period: 'AM' | 'PM' = h24 >= 12 ? 'PM' : 'AM';
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return {
        hour: String(h12).padStart(2, '0'),
        minute: rawMinute.slice(0, 2).padStart(2, '0'),
        period,
    };
}

function toValue(parts: Parts, previous: string): string {
    if (!parts.hour || !parts.minute) return '';
    let h24 = Number(parts.hour) % 12;
    if (parts.period === 'PM') h24 += 12;
    // Preserve the day the caller seeded; only the time is edited here.
    const baseDate = previous.split('T')[0] || new Date().toISOString().split('T')[0];
    return `${baseDate}T${String(h24).padStart(2, '0')}:${parts.minute}`;
}

export default function TimeInput({
    value, onChange, className = '', label, describedById, invalid,
}: TimeInputProps) {
    const parts = toParts(value);

    const update = (patch: Partial<Parts>) => {
        onChange(toValue({ ...parts, ...patch }, value));
    };

    return (
        <div role="group" aria-label={label} className={`flex items-center gap-2 ${className}`}>
            <Select value={parts.hour} onValueChange={(v) => update({ hour: v })}>
                <SelectTrigger
                    className="h-11 flex-1 sm:h-9"
                    aria-label={`${label}: hour`}
                    aria-invalid={invalid}
                    aria-describedby={describedById}
                >
                    <SelectValue placeholder="HH" />
                </SelectTrigger>
                <SelectContent>
                    {HOURS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                </SelectContent>
            </Select>

            <span aria-hidden="true" className="text-muted-foreground">:</span>

            <Select value={parts.minute} onValueChange={(v) => update({ minute: v })}>
                <SelectTrigger className="h-11 flex-1 sm:h-9" aria-label={`${label}: minute`}>
                    <SelectValue placeholder="MM" />
                </SelectTrigger>
                <SelectContent>
                    {MINUTES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
            </Select>

            <Select
                value={parts.period}
                onValueChange={(v) => update({ period: v === 'PM' ? 'PM' : 'AM' })}
            >
                <SelectTrigger className="h-11 w-20 sm:h-9" aria-label={`${label}: AM or PM`}>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="AM">AM</SelectItem>
                    <SelectItem value="PM">PM</SelectItem>
                </SelectContent>
            </Select>

            {value && (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-11 shrink-0 sm:size-9"
                    onClick={() => onChange('')}
                    aria-label={`Clear ${label.toLowerCase()}`}
                >
                    <X className="size-4" aria-hidden="true" />
                </Button>
            )}
        </div>
    );
}
