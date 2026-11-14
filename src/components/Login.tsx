import { useState } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../supabase';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) {
      setErr(
        error.message.toLowerCase().includes('invalid')
          ? 'Het e-mailadres of wachtwoord klopt niet.'
          : 'Inloggen is niet gelukt: ' + error.message,
      );
    }
  };

  return (
    <div className="login">
      <form className="login-card" onSubmit={submit}>
        <div className="brand">
          <b>Van Boven</b>
          <span>Aannemers</span>
        </div>
        <h2 style={{ fontSize: 22 }}>Personeelsplanning</h2>
        <label className="f">
          E-mailadres
          <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="f">
          Wachtwoord
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {err && (
          <div className="err" role="alert">
            {err}
          </div>
        )}
        <button className="btn primary" type="submit" disabled={busy} style={{ justifyContent: 'center' }}>
          {busy ? 'Bezig met inloggen…' : 'Inloggen'}
        </button>
      </form>
    </div>
  );
}
