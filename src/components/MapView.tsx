import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, LayersControl } from "react-leaflet";
import L from "leaflet";
import { Link } from "@tanstack/react-router";

// fix default icons
const icon = new L.DivIcon({
  className: "",
  html: `<div style="background:linear-gradient(135deg,oklch(0.55 0.16 145),oklch(0.42 0.09 135));width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 4px 12px rgba(0,0,0,.25);display:grid;place-items:center;border:2px solid white;"><div style="transform:rotate(45deg);color:white;font-size:14px;">🌿</div></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

export type MapPoint = {
  id: string;
  lat: number;
  lng: number;
  title: string;
  subtitle?: string;
  image?: string;
  link?: string;
};

function ClickPicker({ onPick }: { onPick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e: L.LeafletMouseEvent) { onPick?.(e.latlng.lat, e.latlng.lng); },
  });
  return null;
}

export function MapView({
  points,
  onPick,
  height = "70vh",
  center,
}: {
  points: MapPoint[];
  onPick?: (lat: number, lng: number) => void;
  height?: string;
  center?: [number, number];
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) return <div style={{ height }} className="rounded-xl bg-muted animate-pulse" />;

  const defaultCenter: [number, number] =
    center ?? (points[0] ? [points[0].lat, points[0].lng] : [62.5, 25.7]); // Finland

  return (
    <div style={{ height }} className="rounded-xl overflow-hidden border border-border shadow-sm">
      <MapContainer center={defaultCenter} zoom={points.length ? 7 : 5} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Kartta">
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satelliitti">
            <TileLayer
              attribution='&copy; Esri'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          </LayersControl.BaseLayer>
        </LayersControl>
        {onPick && <ClickPicker onPick={onPick} />}
        {points.map((p) => (
          <Marker key={p.id} position={[p.lat, p.lng]} icon={icon}>
            <Popup>
              <div className="min-w-[180px]">
                {p.image && <img src={p.image} className="w-full h-24 object-cover rounded mb-2" alt="" />}
                <div className="font-medium text-sm">{p.title}</div>
                {p.subtitle && <div className="text-xs opacity-70">{p.subtitle}</div>}
                {p.link && <Link to={p.link} className="text-xs text-primary underline mt-1 inline-block">Avaa →</Link>}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
