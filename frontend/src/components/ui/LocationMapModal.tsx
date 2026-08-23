import { lazy, Suspense, useState } from 'react';
import { MapPin, LogIn, LogOut, ExternalLink, Copy, Check, MapPinOff } from 'lucide-react';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Leaflet and its CSS are ~150kB that only matter once someone opens a pin.
const MapCanvas = lazy(() =>
    import('./locationModal/MapCanvas').then((m) => ({ default: m.MapCanvas })),
);

interface Location {
    latitude?: number;
    longitude?: number;
}

interface AttendanceRecord {
    date?: string | Date;
    checkIn?: string | Date;
    checkOut?: string | Date;
    status?: string;
    location?: Location;
}

interface EmployeeProfile {
    firstName?: string;
    lastName?: string;
    employeeId?: string;
    department?: string;
}

const formatDate = (date?: string | Date): string => {
    if (!date) return '';
    const d = new Date(date);
    return isNaN(d.getTime())
        ? ''
        : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
};

const formatTime = (date?: string | Date): string => {
    if (!date) return '—';
    const d = new Date(date);
    return isNaN(d.getTime())
        ? '—'
        : d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const statusVariant = (status?: string) => {
    switch (status) {
        case 'present': return 'success' as const;
        case 'absent': return 'error' as const;
        case 'half-day': return 'primary' as const;
        default: return 'default' as const;
    }
};

/** One check-in time, shown inline rather than as its own card. */
function TimeStat({ icon: Icon, label, value }: {
    icon: typeof LogIn; label: string; value: string;
}) {
    return (
        <div className="flex items-center gap-1.5">
            <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium text-foreground">{value}</span>
        </div>
    );
}

/**
 * Where someone checked in from.
 *
 * The map is the content, so the map gets the space. The previous build stacked
 * four full-width chrome bands above it — a header, a gradient employee panel,
 * a three-card time/status grid, and a coordinates bar — which pushed the map
 * below the fold on a laptop and off-screen entirely on a phone. Everything
 * except the map is now one compact strip: identity in the header, times and
 * status in a single meta row, coordinates behind a copy button.
 *
 * Styling is on `@theme` tokens throughout; the previous build had roughly
 * twenty raw `slate-`/`blue-`/`yellow-` pairs and a `from-blue-50 to-cyan-50`
 * gradient that existed only on the light theme.
 */
export default function LocationMapModal({
    isOpen, onClose, attendanceRecord, employeeProfile,
}: {
    isOpen: boolean;
    onClose: () => void;
    attendanceRecord?: AttendanceRecord | null;
    employeeProfile?: EmployeeProfile | null;
}) {
    const [copied, setCopied] = useState(false);

    const lat = attendanceRecord?.location?.latitude;
    const lng = attendanceRecord?.location?.longitude;
    const hasLocation = typeof lat === 'number' && typeof lng === 'number'
        && Number.isFinite(lat) && Number.isFinite(lng);

    const name = [employeeProfile?.firstName, employeeProfile?.lastName]
        .filter(Boolean).join(' ') || 'Employee';
    const dateLabel = formatDate(attendanceRecord?.date);

    const coords = hasLocation ? `${lat.toFixed(6)}, ${lng.toFixed(6)}` : '';

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(coords);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            // Clipboard is unavailable over plain HTTP and in some in-app
            // browsers. The coordinates stay visible and selectable, so
            // failing quietly is better than an error toast for a convenience.
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            {/* Near-full-height on mobile so the map is usable; a comfortable
                panel on desktop. `p-0` because the map must reach the edges. */}
            <DialogContent className="flex h-[92dvh] max-h-[92dvh] w-[calc(100%-1rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:h-auto sm:max-h-[85vh]">
                <DialogHeader className="shrink-0 space-y-0 border-b border-border p-4 pr-12 text-left">
                    <DialogTitle className="truncate text-base font-semibold">{name}</DialogTitle>
                    <DialogDescription className="truncate text-xs">
                        {[employeeProfile?.employeeId, employeeProfile?.department, dateLabel]
                            .filter(Boolean).join(' · ')}
                    </DialogDescription>
                </DialogHeader>

                {/* One meta row replaces three stat cards. */}
                <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-border bg-muted/40 px-4 py-2.5 text-sm">
                    <TimeStat icon={LogIn} label="In" value={formatTime(attendanceRecord?.checkIn)} />
                    <TimeStat icon={LogOut} label="Out" value={formatTime(attendanceRecord?.checkOut)} />
                    {attendanceRecord?.status && (
                        <Badge variant={statusVariant(attendanceRecord.status)} className="ml-auto">
                            {attendanceRecord.status.charAt(0).toUpperCase() + attendanceRecord.status.slice(1)}
                        </Badge>
                    )}
                </div>

                {hasLocation ? (
                    <>
                        {/* The map takes every pixel the panel can spare. */}
                        <div className="min-h-0 flex-1 bg-muted">
                            <Suspense
                                fallback={
                                    <div className="flex h-full items-center justify-center">
                                        <span className="text-sm text-muted-foreground">Loading map…</span>
                                    </div>
                                }
                            >
                                <MapCanvas latitude={lat} longitude={lng} label={name} />
                            </Suspense>
                        </div>

                        <div className="flex shrink-0 items-center gap-2 border-t border-border p-3">
                            <MapPin className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                            <code className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
                                {coords}
                            </code>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-11 shrink-0 sm:size-9"
                                onClick={handleCopy}
                                aria-label={copied ? 'Coordinates copied' : 'Copy coordinates'}
                            >
                                {copied
                                    ? <Check className="size-4" aria-hidden="true" />
                                    : <Copy className="size-4" aria-hidden="true" />}
                            </Button>
                            <Button
                                variant="outline"
                                className="h-11 shrink-0 sm:h-9"
                                onClick={() => window.open(
                                    `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
                                    '_blank', 'noopener,noreferrer',
                                )}
                            >
                                <ExternalLink className="size-4 sm:mr-1.5" aria-hidden="true" />
                                <span className="sr-only sm:not-sr-only">Open in Maps</span>
                            </Button>
                        </div>
                    </>
                ) : (
                    /* One quiet line, not a three-paragraph yellow warning
                       panel. Missing location is normal, not an error. */
                    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
                        <MapPinOff className="size-8 text-muted-foreground opacity-40" aria-hidden="true" />
                        <div>
                            <p className="font-medium text-foreground">No location recorded</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Location is optional and depends on the employee granting permission
                                at check-in.
                            </p>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
