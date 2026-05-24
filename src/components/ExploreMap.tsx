import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import "leaflet.heat";
import type { UnifiedObservation } from "@/lib/biodiversity";

type Props = {
  observations: UnifiedObservation[];
  mode: "cluster" | "heat";
  basemap: "map" | "satellite" | "dark";
  onSelect: (o: UnifiedObservation) => void;
  height?: string;
};

const TILES = {
  map: { url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", attr: "&copy; OpenStreetMap" },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attr: "&copy; Esri",
  },
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attr: "&copy; CARTO &copy; OSM",
  },
};

const sourceColor: Record<UnifiedObservation["source"], string> = {
  gbif: "#22c55e",
  inaturalist: "#0ea5e9",
};

function makeIcon(o: UnifiedObservation) {
  const color = sourceColor[o.source];
  const ring = o.identificationConfidence === "research" ? "white" : "rgba(255,255,255,.6)";
  return L.divIcon({
    className: "",
    html: `<div style="width:18px;height:18px;border-radius:50%;background:${color};box-shadow:0 0 0 2px ${ring},0 4px 10px rgba(0,0,0,.35);"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

export function ExploreMap({ observations, mode, basemap, onSelect, height = "100%" }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const clusterRef = useRef<any>(null);
  const heatRef = useRef<any>(null);

  // init
  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = L.map(ref.current, {
      center: [64.5, 26.0],
      zoom: 5,
      zoomControl: true,
      preferCanvas: true,
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // tiles
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (tileRef.current) map.removeLayer(tileRef.current);
    const cfg = TILES[basemap];
    tileRef.current = L.tileLayer(cfg.url, { attribution: cfg.attr, maxZoom: 19 }).addTo(map);
  }, [basemap]);

  // data layers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (clusterRef.current) {
      map.removeLayer(clusterRef.current);
      clusterRef.current = null;
    }
    if (heatRef.current) {
      map.removeLayer(heatRef.current);
      heatRef.current = null;
    }

    if (!observations.length) return;

    if (mode === "heat") {
      const points = observations.map((o) => [o.lat, o.lng, 0.6] as [number, number, number]);
      // @ts-ignore - leaflet.heat augments L
      heatRef.current = L.heatLayer(points, {
        radius: 22,
        blur: 18,
        maxZoom: 11,
        gradient: { 0.2: "#0ea5e9", 0.4: "#22c55e", 0.7: "#eab308", 1.0: "#ef4444" },
      }).addTo(map);
    } else {
      // @ts-ignore
      const cluster = L.markerClusterGroup({
        chunkedLoading: true,
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        iconCreateFunction: (c: any) => {
          const n = c.getChildCount();
          const size = n > 500 ? 56 : n > 100 ? 48 : n > 20 ? 40 : 34;
          return L.divIcon({
            className: "",
            html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:radial-gradient(circle at 30% 30%, oklch(0.7 0.16 145), oklch(0.42 0.12 145));color:white;display:grid;place-items:center;font-weight:600;font-size:${
              n > 100 ? 13 : 12
            }px;box-shadow:0 0 0 4px rgba(34,197,94,.18),0 8px 20px rgba(0,0,0,.3);">${n}</div>`,
            iconSize: [size, size],
          });
        },
      });

      for (const o of observations) {
        const marker = L.marker([o.lat, o.lng], { icon: makeIcon(o) });
        marker.on("click", () => onSelect(o));
        marker.bindTooltip(
          `<div style="font-size:11px"><b>${o.scientificName || "—"}</b>${
            o.observedAt ? `<br/>${o.observedAt}` : ""
          }<br/><i>${o.source}</i></div>`,
          { direction: "top", offset: [0, -8] },
        );
        cluster.addLayer(marker);
      }
      cluster.addTo(map);
      clusterRef.current = cluster;
    }

    // fit bounds
    const bounds = L.latLngBounds(observations.map((o) => [o.lat, o.lng] as [number, number]));
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [30, 30], maxZoom: 11 });
  }, [observations, mode, onSelect]);

  return <div ref={ref} style={{ height, width: "100%" }} className="rounded-2xl overflow-hidden" />;
}
