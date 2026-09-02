"use client";

import { useEffect, useRef } from "react";
import maplibregl, { Map as MlMap, Marker, LngLatBounds } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { styleFor } from "./mapStyle";
import type { LiveVehicle } from "@/store/slices/liveVehicles.slice";

interface LiveMapProps {
  vehicles: LiveVehicle[];
  routeGeometry?: { coordinates: [number, number][] } | null;
  focusVehicleId?: string | null;
  className?: string;
}

const occupancyColor = (level?: string | null): string => {
  switch ((level ?? "").toUpperCase()) {
    case "CROWDED":
    case "HIGH":
      return "#dc2626";
    case "MODERATE":
    case "MEDIUM":
      return "#d97706";
    default:
      return "#2563eb";
  }
};

function vehicleEl(v: LiveVehicle): HTMLElement {
  const el = document.createElement("div");
  el.style.cssText =
    "width:16px;height:16px;border-radius:9999px;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center";
  el.style.background = occupancyColor(v.occupancyLevel);
  if (v.heading != null) {
    const arrow = document.createElement("div");
    arrow.style.cssText =
      "position:absolute;width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-bottom:7px solid #fff;transform-origin:center";
    arrow.style.transform = `rotate(${v.heading}deg) translateY(-11px)`;
    el.appendChild(arrow);
  }
  return el;
}

export function LiveMap({
  vehicles,
  routeGeometry,
  focusVehicleId,
  className,
}: LiveMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MlMap | null>(null);
  const markers = useRef<Map<string, Marker>>(new Map());
  const readyRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const activeMarkers = markers.current;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleFor(),
      center: [77.59, 12.97],
      zoom: 11,
      maxZoom: 18,
      attributionControl: { compact: true },
    });
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-right"
    );
    map.on("load", () => {
      readyRef.current = true;
      map.addSource("route", {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: { type: "LineString", coordinates: [] },
          properties: {},
        },
      });
      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        paint: {
          "line-color": "#2563eb",
          "line-width": 4,
          "line-opacity": 0.7,
        },
      });
    });
    mapRef.current = map;
    return () => {
      activeMarkers.forEach((m) => m.remove());
      activeMarkers.clear();
      map.remove();
      mapRef.current = null;
      readyRef.current = false;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    const coords = routeGeometry?.coordinates ?? [];
    const src = map.getSource("route") as maplibregl.GeoJSONSource | undefined;
    src?.setData({
      type: "Feature",
      geometry: { type: "LineString", coordinates: coords },
      properties: {},
    });
    if (coords.length > 1) {
      const b = coords.reduce(
        (acc, c) => acc.extend(c as [number, number]),
        new LngLatBounds(
          coords[0] as [number, number],
          coords[0] as [number, number]
        )
      );
      map.fitBounds(b, { padding: 48, maxZoom: 15, duration: 400 });
    }
  }, [routeGeometry]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    const seen = new Set<string>();

    for (const v of vehicles) {
      if (!Number.isFinite(v.lat) || !Number.isFinite(v.lng)) continue;
      seen.add(v.vehicleId);
      const existing = markers.current.get(v.vehicleId);
      if (existing) {
        existing.setLngLat([v.lng, v.lat]);
        existing.getElement().style.background = occupancyColor(
          v.occupancyLevel
        );
      } else {
        const m = new maplibregl.Marker({ element: vehicleEl(v) })
          .setLngLat([v.lng, v.lat])
          .addTo(map);
        markers.current.set(v.vehicleId, m);
      }
    }
    for (const [id, m] of markers.current) {
      if (!seen.has(id)) {
        m.remove();
        markers.current.delete(id);
      }
    }

    if (focusVehicleId) {
      const f = vehicles.find((v) => v.vehicleId === focusVehicleId);
      if (f && Number.isFinite(f.lat)) {
        map.easeTo({ center: [f.lng, f.lat], duration: 500 });
      }
    } else if (!routeGeometry && vehicles.length > 0) {
      const first = vehicles.find((v) => Number.isFinite(v.lat));
      if (first) map.easeTo({ center: [first.lng, first.lat], duration: 400 });
    }
  }, [vehicles, focusVehicleId, routeGeometry]);

  return (
    <div
      ref={containerRef}
      className={className ?? "h-full w-full"}
      style={{ minHeight: 320 }}
    />
  );
}
