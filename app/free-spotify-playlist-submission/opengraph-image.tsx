import { editorialShareImage } from '../../lib/editorial-share-image';
export const alt = 'Free Spotify Playlist Submission — BVSS FVM';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export default function Image() {
  return editorialShareImage('Free Spotify Playlist Submission', 'Free to submit. Human reviewed. No guaranteed placement.');
}
