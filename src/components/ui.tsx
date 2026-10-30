import type { ReactNode } from 'react';
export const ICON: Record<string, string> = { Roads: '🛣️', Water: '💧', Electricity: '⚡', Garbage: '🗑️', 'Public Safety': '🛡️', General: '📋' };
export const PCOL: Record<string, string> = { High: '#dc2626', Medium: '#d97706', Low: '#16a34a' };
export const fmt = (t: string | number) => new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
export const PriBadge = ({ p }: { p: string }) => <span className="badge" style={{ background: PCOL[p] + '22', color: PCOL[p] }}>{p}</span>;
export const Tag = ({ children, ok }: { children: ReactNode; ok?: boolean }) => <span className="badge" style={{ background: ok ? '#16a34a22' : '#d9770622', color: ok ? '#16a34a' : '#d97706' }}>{children}</span>;
export const Stat = ({ label, v, icon }: { label: string; v: number | string; icon: string }) => <div className="card"><div className="text-2xl">{icon}</div><div className="text-3xl font-bold mt-2">{v}</div><div className="mut text-sm">{label}</div></div>;
export const H = ({ t, s }: { t: string; s?: string }) => <div className="mb-5"><h1 className="text-2xl md:text-3xl font-bold">{t}</h1>{s && <p className="mut mt-1">{s}</p>}</div>;
export const Msg = ({ children }: { children: ReactNode }) => <div className="card text-sm">{children}</div>;
export function Bars({ data }: { data: [string, number][] }) {
  const max = Math.max(1, ...data.map((d) => d[1]));
  return <div className="space-y-3">{data.map(([k, v]) => <div key={k}><div className="flex justify-between text-sm mb-1"><span>{ICON[k] || ''} {k}</span><b>{v}</b></div><div style={{ background: 'var(--bd)', height: 10, borderRadius: 99 }}><div style={{ width: (v / max) * 100 + '%', height: 10, borderRadius: 99, background: 'var(--pri)' }} /></div></div>)}</div>;
}
export function Donut({ data }: { data: [string, number][] }) {
  const tot = data.reduce((a, d) => a + d[1], 0) || 1; let off = 0; const R = 40, C = 2 * Math.PI * R;
  return <div className="flex items-center gap-5 flex-wrap"><svg viewBox="0 0 100 100" width="130" height="130"><circle cx="50" cy="50" r={R} fill="none" stroke="var(--bd)" strokeWidth="14" />
    {data.map(([k, v]) => { const l = (v / tot) * C; const e = <circle key={k} cx="50" cy="50" r={R} fill="none" stroke={PCOL[k]} strokeWidth="14" strokeDasharray={`${l} ${C - l}`} strokeDashoffset={-off} transform="rotate(-90 50 50)" />; off += l; return e; })}
    <text x="50" y="55" textAnchor="middle" fontSize="16" fontWeight="700" fill="var(--tx)">{data.reduce((a, d) => a + d[1], 0)}</text></svg>
    <div className="space-y-1 text-sm">{data.map(([k, v]) => <div key={k}><span style={{ color: PCOL[k] }}>●</span> {k}: <b>{v}</b></div>)}</div></div>;
}
export function Trend({ data }: { data: [string, number][] }) {
  const max = Math.max(1, ...data.map((d) => d[1])); const w = 100 / Math.max(1, data.length);
  return <div><svg viewBox="0 0 100 40" className="w-full" style={{ height: 120 }} preserveAspectRatio="none">{data.map(([k, v], i) => <rect key={k} x={i * w + w * 0.15} width={w * 0.7} y={40 - (v / max) * 36} height={(v / max) * 36} rx="1" fill="var(--pri)" />)}</svg>
    <div className="flex justify-between text-xs mut"><span>{data[0]?.[0]}</span><span>{data[data.length - 1]?.[0]}</span></div></div>;
}
