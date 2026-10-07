import { editorialShareImage } from '../../lib/editorial-share-image';
export const alt = 'Spotify Promotion & Playlist Guides — BVSS FVM';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export default function Image() {
  return editorialShareImage('Spotify Promotion & Playlist Guides', 'Practical guides to submissions, promotion and release strategy.');
}
