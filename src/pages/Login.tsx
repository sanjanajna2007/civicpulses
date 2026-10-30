import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { H } from '../components/ui';
export default function Login() {
  const nav = useNavigate();
  const [mode, setMode] = useState<'in' | 'up'>('in'); const [email, setEmail] = useState(''); const [pw, setPw] = useState(''); const [name, setName] = useState('');
  const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  const go = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setMsg('');
    if (mode === 'in') {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
      if (error) setMsg(error.message); else nav('/');
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password: pw, options: { data: { full_name: name } } });
      if (error) setMsg(error.message); else if (!data.session) setMsg('Account created. Check your email to confirm, then sign in.'); else nav('/');
    }
    setBusy(false);
  };
  return <div className="max-w-sm mx-auto"><H t={mode === 'in' ? 'Sign in' : 'Create account'} s="Citizens and administrators use the same login. Admin rights are granted in the database." />
    <form onSubmit={go} className="card space-y-3">
      {mode === 'up' && <input className="inp" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />}
      <input className="inp" type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className="inp" type="password" required minLength={6} placeholder="Password (min 6 characters)" value={pw} onChange={(e) => setPw(e.target.value)} />
      {msg && <p className="text-sm" style={{ color: '#dc2626' }}>{msg}</p>}
      <button className="btn btn-p w-full justify-center" disabled={busy}>{mode === 'in' ? 'Sign in' : 'Sign up'}</button>
      <button type="button" className="text-sm mut underline" onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>{mode === 'in' ? 'New here? Create an account' : 'Have an account? Sign in'}</button>
    </form></div>;
}
