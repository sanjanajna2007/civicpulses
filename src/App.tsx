import { useEffect, useState } from 'react';
import { HashRouter, NavLink, Route, Routes, Link } from 'react-router-dom';
import { configured, supabase } from './lib/supabase';
import { AuthProvider, useAuth } from './lib/auth';
import type { Notification } from './lib/types';
import { fmt } from './components/ui';
import Home from './pages/Home'; import Report from './pages/Report'; import Track from './pages/Track';
import Admin from './pages/Admin'; import Insights from './pages/Insights'; import Login from './pages/Login';

function Bell() {
  const { session } = useAuth(); const [items, setItems] = useState<Notification[]>([]); const [open, setOpen] = useState(false);
  const load = () => supabase.from('notifications').select('id,message,read,created_at').order('created_at', { ascending: false }).limit(15).then(({ data }) => setItems((data as Notification[]) || []));
  useEffect(() => { if (!session) { setItems([]); return; } load(); const t = setInterval(load, 20000); return () => clearInterval(t); }, [session]);
  if (!session) return null;
  const unread = items.filter((n) => !n.read).length;
  const toggle = async () => { setOpen(!open); if (!open && unread) { await supabase.from('notifications').update({ read: true }).eq('read', false); load(); } };
  return <div className="relative"><button className="btn btn-s" onClick={toggle} aria-label="Notifications">🔔{unread > 0 && <span className="badge" style={{ background: '#dc2626', color: '#fff' }}>{unread}</span>}</button>
    {open && <div className="card absolute right-0 mt-2 w-72 z-30 text-sm" style={{ maxHeight: 320, overflowY: 'auto' }}>{items.length === 0 ? <span className="mut">No notifications yet.</span> : items.map((n) => <div key={n.id} className="py-2" style={{ borderBottom: '1px solid var(--bd)' }}>{n.message}<div className="mut text-xs">{fmt(n.created_at)}</div></div>)}</div>}</div>;
}
function Shell() {
  const { session, role } = useAuth();
  const nav: [string, string][] = [['/', 'Home'], ['/report', 'Report'], ['/track', 'Track'], ['/admin', 'Admin'], ['/insights', 'AI Insights']];
  return <div>
    <header style={{ background: 'var(--surf)', borderBottom: '1px solid var(--bd)', position: 'sticky', top: 0, zIndex: 20 }}>
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
        <Link to="/" className="font-extrabold text-lg flex items-center gap-2"><span style={{ background: '#1d4ed8', color: '#fff', borderRadius: 8, padding: '2px 8px' }}>CP</span>CivicPulse <span style={{ color: 'var(--pri)' }}>AI</span></Link>
        <nav className="nav flex gap-1 scroll">{nav.map(([to, l]) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'on' : '')}>{l}</NavLink>)}</nav>
        <div className="flex gap-2 items-center"><Bell />{session ? <button className="btn btn-s" onClick={() => supabase.auth.signOut()}>Sign out{role === 'admin' ? ' (admin)' : ''}</button> : <Link className="btn btn-p" to="/login">Sign in</Link>}</div></div></header>
    <main className="max-w-6xl mx-auto px-4 py-6">
      {!configured && <div className="card mb-5" style={{ borderColor: '#d97706' }}>Supabase is not configured. Copy <code>.env.example</code> to <code>.env</code>, add your project URL and anon key, then restart <code>npm run dev</code>.</div>}
      <Routes><Route path="/" element={<Home />} /><Route path="/report" element={<Report />} /><Route path="/track" element={<Track />} /><Route path="/track/:id" element={<Track />} /><Route path="/admin" element={<Admin />} /><Route path="/insights" element={<Insights />} /><Route path="/login" element={<Login />} /></Routes></main>
    <footer className="text-center mut text-xs pb-8">CivicPulse AI · Rule-based and statistical methods only; no trained ML model</footer></div>;
}
export default function App() { return <HashRouter><AuthProvider><Shell /></AuthProvider></HashRouter>; }
