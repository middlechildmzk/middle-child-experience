'use client';

import { FormEvent, useEffect, useState } from 'react';
import { createClient, Session } from '@supabase/supabase-js';
import { playlistApiBase, supabasePublishableKey, supabaseUrl } from '../../../lib/playlist-os';

const supabase = createClient(supabaseUrl, supabasePublishableKey);

export default function CuratorApply() {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [profile, setProfile] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    fetch(playlistApiBase + '/bvss-curator', {
      headers: { Authorization: 'Bearer ' + session.access_token },
    })
      .then((response) => response.json())
      .then((body) => setProfile(body.profile || null))
      .catch(() => undefined);
  }, [session]);

  async function signIn() {
    setStatus('Sending secure sign-in link…');
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + '/curators/apply' },
    });
    setStatus(error ? error.message : 'Check your email for the secure sign-in link.');
  }

  async function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    setBusy(true);
    setStatus('');
    const form = new FormData(event.currentTarget);
    const body = {
      action: 'apply',
      display_name: form.get('display_name'),
      handle: form.get('handle'),
      contact_email: form.get('contact_email'),
      bio: form.get('bio'),
      website_url: form.get('website_url') || null,
      spotify_profile_url: form.get('spotify_profile_url') || null,
      genres: String(form.get('genres') || '').split(',').map((v) => v.trim()).filter(Boolean),
      moods: String(form.get('moods') || '').split(',').map((v) => v.trim()).filter(Boolean),
      social_links: {
        instagram: form.get('instagram_url') || null,
        tiktok: form.get('tiktok_url') || null,
      },
    };
    try {
      const response = await fetch(playlistApiBase + '/bvss-curator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) {
        setStatus(result.error === 'handle_unavailable' ? 'That curator handle is already taken.' : (result.error || 'Application failed.'));
        return;
      }
      setProfile(result.profile);
      setStatus('Application saved. BVSS FVM will review the curator account before any playlist can receive network submissions.');
    } finally {
      setBusy(false);
    }
  }

  if (!session) {
    return (
      <div className="card curator-auth-card">
        <p className="eyebrow">Step 1 · secure sign in</p>
        <h3>Use your curator email.</h3>
        <p>Applications are tied to a verified email login so playlist claims and review history stay attached to one curator identity.</p>
        <div className="field">
          <label htmlFor="curator-email">Email</label>
          <input id="curator-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </div>
        <button className="button" type="button" onClick={signIn}>Email me a sign-in link</button>
        {status && <p className="muted" role="status">{status}</p>}
      </div>
    );
  }

  if (profile && ['pending', 'approved', 'suspended'].includes(profile.status)) {
    return (
      <div className="card curator-auth-card">
        <span className="status-pill">{profile.status}</span>
        <h3>{profile.display_name}</h3>
        <p>
          {profile.status === 'approved'
            ? 'Your curator account is approved. Continue to the portal to add and verify playlists.'
            : profile.status === 'suspended'
              ? 'This curator account is currently suspended. Contact BVSS FVM if you believe this is an error.'
              : 'Your application is in the BVSS FVM review queue. You can still edit and save your application below if needed.'}
        </p>
        {profile.status === 'approved' && <a className="button" href="/curator">Open curator portal</a>}
      </div>
    );
  }

  return (
    <form className="submission-form" onSubmit={apply}>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="display_name">Curator / brand name</label>
          <input id="display_name" name="display_name" required maxLength={100} />
        </div>
        <div className="field">
          <label htmlFor="handle">Public handle</label>
          <input id="handle" name="handle" placeholder="your-curator-name" maxLength={80} />
        </div>
        <div className="field span-2">
          <label htmlFor="contact_email">Contact email</label>
          <input id="contact_email" name="contact_email" type="email" defaultValue={session.user.email || ''} required />
        </div>
        <div className="field span-2">
          <label htmlFor="bio">Curation philosophy</label>
          <textarea id="bio" name="bio" maxLength={1200} required placeholder="What do you curate, what do you listen for, and who is the playlist for?" />
        </div>
        <div className="field">
          <label htmlFor="genres">Genres</label>
          <input id="genres" name="genres" placeholder="melodic bass, trance, DnB" />
        </div>
        <div className="field">
          <label htmlFor="moods">Moods</label>
          <input id="moods" name="moods" placeholder="emotional, euphoric, dark" />
        </div>
        <div className="field">
          <label htmlFor="spotify_profile_url">Spotify profile URL</label>
          <input id="spotify_profile_url" name="spotify_profile_url" type="url" />
        </div>
        <div className="field">
          <label htmlFor="website_url">Website</label>
          <input id="website_url" name="website_url" type="url" />
        </div>
        <div className="field">
          <label htmlFor="instagram_url">Instagram</label>
          <input id="instagram_url" name="instagram_url" type="url" />
        </div>
        <div className="field">
          <label htmlFor="tiktok_url">TikTok</label>
          <input id="tiktok_url" name="tiktok_url" type="url" />
        </div>
      </div>

      <div className="submission-policy">
        <strong>Beta standards</strong>
        <p>
          Curators must control the playlists they claim. Verification is required before network routing. You keep editorial independence and may not sell or promise placement through BVSS FVM.
        </p>
      </div>

      <button className="button" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Submit curator application'}</button>
      {status && <p className="muted" role="status">{status}</p>}
    </form>
  );
}
