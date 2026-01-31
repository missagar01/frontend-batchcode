import React, { useMemo, useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import IndiaMask from "./IndiaMask";

const INDIA_BOUNDS: L.LatLngBoundsExpression = [
    [6.0, 68.0],   // SouthWest
    [38.0, 97.0],  // NorthEast
];

const DEFAULT_CENTER: L.LatLngExpression = [22.0, 80.0];
const DEFAULT_ZOOM = 5;
const MIN_ZOOM = 4;
const MAX_ZOOM = 10;

// ✅ CARTO Voyager tiles
const TILE_URL = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
const SUBDOMAINS = "abcd";

interface IndiaMapProps {
    data: Array<{ state: string; count: number }>;
    onStateClick?: (state: string) => void;
}

// Coordinates for Indian States (Centroids)
const STATE_COORDINATES: Record<string, { lat: number; lng: number }> = {
    "ANDHRA PRADESH": { lat: 15.9129, lng: 79.74 },
    "ARUNACHAL PRADESH": { lat: 28.218, lng: 94.7278 },
    "ASSAM": { lat: 26.2006, lng: 92.9376 },
    "BIHAR": { lat: 25.0961, lng: 85.3131 },
    "CHHATTISGARH": { lat: 21.2787, lng: 81.8661 },
    "CHANDIGARH": { lat: 30.7333, lng: 76.7794 },
    "DELHI": { lat: 28.7041, lng: 77.1025 },
    "GOA": { lat: 15.2993, lng: 74.124 },
    "GUJARAT": { lat: 22.2587, lng: 71.1924 },
    "HARYANA": { lat: 29.0588, lng: 76.0856 },
    "HIMACHAL PRADESH": { lat: 31.1048, lng: 77.1734 },
    "JAMMU & KASHMIR": { lat: 33.7782, lng: 76.5762 },
    "JHARKHAND": { lat: 23.6102, lng: 85.2799 },
    "KARNATAKA": { lat: 15.3173, lng: 75.7139 },
    "KERALA": { lat: 10.8505, lng: 76.2711 },
    "LADAKH": { lat: 34.1526, lng: 77.577 },
    "LAKSHADWEEP": { lat: 10.5667, lng: 72.6417 },
    "MADHYA PRADESH": { lat: 22.9734, lng: 78.6569 },
    "MAHARASHTRA": { lat: 19.7515, lng: 75.7139 },
    "MANIPUR": { lat: 24.6637, lng: 93.9063 },
    "MEGHALAYA": { lat: 25.467, lng: 91.3662 },
    "MIZORAM": { lat: 23.1645, lng: 92.9376 },
    "NAGALAND": { lat: 26.1584, lng: 94.5624 },
    "ODISHA": { lat: 20.9517, lng: 85.0985 },
    "PUNJAB": { lat: 31.1471, lng: 75.3412 },
    "RAJASTHAN": { lat: 27.0238, lng: 74.2179 },
    "SIKKIM": { lat: 27.533, lng: 88.5122 },
    "TAMIL NADU": { lat: 11.1271, lng: 78.6569 },
    "TELANGANA": { lat: 18.1124, lng: 79.0193 },
    "TRIPURA": { lat: 23.9408, lng: 91.9882 },
    "UTTAR PRADESH": { lat: 26.8467, lng: 80.9462 },
    "UTTARAKHAND": { lat: 30.0668, lng: 79.0193 },
    "WEST BENGAL": { lat: 22.9868, lng: 87.855 },
    "ANDAMAN AND NICOBAR ISLANDS": { lat: 11.7401, lng: 92.6586 },
    "DADRA AND NAGAR HAVELI AND DAMAN AND DIU": { lat: 20.1809, lng: 73.0169 },
    "PUDUCHERRY": { lat: 11.9416, lng: 79.8083 },
};

const MapController = () => {
    const map = useMap();

    useEffect(() => {
        const handleResize = () => {
            const bounds = L.latLngBounds(INDIA_BOUNDS);

            // Dynamic padding based on screen width
            const width = window.innerWidth;
            const padding: L.PointExpression = width < 768 ? [5, 5] : [20, 20];

            map.invalidateSize();
            map.setMaxBounds(bounds);
            map.options.maxBoundsViscosity = 1.0;
            map.setMinZoom(MIN_ZOOM);
            map.setMaxZoom(MAX_ZOOM);

            // Fit India nicely
            map.fitBounds(bounds, { padding, animate: true });
        };

        // Initial fit
        handleResize();

        // Delay to handle container transition/mounting
        const timer = setTimeout(handleResize, 500);

        window.addEventListener("resize", handleResize);
        return () => {
            window.removeEventListener("resize", handleResize);
            clearTimeout(timer);
        };
    }, [map]);

    return null;
};

export const IndiaMap: React.FC<IndiaMapProps> = ({ data, onStateClick }) => {
    const totalCount = useMemo(() => data.reduce((acc, curr) => acc + curr.count, 0), [data]);

    const mapData = useMemo(() => {
        return data
            .map((item) => {
                const stateKey = (item.state || "").toString().toUpperCase().trim();
                let coords = STATE_COORDINATES[stateKey];

                if (!coords) {
                    const key = Object.keys(STATE_COORDINATES).find((k) => k.includes(stateKey) || stateKey.includes(k));
                    if (key) coords = STATE_COORDINATES[key];
                }

                if (!coords) return null;

                const percent = totalCount > 0 ? ((item.count / totalCount) * 100).toFixed(1) : "0";
                return { ...item, ...coords, percent };
            })
            .filter((x): x is NonNullable<typeof x> => x !== null);
    }, [data, totalCount]);

    return (
        <div className="w-full h-full bg-white rounded-xl overflow-hidden relative z-0 border border-slate-200 shadow-sm">
            <MapContainer
                center={DEFAULT_CENTER}
                zoom={DEFAULT_ZOOM}
                minZoom={MIN_ZOOM}
                maxZoom={MAX_ZOOM}
                maxBounds={INDIA_BOUNDS}
                maxBoundsViscosity={1.0}
                worldCopyJump={false}
                scrollWheelZoom={true}
                style={{ height: "100%", width: "100%", zIndex: 0 }}
                attributionControl={false}
                doubleClickZoom={false}
                className="leaflet-map"
            >
                <TileLayer
                    url={TILE_URL}
                    subdomains={SUBDOMAINS}
                    attribution={ATTRIBUTION}
                    noWrap={true}
                />

                <IndiaMask />
                <MapController />

                {mapData.map((item) => {
                    const percentVal = parseFloat(item.percent);
                    const radius = 10 + Math.min(percentVal, 50);

                    let color = "#10b981"; // emerald-500
                    if (percentVal > 30) color = "#064e3b"; // emerald-900
                    else if (percentVal > 15) color = "#059669"; // emerald-600
                    else if (percentVal > 5) color = "#34d399"; // emerald-400

                    return (
                        <CircleMarker
                            key={item.state}
                            center={[item.lat, item.lng]}
                            radius={radius}
                            fillOpacity={0.7}
                            fillColor={color}
                            stroke={true}
                            color="#fff"
                            weight={2}
                            eventHandlers={{
                                click: () => onStateClick?.(item.state),
                                mouseover: (e) => (e.target as any).openPopup(),
                                mouseout: (e) => (e.target as any).closePopup(),
                            }}
                        >
                            <Popup closeButton={false} autoPan={true} className="font-sans">
                                <div className="p-1 text-center min-w-[120px]">
                                    <h3 className="font-bold text-sm text-slate-800 uppercase border-b border-slate-100 pb-1 mb-1">
                                        {item.state}
                                    </h3>
                                    <div className="flex justify-between items-center text-xs mt-1">
                                        <span className="text-slate-500 font-medium">Volume</span>
                                        <span className="font-bold text-slate-900">{item.count}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs mt-1">
                                        <span className="text-slate-500 font-medium">Share</span>
                                        <span className="font-bold text-emerald-600">{item.percent}%</span>
                                    </div>
                                </div>
                            </Popup>
                        </CircleMarker>
                    );
                })}
            </MapContainer>

            {/* Legend */}
            <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur p-3 md:p-4 rounded-xl shadow-xl border border-slate-200 z-[400] text-[10px] md:text-xs max-w-[150px] md:max-w-none">
                <div className="font-bold text-slate-800 mb-1 md:mb-2 uppercase tracking-widest text-[9px] md:text-[10px]">Dispatch Volume</div>
                <div className="space-y-1.5 md:space-y-2">
                    <div className="flex items-center gap-2 md:gap-3">
                        <span className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-[#064e3b] shadow-sm border border-white"></span>
                        <span className="text-slate-600 font-medium whitespace-nowrap">High (&gt;30%)</span>
                    </div>
                    <div className="flex items-center gap-2 md:gap-3">
                        <span className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-[#059669] shadow-sm border border-white"></span>
                        <span className="text-slate-600 font-medium whitespace-nowrap">Medium (15-30%)</span>
                    </div>
                    <div className="flex items-center gap-2 md:gap-3">
                        <span className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-[#34d399] shadow-sm border border-white"></span>
                        <span className="text-slate-600 font-medium whitespace-nowrap">Low (5-15%)</span>
                    </div>
                    <div className="flex items-center gap-2 md:gap-3">
                        <span className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-[#10b981] shadow-sm border border-white"></span>
                        <span className="text-slate-600 font-medium whitespace-nowrap">Minimal (&lt;5%)</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
