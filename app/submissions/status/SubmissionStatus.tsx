'use client';

import { useEffect, useState } from 'react';
import { playlistApiBase } from '../../../lib/playlist-os';
import PlacementShareButton from './PlacementShareButton';

export default function SubmissionStatus({ token }: { token?: string }) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Missing submission status token.');
      return;
    }
    fetch(playlistApiBase + '/bvss-submission-status?token=' + encodeURIComponent(token), { cache: 'no-store' })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Status unavailable');
        return body;
      })
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Status unavailable'));
  }, [token]);

  if (error) return <div className="card submission-result error"><h3>Status unavailable.</h3><p>{error}</p></div>;
  if (!data) return <div className="card">Loading submission status…</div>;

  return (
    <div className="submission-status">
      <div className="card">
        <span className="status-pill">{data.submission.display_status || data.submission.status}</span>
        <h2>{data.submission.song_title}</h2>
        <p className="lead compact-lead">{data.submission.artist_name}</p>
        <p className="muted">
          Submitted {new Date(data.submission.submitted_at).toLocaleString()} · {data.submission.genre}
        </p>
        {data.submission.spotify_url ? (
          <a className="button button-secondary" href={data.submission.spotify_url} target="_blank" rel="noreferrer">Open track on Spotify</a>
        ) : (
          <span className="status-pill">unreleased submission</span>
        )}
      </div>

      <section className="os-section">
        <div className="os-section-head">
          <div><p className="eyebrow">Timeline</p><h2>What has happened</h2></div>
        </div>
        <div className="status-timeline">
          {(data.events || []).map((event: any, index: number) => (
            <div className="status-event" key={event.created_at + ':' + index}>
              <span className="status-dot" />
              <div>
                <strong>{event.public_label}</strong>
                {event.public_detail && <p>{event.public_detail}</p>}
                <small>{new Date(event.created_at).toLocaleString()}</small>
              </div>
            </div>
          ))}
        </div>
      </section>

      {!!data.routes?.length && (
        <section className="os-section">
          <div className="os-section-head">
            <div><p className="eyebrow">Review lanes</p><h2>Where the track is being considered</h2></div>
          </div>
          <div className="integration-grid">
            {data.routes.map((route: any, index: number) => (
              <article className="card" key={route.playlist_name + ':' + index}>
                <span className="status-pill">{route.status}</span>
                <h3>{route.playlist_name}</h3>
                <p>{route.network_owner_type === 'partner' ? 'Approved independent curator' : 'BVSS FVM curator'}</p>
                <small>
                  {route.decision
                    ? 'Decision recorded: ' + route.decision
                    : 'No placement decision has been recorded yet.'}
                </small>
                {route.decision === 'accept' && (
                  <div className="placement-share-actions">
                    <PlacementShareButton
                      artist={data.submission.artist_name}
                      song={data.submission.song_title}
                      playlist={route.playlist_name}
                      playlistSlug={route.playlist_slug || null}
                    />
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      <div className="submission-policy">
        <strong>What this status page means</strong>
        <p>
          Routing, matching, and review status do not guarantee placement. This page only reports recorded workflow events from the BVSS FVM system.
        </p>
      </div>
    </div>
  );
}
