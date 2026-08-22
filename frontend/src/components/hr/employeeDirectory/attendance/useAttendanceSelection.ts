import { useState } from 'react';
import type { AttendanceRow } from './types';

/**
 * Bulk selection keyed by date string rather than `_id`, because absent days
 * have no stored record yet and would otherwise be unselectable — those are
 * exactly the rows HR needs to correct.
 */
export function useAttendanceSelection(filtered: AttendanceRow[]) {
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());

    const toggle = (date: string, selected: boolean) => {
        setSelectedDates((prev) => {
            const next = new Set(prev);
            if (selected) next.add(date);
            else next.delete(date);
            return next;
        });
    };

    // Operates on every record matching the current filter, not just the
    // visible page — "select all" that only took the page was a foot-gun.
    const toggleAll = (selected: boolean) => {
        setSelectedDates(selected ? new Set(filtered.map((r) => r.date)) : new Set());
    };

    const clear = () => setSelectedDates(new Set());

    const setMode = (next: boolean) => {
        setSelectionMode(next);
        if (!next) clear();
    };

    const allSelected =
        filtered.length > 0 && filtered.every((r) => selectedDates.has(r.date));

    return {
        selectionMode,
        setSelectionMode: setMode,
        selectedDates,
        toggle,
        toggleAll,
        clear,
        allSelected,
    };
}
