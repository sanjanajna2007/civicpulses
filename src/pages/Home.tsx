import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Stat, Tag, Msg } from '../components/ui';
export default function Home() {
  const [s, setS] = useState<{ t: number; r: number } | null>(null); const [err, setErr] = useState('');
  useEffect(() => { supabase.rpc('public_complaints').then(({ data, error }) => {
    if (error) setErr(error.message); else setS({ t: data.length, r: data.filter((c: { status: string }) => c.status === 'Resolved').length }); }); }, []);
  return <div className="space-y-8">
    <section className="rounded-2xl p-8 md:p-14 text-white" style={{ background: 'linear-gradient(135deg,#1e3a8a,#2563eb)' }}>
      <span className="badge" style={{ background: '#ffffff33' }}>Civic-tech • Transparent • Trackable</span>
      <h1 className="text-4xl md:text-5xl font-extrabold mt-4 leading-tight">Turn Complaints into Action</h1>
      <p className="mt-3 max-w-xl opacity-90">CivicPulse AI helps citizens report local problems, get an instant category and priority suggestion with reasons, and follow every step until it is resolved.</p>
      <div className="flex gap-3 mt-6 flex-wrap"><Link to="/report" className="btn" style={{ background: '#fff', color: '#1e3a8a' }}>📝 Report an Issue</Link><Link to="/track" className="btn" style={{ border: '1px solid #fff9', color: '#fff' }}>🔎 Track Complaint</Link></div>
    </section>
    {err && <Msg>Could not load statistics: {err}. Check your Supabase setup in the README.</Msg>}
    <section className="grid grid-cols-1 sm:grid-cols-3 gap-4"><Stat icon="📋" label="Total complaints" v={s ? s.t : '…'} /><Stat icon="✅" label="Resolved" v={s ? s.r : '…'} /><Stat icon="⏳" label="Pending" v={s ? s.t - s.r : '…'} /></section>
    <section className="grid md:grid-cols-3 gap-4">{[['1. Report', 'Describe the problem, add a location and an optional photo.'], ['2. Smart triage', 'Keyword rules suggest category and priority and show why.'], ['3. Track', 'Use your complaint ID to see progress through four stages.']].map(([a, b]) => <div key={a} className="card"><b>{a}</b><p className="mut text-sm mt-1">{b}</p></div>)}</section>
    <section className="card"><h2 className="font-bold text-lg mb-2">How the “AI” works: what is real</h2>
      <div className="grid md:grid-cols-2 gap-3 text-sm">
        <div><Tag ok>Algorithms (rule-based / statistical)</Tag><p className="mt-2">Category and priority: keyword scoring with visible reasons · Duplicate check at submission: PostgreSQL <code>pg_trgm</code> trigram similarity · Duplicate pairs in Insights: word-overlap (Jaccard) · Hotspots, trends and charts: counts over real database rows.</p></div>
        <div><Tag>Not used</Tag><p className="mt-2">No trained machine-learning model, neural network or LLM makes any prediction. Suggestions are transparent rules, not learned results. Uploaded photos are stored but not analysed.</p></div>
      </div></section>
  </div>;
}
