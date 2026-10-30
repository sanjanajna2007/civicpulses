import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { STAGES, type Tracked } from '../lib/types';
import { H, ICON, PriBadge, fmt } from '../components/ui';
export default function Track() {
  const { id } = useParams(); const [q, setQ] = useState(id || ''); const [c, setC] = useState<Tracked | null>(null); const [state, setState] = useState<'idle' | 'load' | 'none' | 'err'>('idle');
  const search = async (v: string) => {
    if (!v.trim()) return; setState('load');
    const { data, error } = await supabase.rpc('track_complaint', { p_id: v });
    if (error) { setState('err'); return; }
    if (!data) { setC(null); setState('none'); } else { setC(data as Tracked); setState('idle'); }
  };
  useEffect(() => { if (id) { setQ(id); search(id); } }, [id]);
  const submit = (e: FormEvent) => { e.preventDefault(); search(q); };
  const idx = c ? STAGES.indexOf(c.status) : -1;
  return <div className="max-w-3xl mx-auto"><H t="Track a complaint" s="Enter the ID you received, for example CP-2026-1001." />
    <form className="flex gap-2 mb-5" onSubmit={submit}><input className="inp" value={q} onChange={(e) => setQ(e.target.value)} placeholder="CP-2026-1001" /><button className="btn btn-p">Search</button></form>
    {state === 'load' && <div className="card">Searching…</div>}
    {state === 'none' && <div className="card">No complaint found with ID “{q}”. Check the ID and try again.</div>}
    {state === 'err' && <div className="card">Something went wrong while searching. Please try again.</div>}
    {c && state === 'idle' && <div className="card space-y-5"><div className="flex justify-between flex-wrap gap-2"><div><div className="text-xl font-bold">{c.public_id}</div><div className="mut text-sm">Submitted {fmt(c.created_at)}</div></div><div className="flex gap-2 items-start"><span className="badge soft">{ICON[c.category]} {c.category}</span><PriBadge p={c.priority} /></div></div>
      <div className="flex">{STAGES.map((s, i) => <div key={s} className="flex-1 text-center"><div style={{ height: 6, background: i <= idx ? 'var(--pri)' : 'var(--bd)', marginRight: 2 }} /><div className="text-xs mt-2" style={{ fontWeight: i === idx ? 700 : 400, color: i <= idx ? 'var(--tx)' : 'var(--mut)' }}>{s}</div></div>)}</div>
      <div><b>Description</b><p className="mut text-sm">{c.description}</p></div><div><b>Location</b><p className="mut text-sm">📍 {c.location}</p></div>
      <div><b>Assigned department</b><p className="mut text-sm">{c.department || 'Not yet assigned'}</p></div>
      {c.ai_reason && <div><b>Why this category and priority</b><p className="mut text-sm">{c.ai_reason}</p></div>}
      {c.image_url && <img src={c.image_url} alt="Complaint" className="rounded-lg" style={{ maxHeight: 200 }} />}
      <div><b>History</b>{c.history.map((h, i) => <div key={i} className="text-sm mut mt-1">● {h.status}: {fmt(h.at)}</div>)}</div></div>}
  </div>;
}
