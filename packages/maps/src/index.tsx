import React, { useEffect, useRef } from "react";
import maplibregl, { Map as MapLibreMap } from "maplibre-gl";

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  type: "bin" | "truck" | "dump";
  color?: string;
  popupHtml?: string;
}

export interface MapLibreViewProps {
  center?: [number, number];
  zoom?: number;
  markers?: MapMarker[];
  routeCoordinates?: [number, number][];
  className?: string;
  mapTilerKey?: string;
}

export const MapLibreView: React.FC<MapLibreViewProps> = ({
  center = [77.6200, 12.9520],
  zoom = 12,
  markers = [],
  routeCoordinates = [],
  className = "w-full h-full",
  mapTilerKey
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<MapLibreMap | null>(null);

  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return;

    // Use dark OSM style or MapTiler
    const styleUrl = mapTilerKey
      ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${mapTilerKey}`
      : "https://tiles.openfreemap.org/styles/dark";

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: styleUrl,
      center: center,
      zoom: zoom,
      attributionControl: false
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // Update markers
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    markers.forEach((m) => {
      const el = document.createElement("div");
      el.className = "wastex-marker";
      el.style.width = m.type === "truck" ? "18px" : "14px";
      el.style.height = m.type === "truck" ? "18px" : "14px";
      el.style.backgroundColor = m.color || (m.type === "dump" ? "#f43f5e" : "#10b981");
      el.style.borderRadius = "50%";
      el.style.border = "2px solid #ffffff";
      el.style.boxShadow = "0 0 10px rgba(0,0,0,0.5)";

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([m.lng, m.lat])
        .addTo(map);

      if (m.popupHtml) {
        marker.setPopup(new maplibregl.Popup({ offset: 15 }).setHTML(m.popupHtml));
      }
    });
  }, [markers]);

  return <div ref={mapContainer} className={className} />;
};
