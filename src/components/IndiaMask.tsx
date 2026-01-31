import { Polygon, useMap, Pane } from "react-leaflet";
import { useEffect, useState } from "react";
import L from "leaflet";

/**
 * Component to create a solid black mask covering everything except the India boundary.
 * Renders on a dedicated pane above tiles and labels for a 100% clean hide effect.
 */
const IndiaMask = () => {
    const [indiaGeoJson, setIndiaGeoJson] = useState<any>(null);
    const map = useMap();

    useEffect(() => {
        // Fetch the local GeoJSON file from public folder
        fetch("/data/india.geojson")
            .then((res) => res.json())
            .then((data) => setIndiaGeoJson(data))
            .catch((err) => console.error("Failed to load India GeoJSON:", err));
    }, []);

    if (!indiaGeoJson) return null;

    // Define world boundary rings in clockwise direction
    const worldOuterBounds: L.LatLngExpression[] = [
        [-90, -180],
        [-90, 180],
        [90, 180],
        [90, -180],
    ];

    const holes: L.LatLngExpression[][] = [];

    indiaGeoJson.features.forEach((feature: any) => {
        if (feature.geometry.type === "Polygon") {
            feature.geometry.coordinates.forEach((ring: any) => {
                const latLngs = ring.map((coord: any) => [coord[1], coord[0]] as L.LatLngExpression);
                holes.push(latLngs);
            });
        } else if (feature.geometry.type === "MultiPolygon") {
            feature.geometry.coordinates.forEach((polygon: any) => {
                polygon.forEach((ring: any) => {
                    const latLngs = ring.map((coord: any) => [coord[1], coord[0]] as L.LatLngExpression);
                    holes.push(latLngs);
                });
            });
        }
    });

    return (
        <Pane name="maskPane" style={{ zIndex: 650, pointerEvents: "none" }}>
            <Polygon
                positions={[worldOuterBounds, ...holes]}
                pathOptions={{
                    fillColor: "#ffffff", // Pure white background
                    fillOpacity: 0.85,     // High opacity for a clean hide
                    stroke: false,
                    interactive: false,
                }}
            />
        </Pane>
    );
};

export default IndiaMask;
