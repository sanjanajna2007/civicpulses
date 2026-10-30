import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { classify, similarity, explainSimilarity } from '../lib/ai';
import { CATS, PRIS, type Category, type Priority } from '../lib/types';
import { H, ICON, PriBadge, Tag } from '../components/ui';
interface Sim { public_id: string; description: string; location: string; category: string; status: string; score: number }
export default function Report() {
  const { session } = useAuth();
  const [desc, setDesc] = useState(''), [loc, setLoc] = useState(''), [file, setFile] = useState<File | null>(null);
  const [cat, setCat] = useState<Category | ''>(''), [pri, setPri] = useState<Priority | ''>('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [sims, setSims] = useState<Sim[]>([]); const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [done, setDone] = useState('');
  const ai = useMemo(() => classify(desc), [desc]);
  useEffect(() => { if (ai) { setCat(ai.category); setPri(ai.priority); } }, [ai?.category, ai?.priority]);
  useEffect(() => {
    if (desc.trim().length < 15) { setSims([]); return; }
    const t = setTimeout(() => supabase.rpc('find_similar', { p_text: desc, p_location: loc }).then(({ data }) => setSims((data as Sim[]) || [])), 500);
    return () => clearTimeout(t);
  }, [desc, loc]);
  const gps = () => navigator.geolocation?.getCurrentPosition((p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }), () => setErr('Could not read your GPS position.'));
  const geocode = async () => {
    setErr('');
    try {
      const r = await (await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(loc))).json();
      if (r[0]) setCoords({ lat: +r[0].lat, lng: +r[0].lon }); else setErr('Location not found on the map. Try a fuller address.');
    } catch { setErr('Map lookup failed.'); }
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault(); if (!session || !cat || !pri) return; setBusy(true); setErr('');
    let image_url: string | null = null;
    if (file) {
      const path = `${session.user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const up = await supabase.storage.from('complaint-images').upload(path, file);
      if (up.error) { setErr('Image upload failed: ' + up.error.message); setBusy(false); return; }
      image_url = supabase.storage.from('complaint-images').getPublicUrl(path).data.publicUrl;
    }
    const { data, error } = await supabase.from('complaints').insert({ description: desc.trim(), location: loc.trim(), lat: coords?.lat ?? null, lng: coords?.lng ?? null, category: cat, priority: pri, ai_reason: ai ? ai.why.join(' ') : null, image_url }).select('public_id').single();
    setBusy(false);
    if (error) setErr(error.message); else setDone(data.public_id);
  };
  if (!session) return <div className="card max-w-lg mx-auto text-center"><h2 className="font-bold text-lg">Sign in to report an issue</h2><p className="mut text-sm my-2">An account lets you receive notifications when your complaint status changes.</p><Link className="btn btn-p" to="/login">Sign in or sign up</Link></div>;
  if (done) return <div className="card text-center max-w-lg mx-auto"><div className="text-5xl">🎉</div><h2 className="text-xl font-bold mt-2">Complaint submitted</h2><p className="mut mt-1">Save your complaint ID to track progress:</p><div className="text-2xl font-bold my-3" style={{ color: 'var(--pri)' }}>{done}</div><Link className="btn btn-p" to={'/track/' + done}>Track this complaint</Link></div>;
  const ok = desc.trim().length >= 8 && loc.trim() && cat && pri;
  return <div><H t="Report an issue" s="Describe the problem; suggestions update as you type." />
    <div className="grid lg:grid-cols-5 gap-5"><form onSubmit={submit} className="card lg:col-span-3 space-y-4">
      <div><label className="text-sm font-semibold">Complaint description *</label><textarea className="inp mt-1" rows={5} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="e.g. Deep pothole on MG Road near the bus stop, two bikes skidded this week" /></div>
      <div><label className="text-sm font-semibold">Location *</label><input className="inp mt-1" value={loc} onChange={(e) => { setLoc(e.target.value); setCoords(null); }} placeholder="Street, area or landmark" />
        <div className="flex gap-2 mt-2 flex-wrap items-center"><button type="button" className="btn btn-s" onClick={geocode} disabled={!loc.trim()}>📍 Find on map</button><button type="button" className="btn btn-s" onClick={gps}>🎯 Use my GPS</button>{coords && <span className="text-xs" style={{ color: '#16a34a' }}>Coordinates saved ({coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}), so it appears on the hotspot map</span>}</div></div>
      <div><label className="text-sm font-semibold">Photo (optional)</label><input type="file" accept="image/*" className="inp mt-1" onChange={(e) => setFile(e.target.files?.[0] || null)} />{file && <img src={URL.createObjectURL(file)} alt="Upload preview" className="mt-2 rounded-lg" style={{ maxHeight: 120 }} />}</div>
      <div className="grid sm:grid-cols-2 gap-3"><div><label className="text-sm font-semibold">Category</label><select className="inp mt-1" value={cat} onChange={(e) => setCat(e.target.value as Category)}><option value="">Select…</option>{CATS.map((c) => <option key={c}>{c}</option>)}</select></div>
        <div><label className="text-sm font-semibold">Priority</label><select className="inp mt-1" value={pri} onChange={(e) => setPri(e.target.value as Priority)}><option value="">Select…</option>{PRIS.map((c) => <option key={c}>{c}</option>)}</select></div></div>
      {err && <p className="text-sm" style={{ color: '#dc2626' }}>{err}</p>}
      <button className="btn btn-p" disabled={!ok || busy} style={{ opacity: ok && !busy ? 1 : 0.5 }}>{busy ? 'Submitting…' : 'Submit complaint'}</button></form>
      <div className="lg:col-span-2 space-y-4">
        <div className="card"><div className="flex items-center justify-between"><b>🤖 Suggestion</b><Tag ok>Rule-based</Tag></div>
          {!ai ? <p className="mut text-sm mt-2">Type at least a short sentence to get a suggestion.</p> : <div className="mt-3 space-y-2 text-sm"><div>Category: <b>{ICON[ai.category]} {ai.category}</b></div><div>Priority: <PriBadge p={ai.priority} /></div>
            <div className="pt-2" style={{ borderTop: '1px solid var(--bd)' }}><b>Why?</b><ul className="list-disc pl-5 mt-1 mut">{ai.why.map((w, i) => <li key={i}>{w}</li>)}</ul></div></div>}</div>
        {sims.length > 0 && <div className="card"><b>⚠️ Possible duplicates</b><p className="mut text-xs">Found by PostgreSQL trigram similarity on existing complaints.</p>{sims.map((s) => { const x = similarity({ description: desc, location: loc, category: cat }, s); return <div key={s.public_id} className="mt-2 text-sm"><Link to={'/track/' + s.public_id} style={{ color: 'var(--pri)' }}>{s.public_id}</Link> · {Math.round(s.score * 100)}% text match<div className="mut">{s.description}</div><div className="text-xs mut">Why: {explainSimilarity(x)}</div></div>; })}</div>}
      </div></div></div>;
}
