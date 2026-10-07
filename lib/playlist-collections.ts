import type { PlaylistRecord } from './playlist-os';

export type PlaylistCollection = {
  slug: string;
  eyebrow: string;
  title: string;
  seoTitle: string;
  description: string;
  intro: string;
  intent: string;
  playlistSlugs: string[];
  relatedSlugs: string[];
};

export const playlistCollections: PlaylistCollection[] = [
  {
    slug: 'electronic-edm',
    eyebrow: 'Electronic & EDM',
    title: 'Electronic & EDM playlists for every lane',
    seoTitle: 'Best Electronic & EDM Playlists | House, Bass, DnB & More',
    description: 'Explore human-curated electronic and EDM playlists spanning future bass, melodic dubstep, house, drum & bass, trance, UK garage, bass music and chill electronic.',
    intro: 'Start broad, then go specific. This collection brings together the electronic side of the BVSS FVM network, from emotional melodic bass and liquid drum & bass to club-focused house, trance, hardwave and low-key electronic listening.',
    intent: 'For listeners searching for electronic music, EDM, bass music, house, drum & bass, trance, future bass and adjacent sounds.',
    playlistSlugs: [
      'emotional-bass',
      'liquid-dnb',
      'deep-bass',
      'emo-electronic',
      'chillstep',
      'indie-electronic',
      'hardwave',
      'stutter-house-speed-garage',
      'new-nostalgia',
      'melodic-house',
      'tech-house',
      'gaming-edm',
      'dancefloor-dnb',
      'lofi-electronic',
      'bass-music',
      'trance-2026',
      'middle-child-electronic',
      'curatoros-electronic-dance-2026',
    ],
    relatedSlugs: ['house-dance', 'night-drive-chill', 'workout-energy'],
  },
  {
    slug: 'house-dance',
    eyebrow: 'House & Dance',
    title: 'House, dance & club playlists',
    seoTitle: 'House & Dance Playlists | Tech House, Melodic House, Club & EDM',
    description: 'Find house and dance playlists for club energy, parties, late nights and movement, including tech house, melodic house, speed garage, deep house and electronic dance.',
    intro: 'This is the movement-first side of the network: club-ready house, melodic late-night grooves, UK garage, techno throwbacks and party-focused crossover playlists. Use it when the beat and momentum matter as much as the song.',
    intent: 'For house, dance, club, party, tech house, melodic house, deep house, speed garage and EDM searches.',
    playlistSlugs: [
      'deep-bass',
      'stutter-house-speed-garage',
      'melodic-house',
      'tech-house',
      'techno-classics',
      'curatoros-electronic-dance-2026',
      'curatoros-party-pregame',
      'curatoros-afrobeats-amapiano',
      'curatoros-latin-reggaeton',
    ],
    relatedSlugs: ['electronic-edm', 'workout-energy', 'global-pop'],
  },
  {
    slug: 'indie-alternative',
    eyebrow: 'Indie & Alternative',
    title: 'Indie & alternative playlists',
    seoTitle: 'Indie & Alternative Playlists | Indie Pop, Rock, Folk & Emo',
    description: 'Browse indie and alternative playlists across indie pop, bedroom pop, indie rock, alt rock, folk, singer-songwriter, emo revival and indie electronic.',
    intro: 'A cross-genre home for music with an independent or alternative edge. These playlists move from intimate bedroom pop and acoustic songwriting to guitar-driven indie rock, emo revival and electronic records with an organic feel.',
    intent: 'For indie pop, bedroom pop, indie rock, alternative rock, indie folk, singer-songwriter, emo and indie electronic discovery.',
    playlistSlugs: [
      'indie-electronic',
      'emo-electronic',
      'middle-child-listening-now',
      'middle-child-selects',
      'curatoros-indie-pop-bedroom-pop',
      'curatoros-alt-country-americana',
      'curatoros-indie-folk-singer-songwriter',
      'curatoros-new-indie-rock-alt-rock',
      'curatoros-pop-punk-emo-revival',
      'curatoros-dreamy-ethereal',
      'curatoros-coffee-shop',
    ],
    relatedSlugs: ['mood-feelings', 'night-drive-chill', 'global-pop'],
  },
  {
    slug: 'workout-energy',
    eyebrow: 'Workout & Energy',
    title: 'Workout, running & high-energy playlists',
    seoTitle: 'Workout & Running Playlists | Gym, Cardio, Gaming & Hype Music',
    description: 'High-energy playlists for gym sessions, lifting, running, cardio, gaming and getting hyped, spanning electronic, rap, rock, metal and dance.',
    intro: 'Built for momentum. These playlists prioritize pace, impact and repeat energy for lifting, running, cardio, gaming and getting ready. The sound ranges from bass-heavy electronic and drum & bass to hip-hop, rock, metal and crossover party records.',
    intent: 'For workout music, gym playlists, running songs, cardio, gaming, hype music and high-energy listening.',
    playlistSlugs: [
      'tech-house',
      'gaming-edm',
      'dancefloor-dnb',
      'bass-music',
      'middle-child-electronic',
      'middle-child-808-friendly',
      'curatoros-gym-workout',
      'curatoros-running-cardio',
      'curatoros-party-pregame',
      'curatoros-confidence-main-character-energy',
      'curatoros-modern-metal',
      'curatoros-k-pop-discovery',
      'curatoros-electronic-dance-2026',
    ],
    relatedSlugs: ['house-dance', 'electronic-edm', 'mood-feelings'],
  },
  {
    slug: 'focus-study-sleep',
    eyebrow: 'Focus, Study & Sleep',
    title: 'Focus, study, work & sleep playlists',
    seoTitle: 'Focus, Study & Sleep Playlists | Work, Lo-Fi, Calm & Ambient',
    description: 'Low-distraction playlists for focus, studying, deep work, reading, relaxation and sleep, including lo-fi, ambient, chillstep, piano and mellow instrumental music.',
    intro: 'Use this collection when music needs to support the task instead of compete with it. The lanes here are calmer and lower-distraction, covering deep work, studying, reading, coffee-shop ambience, relaxation and wind-down listening.',
    intent: 'For focus music, study playlists, work music, lo-fi, ambient, sleep music, calm music and reading playlists.',
    playlistSlugs: [
      'chillstep',
      'lofi-electronic',
      'middle-child-lofi',
      'curatoros-work-focus',
      'curatoros-study-concentration',
      'curatoros-sleep-wind-down',
      'curatoros-peaceful-calm',
      'curatoros-coffee-shop',
      'curatoros-modern-jazz-neo-jazz',
      'curatoros-dreamy-ethereal',
    ],
    relatedSlugs: ['night-drive-chill', 'mood-feelings', 'indie-alternative'],
  },
  {
    slug: 'mood-feelings',
    eyebrow: 'Mood & Feelings',
    title: 'Mood playlists for whatever you are feeling',
    seoTitle: 'Mood Playlists | Sad, Happy, Romantic, Moody, Calm & Nostalgic',
    description: 'Choose a playlist by feeling: sad songs, heartbreak, happy music, love songs, dark and moody tracks, dreamy music, confidence, nostalgia, calm and more.',
    intro: 'Sometimes the right way into music is not a genre at all. This collection groups playlists around emotional intent, from heartbreak and late-night introspection to romance, confidence, nostalgia, peace and feel-good energy.',
    intent: 'For sad songs, heartbreak, happy music, love songs, romantic playlists, moody music, dreamy songs, confidence, nostalgia and calm playlists.',
    playlistSlugs: [
      'emotional-bass',
      'emo-electronic',
      'new-nostalgia',
      'curatoros-sad-songs-heartbreak',
      'curatoros-feel-good-happy-songs',
      'curatoros-love-songs-romantic',
      'curatoros-dark-moody',
      'curatoros-dreamy-ethereal',
      'curatoros-confidence-main-character-energy',
      'curatoros-nostalgic-songs',
      'curatoros-peaceful-calm',
      'curatoros-morning-energy',
    ],
    relatedSlugs: ['night-drive-chill', 'indie-alternative', 'focus-study-sleep'],
  },
  {
    slug: 'night-drive-chill',
    eyebrow: 'Night Drive & Chill',
    title: 'Late-night, chill & night-drive playlists',
    seoTitle: 'Late Night Drive & Chill Playlists | Moody, Dreamy & Atmospheric',
    description: 'Atmospheric playlists for late-night drives, headphones and after-dark listening, spanning alt-R&B, melodic house, chill electronic, hardwave, indie and dreamy music.',
    intro: 'These are the after-dark lanes: reflective electronic, moody alt-R&B, dreamy indie, hardwave, melodic house and soft atmospheric records that work best with headphones, city lights or a long road.',
    intent: 'For late-night drive playlists, chill music, moody songs, atmospheric music, dreamy playlists and after-dark listening.',
    playlistSlugs: [
      'late-night-drive',
      'deep-bass',
      'chillstep',
      'indie-electronic',
      'hardwave',
      'melodic-house',
      'trance-2026',
      'middle-child-808-friendly',
      'curatoros-late-night-alt-rnb',
      'curatoros-dark-moody',
      'curatoros-dreamy-ethereal',
      'curatoros-late-night-drive',
      'curatoros-date-night',
    ],
    relatedSlugs: ['mood-feelings', 'electronic-edm', 'focus-study-sleep'],
  },
  {
    slug: 'global-pop',
    eyebrow: 'Global & Pop',
    title: 'Global pop, Latin, Afrobeats & discovery playlists',
    seoTitle: 'Pop & Global Music Playlists | Afrobeats, Latin, K-Pop & More',
    description: 'Discover pop and global playlists featuring Afrobeats, amapiano, Latin, reggaeton, Música Mexicana, K-pop, emerging pop, indie pop and feel-good crossover music.',
    intro: 'A discovery-first mix of contemporary pop and globally connected sounds. Move between Afrobeats and amapiano, Latin and reggaeton, Música Mexicana, K-pop, emerging pop, indie pop and upbeat crossover playlists.',
    intent: 'For pop discovery, Afrobeats, amapiano, Latin, reggaeton, Música Mexicana, K-pop, indie pop and global music playlists.',
    playlistSlugs: [
      'curatoros-afrobeats-amapiano',
      'curatoros-latin-reggaeton',
      'curatoros-emerging-pop-2026',
      'curatoros-k-pop-discovery',
      'curatoros-musica-mexicana',
      'curatoros-indie-pop-bedroom-pop',
      'curatoros-feel-good-happy-songs',
      'curatoros-summer-songs',
      'curatoros-morning-energy',
      'curatoros-road-trip-singalongs',
    ],
    relatedSlugs: ['indie-alternative', 'house-dance', 'mood-feelings'],
  },
];

export function getPlaylistCollection(slug: string) {
  return playlistCollections.find((collection) => collection.slug === slug) || null;
}

export function playlistsInCollection(collection: PlaylistCollection, playlists: PlaylistRecord[]) {
  const bySlug = new Map(playlists.map((playlist) => [playlist.slug, playlist]));
  return collection.playlistSlugs
    .map((slug) => bySlug.get(slug))
    .filter((playlist): playlist is PlaylistRecord => Boolean(playlist));
}

export function collectionsForPlaylist(playlistSlug: string, limit = 3) {
  return playlistCollections
    .filter((collection) => collection.playlistSlugs.includes(playlistSlug))
    .slice(0, limit);
}

export function relatedCollections(collection: PlaylistCollection) {
  return collection.relatedSlugs
    .map((slug) => getPlaylistCollection(slug))
    .filter((item): item is PlaylistCollection => Boolean(item));
}
