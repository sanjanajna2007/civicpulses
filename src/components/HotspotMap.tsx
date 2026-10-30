import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { PublicRow } from '../lib/types';
// Groups real complaint coordinates by location name and draws one sized circle per location.
export default function HotspotMap({ rows }: { rows: PublicRow[] }) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!el.current) return;
    const map = L.map(el.current).setView([20.59, 78.96], 5);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors', maxZoom: 19 }).addTo(map);
    const g: Record<string, { lat: number; lng: number; n: number; open: number }> = {};
    rows.filter((r) => r.lat != null && r.lng != null).forEach((r) => {
      const k = r.location.trim().toLowerCase(); const o = g[k] || (g[k] = { lat: 0, lng: 0, n: 0, open: 0 });
      o.lat += r.lat!; o.lng += r.lng!; o.n++; if (r.status !== 'Resolved') o.open++;
    });
    const pts = Object.entries(g).map(([k, o]) => ({ k, lat: o.lat / o.n, lng: o.lng / o.n, n: o.n, open: o.open }));
    const layer = L.featureGroup();
    pts.forEach((p) => L.circleMarker([p.lat, p.lng], { radius: 8 + p.n * 4, color: p.n >= 3 ? '#dc2626' : '#1d4ed8', fillOpacity: 0.45 })
      .bindPopup(`<b>${p.k.replace(/[<>&]/g, '')}</b><br/>${p.n} complaint(s), ${p.open} open`).addTo(layer));
    layer.addTo(map);
    if (pts.length) map.fitBounds(layer.getBounds().pad(0.3), { maxZoom: 15 });
    return () => { map.remove(); };
  }, [rows]);
  return <div ref={el} style={{ height: 360, borderRadius: 12, border: '1px solid var(--bd)' }} />;
}
