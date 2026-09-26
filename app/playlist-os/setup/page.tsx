'use client';

import { FormEvent, useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { playlistApiBase, supabasePublishableKey, supabaseUrl } from '../../../lib/playlist-os';

const supabase = createClient(supabaseUrl, supabasePublishableKey);
const ADMIN_EMAIL = 'dan@bvssfvm.com';

export default function PlaylistOSPasswordSetup() {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    setToken(params.get('token') || '');
    window.history.replaceState(null, '', window.location.pathname);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('');

    if (!token) {
      setStatus('This setup link is missing its one-time token.');
      return;
    }
    if (password.length < 12) {
      setStatus('Use at least 12 characters.');
      return;
    }
    if (password !== confirm) {
      setStatus('Passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(playlistApiBase + '/bvss-admin-password-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const body = await response.json();

      if (!response.ok) {
        setStatus(body.error === 'invalid_or_expired_setup_link'
          ? 'This one-time setup link is invalid, expired, or already used.'
          : 'Password setup failed. Please try again.');
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: ADMIN_EMAIL,
        password,
      });
      if (error) {
        setStatus('Password saved. Return to Playlist OS and sign in with your new password.');
        return;
      }

      window.location.replace('/playlist-os');
    } catch {
      setStatus('Password setup failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="section">
        <form className="os-login card" onSubmit={submit}>
          <p className="eyebrow">BVSS FVM secure admin</p>
          <h1>Create your Playlist OS password</h1>
          <p className="muted">
            This is a one-time setup for {ADMIN_EMAIL}. Choose a password you will use for normal Playlist OS sign-in.
          </p>
          <div className="field">
            <label htmlFor="setup-email">Email</label>
            <input id="setup-email" type="email" value={ADMIN_EMAIL} disabled />
          </div>
          <div className="field">
            <label htmlFor="setup-password">New password</label>
            <input
              id="setup-password"
              type="password"
              autoComplete="new-password"
              minLength={12}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="setup-confirm">Confirm password</label>
            <input
              id="setup-confirm"
              type="password"
              autoComplete="new-password"
              minLength={12}
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              required
            />
          </div>
          <button className="button" type="submit" disabled={busy || !token}>
            {busy ? 'Securing account…' : 'Set password & sign in'}
          </button>
          {!token && <p className="muted">Open this page from the one-time setup link.</p>}
          {status && <p className="muted" role="status">{status}</p>}
        </form>
      </section>
    </main>
  );
}
