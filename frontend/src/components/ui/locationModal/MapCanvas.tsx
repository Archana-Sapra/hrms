import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Leaflet resolves its default marker sprites from a relative path that Vite
// does not rewrite, so they 404 and the pin renders blank. Point them at the
// bundled assets instead of a CDN — the previous build loaded all three from
// cdnjs, which broke the map for anyone offline or behind a strict CSP.
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const pinIcon = new L.Icon({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    shadowSize: [41, 41],
});

/**
 * The map itself. Leaflet measures its container on mount, and inside a dialog
 * that mount happens while the panel is still animating in — so it reads a
 * collapsed size and renders grey tiles. `invalidateSize` after the transition
 * settles is the documented fix.
 *
 * This is a genuine effect (imperative DOM measurement on a third-party
 * instance), not state mirroring, so it does not trip `set-state-in-effect`.
 */
export function MapCanvas({
    latitude, longitude, label,
}: {
    latitude: number;
    longitude: number;
    label: string;
}) {
    const mapRef = useRef<L.Map | null>(null);

    useEffect(() => {
        const id = window.setTimeout(() => mapRef.current?.invalidateSize(), 150);
        return () => window.clearTimeout(id);
    }, []);

    return (
        <MapContainer
            center={[latitude, longitude]}
            zoom={16}
            scrollWheelZoom={false}
            style={{ height: '100%', width: '100%' }}
            ref={(instance) => { if (instance) mapRef.current = instance; }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={[latitude, longitude]} icon={pinIcon} title={label} />
        </MapContainer>
    );
}
