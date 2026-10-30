import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CATS, PRIS, type PublicRow } from '../lib/types';
import { similarity, explainSimilarity } from '../lib/ai';
import { Bars, Donut, H, Msg, Tag, Trend } from '../components/ui';
import HotspotMap from '../components/HotspotMap';
const day = 86400000;
export default function Insights() {
  const [list, setList] = useState<PublicRow[] | null>(null); const [err, setErr] = useState('');
  useEffect(() => { supabase.rpc('public_complaints').then(({ data, error }) => error ? setErr(error.message) : setList(data as PublicRow[])); }, []);
  const m = useMemo(() => {
    if (!list) return null;
    const cats = CATS.map((c) => [c, list.filter((x) => x.category === c).length] as [string, number]);
    const pris = PRIS.map((p) => [p, list.filter((x) => x.priority === p).length] as [string, number]);
    const locs = Object.entries(list.reduce<Record<string, number>>((a, c) => { const k = c.location.trim(); a[k] = (a[k] || 0) + 1; return a; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const today = new Date().setHours(0, 0, 0, 0);
    const trend = Array.from({ length: 14 }, (_, i) => { const s = today - (13 - i) * day; return [new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), list.filter((c) => { const t = new Date(c.created_at).getTime(); return t >= s && t < s + day; }).length] as [string, number]; });
    const dups: { a: PublicRow; b: PublicRow; s: ReturnType<typeof similarity> }[] = [];
    const cap = list.slice(0, 300);
    for (let i = 0; i < cap.length; i++) for (let j = i + 1; j < cap.length; j++) { const s = similarity(cap[i], cap[j]); if (s.score >= 0.4) dups.push({ a: cap[i], b: cap[j], s }); }
    dups.sort((x, y) => y.s.score - x.s.score);
    const open = list.filter((c) => c.status !== 'Resolved');
    return { cats, pris, locs, trend, dups: dups.slice(0, 6), dupCount: dups.length, open };
  }, [list]);
  if (err) return <Msg>Could not load insights: {err}</Msg>;
  if (!list || !m) return <Msg>Loading insights…</Msg>;
  if (!list.length) return <Msg>No complaints yet. Insights appear once complaints are submitted.</Msg>;
  const top = [...m.cats].sort((a, b) => b[1] - a[1])[0];
  const week = m.trend.slice(7).reduce((a, d) => a + d[1], 0), prev = m.trend.slice(0, 7).reduce((a, d) => a + d[1], 0);
  const ins: [string, string][] = [
    [`${top[0]} is the most reported category (${top[1]} of ${list.length}).`, 'Counted from the category field of all complaints.'],
    [`${m.open.filter((c) => c.priority === 'High').length} high-priority complaint(s) are still unresolved.`, 'Open means status other than Resolved.'],
    [`${m.locs[0][0]} has the most complaints (${m.locs[0][1]}).`, 'Identical location text is grouped and counted.'],
    [`${week} complaint(s) in the last 7 days versus ${prev} in the 7 days before.`, 'Counts of created_at dates over the last 14 days.'],
    [`${m.dupCount} possible duplicate pair(s) detected.`, 'Pairs with a similarity score of 40% or more.'],
  ];
  return <div className="space-y-5"><H t="AI insights" s="Every figure is computed from real database rows. The “How” line explains each method." />
    <div className="card"><div className="flex justify-between items-center mb-3"><b>💡 Explainable insights</b><Tag ok>Computed, no ML model</Tag></div>{ins.map(([a, b], i) => <div key={i} className="mb-3"><div className="font-medium">{a}</div><div className="mut text-xs">How: {b}</div></div>)}</div>
    <div className="grid md:grid-cols-2 gap-5"><div className="card"><b>Category distribution</b><div className="mt-4"><Bars data={m.cats} /></div></div><div className="card"><b>Priority split</b><div className="mt-4"><Donut data={m.pris} /></div></div></div>
    <div className="card"><b>📈 Complaint trend (last 14 days)</b><div className="mt-3"><Trend data={m.trend} /></div></div>
    <div className="card"><b>🗺️ Hotspot map</b><p className="mut text-xs mb-3">Circles are sized by complaint count (red = 3 or more). Only complaints with saved coordinates are drawn.</p><HotspotMap rows={list} /></div>
    <div className="grid md:grid-cols-2 gap-5"><div className="card"><b>📍 Complaint counts by location</b><div className="mt-4"><Bars data={m.locs} /></div></div>
      <div className="card"><b>🔁 Similar / duplicate complaints</b><p className="mut text-xs mb-2">Method: word-overlap (Jaccard) score, boosted when location and category match.</p>
        {m.dups.length === 0 ? <p className="mut text-sm">No duplicates found.</p> : m.dups.map(({ a, b, s }, i) => <div key={i} className="text-sm py-2" style={{ borderTop: i ? '1px solid var(--bd)' : 0 }}><span className="badge soft">{Math.round(s.score * 100)}% similar</span><div className="mt-1">{a.public_id}: <span className="mut">{a.description}</span></div><div>{b.public_id}: <span className="mut">{b.description}</span></div><div className="text-xs mut mt-1">Why similar: they {explainSimilarity(s)}.</div></div>)}</div></div></div>;
}
