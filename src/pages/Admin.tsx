import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { CATS, PRIS, STAGES, type Complaint, type Department } from '../lib/types';
import { H, ICON, PriBadge, Stat, fmt, Msg } from '../components/ui';
export default function Admin() {
  const { session, role, loading } = useAuth();
  const [rows, setRows] = useState<Complaint[]>([]); const [deps, setDeps] = useState<Department[]>([]); const [err, setErr] = useState('');
  const [f, setF] = useState({ category: '', priority: '', status: '' });
  const load = useCallback(async () => {
    const [a, b] = await Promise.all([supabase.from('complaints').select('*, departments(name)').order('created_at', { ascending: false }), supabase.from('departments').select('*').order('name')]);
    if (a.error) setErr(a.error.message); else setRows(a.data as Complaint[]); if (b.data) setDeps(b.data);
  }, []);
  useEffect(() => { if (role === 'admin') load(); }, [role, load]);
  if (loading) return <Msg>Loading…</Msg>;
  if (!session) return <div className="card max-w-sm mx-auto text-center"><h2 className="font-bold text-lg">Admin sign-in required</h2><Link className="btn btn-p mt-3" to="/login">Sign in</Link></div>;
  if (role !== 'admin') return <Msg>Your account is not an administrator. Ask the project owner to set your role to <code>admin</code> (see README).</Msg>;
  const update = async (id: string, patch: Partial<{ status: string; department_id: number | null }>) => {
    const { error } = await supabase.from('complaints').update(patch).eq('id', id);
    if (error) setErr(error.message); else { setErr(''); load(); }
  };
  const list = rows.filter((c) => (!f.category || c.category === f.category) && (!f.priority || c.priority === f.priority) && (!f.status || c.status === f.status));
  const sel = (k: keyof typeof f, opts: readonly string[], l: string) => <select className="inp" style={{ width: 'auto' }} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })}><option value="">{l}</option>{opts.map((o) => <option key={o}>{o}</option>)}</select>;
  return <div><H t="Admin dashboard" s="Review, filter, assign and update complaints. Every change is saved to Supabase." />
    {err && <Msg>{err}</Msg>}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">{STAGES.map((s, i) => <Stat key={s} icon={['📥', '🔍', '🛠️', '✅'][i]} label={s} v={rows.filter((c) => c.status === s).length} />)}</div>
    <div className="card"><div className="flex gap-2 flex-wrap mb-3">{sel('category', CATS, 'All categories')}{sel('priority', PRIS, 'All priorities')}{sel('status', STAGES, 'All statuses')}<span className="mut text-sm self-center">{list.length} shown</span></div>
      <div className="scroll"><table><thead><tr><th>ID</th><th>Complaint</th><th>Category</th><th>Priority</th><th>Department</th><th>Status</th></tr></thead><tbody>
        {list.map((c) => <tr key={c.id}><td className="whitespace-nowrap">{c.public_id}<div className="mut text-xs">{fmt(c.created_at)}</div></td>
          <td style={{ minWidth: 220 }}>{c.description}<div className="mut text-xs">📍 {c.location}</div>{c.image_url && <a className="text-xs" style={{ color: 'var(--pri)' }} href={c.image_url} target="_blank" rel="noreferrer">View photo</a>}</td>
          <td>{ICON[c.category]} {c.category}</td><td><PriBadge p={c.priority} /></td>
          <td><select className="inp" style={{ width: 'auto' }} value={c.department_id ?? ''} onChange={(e) => update(c.id, { department_id: e.target.value ? +e.target.value : null })}><option value="">Unassigned</option>{deps.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></td>
          <td><select className="inp" style={{ width: 'auto' }} value={c.status} onChange={(e) => update(c.id, { status: e.target.value })}>{STAGES.map((s) => <option key={s}>{s}</option>)}</select></td></tr>)}</tbody></table></div>
      {rows.length === 0 && <p className="mut text-sm mt-3">No complaints yet. Submit one from the Report page.</p>}</div></div>;
}
