import type { Metadata } from 'next';
import { siteUrl } from '../../lib/site-url';
import styles from './page.module.css';

const pageUrl = `${siteUrl}/never-alone`;
const smartLink = 'https://lnk.to/MiddlechildNeverAlone';
const youtubeUrl = 'https://www.youtube.com/watch?v=9bCVDn2P29Q';
const thumbnailUrl = 'https://i.ytimg.com/vi/9bCVDn2P29Q/maxresdefault.jpg';

const platforms = [
  ['Spotify', 'https://open.spotify.com/track/4CzteKxZWpQw81hZPbUXj1'],
  ['Apple Music', 'https://music.apple.com/us/song/never-alone-feat-lowly-sunday/6787913520'],
  ['TIDAL', 'https://tidal.com/track/540359345'],
  ['Qobuz', 'https://www.qobuz.com/no-en/album/never-alone-feat-lowly-sunday-middle-child/s86d5vmdmi1xj'],
  ['iHeartRadio', 'https://www.iheart.com/artist/middle-child-514398/songs/never-alone-feat-lowly-sunday-414578756'],
  ['Last.fm', 'https://www.last.fm/music/Middle+Child/Never+Alone+(feat.+lowly+sunday)+-+Single'],
  ['YouTube', youtubeUrl],
] as const;

const lyrics = [
  ['Verse', 'Empty room, cold and hollow\nEvery night feels like the last\nSomething reaching through the darkness\nLike an echo from my past\nLike a voice inside the silence\nLike a hand I cannot see\nHolding every broken part of me'],
  ['Pre-Chorus', 'I thought I was invisible\nI thought no one knew\nBut something in the dark\nWas always pulling me through'],
  ['Chorus', 'I was never alone\nEven in the fire\nEvery time I broke\nYou were pulling me higher\nI was never alone\nThrough the dark and the pain\nSomething held me close\nAnd called me by name'],
  ['Bridge', 'I don’t know how to name it\nBut I know that it is real\nEvery wound I carried\nSomehow started to heal'],
  ['Outro', 'Never alone\nNever alone'],
] as const;

export const metadata: Metadata = {
  title: 'Never Alone (feat. lowly sunday) - Official Audio and Lyrics',
  description:
    'Listen to Never Alone by Middle Child featuring lowly sunday. Explore the official audio, complete lyrics, song story, credits, streaming links, UPC, and ISRC.',
  alternates: { canonical: pageUrl },
  keywords: [
    'Middle Child Never Alone',
    'Never Alone feat lowly sunday',
    'Middle Child lyrics',
    'Never Alone lyrics',
    'melodic bass',
    'emotional electronic music',
    'future bass',
  ],
  openGraph: {
    title: 'Never Alone (feat. lowly sunday) - Middle Child',
    description: 'Official audio, complete lyrics, song story, credits, and streaming links.',
    url: pageUrl,
    type: 'music.song',
    siteName: 'Middle Child',
    images: [{ url: thumbnailUrl, width: 1280, height: 720, alt: 'Middle Child - Never Alone official audio' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Never Alone (feat. lowly sunday) - Middle Child',
    description: 'Official audio, complete lyrics, song story, credits, and streaming links.',
    images: [thumbnailUrl],
  },
};

export default function NeverAlonePage() {
  const artistSameAs = [
    'https://open.spotify.com/artist/2hp8yAzOnYRUFMCdot9tzN',
    'https://www.instagram.com/middlechildmzk/',
    'https://x.com/middlechildmzk',
    'https://www.facebook.com/middlechildmusica/',
  ];

  const recordingSchema = {
    '@context': 'https://schema.org',
    '@type': 'MusicRecording',
    '@id': `${pageUrl}#recording`,
    name: 'Never Alone',
    alternateName: 'Never Alone (feat. lowly sunday)',
    url: pageUrl,
    datePublished: '2026-07-31',
    duration: 'PT3M4S',
    genre: ['Melodic Bass', 'Future Bass', 'Electronic'],
    isrcCode: 'QT6EX2615333',
    identifier: [
      { '@type': 'PropertyValue', propertyID: 'ISRC', value: 'QT6EX2615333' },
      { '@type': 'PropertyValue', propertyID: 'UPC', value: '882877618355' },
    ],
    byArtist: {
      '@type': 'MusicGroup',
      '@id': `${siteUrl}/#artist`,
      name: 'Middle Child',
      alternateName: 'Middle Child Music',
      member: { '@type': 'Person', name: 'Dan Larson' },
      foundingLocation: { '@type': 'Place', name: 'Minneapolis, Minnesota, United States' },
      sameAs: artistSameAs,
    },
    contributor: { '@type': 'MusicGroup', name: 'lowly sunday' },
    recordLabel: { '@type': 'Organization', name: 'BVSS FVM' },
    inAlbum: {
      '@type': 'MusicAlbum',
      name: 'Never Alone (feat. lowly sunday) - Single',
      albumReleaseType: 'https://schema.org/SingleRelease',
      datePublished: '2026-07-31',
      identifier: { '@type': 'PropertyValue', propertyID: 'UPC', value: '882877618355' },
    },
    description:
      'An emotional melodic bass song about feeling invisible, carrying pain in silence, and discovering that even in the hardest seasons, you were never truly alone.',
    sameAs: platforms.map(([, href]) => href),
    potentialAction: { '@type': 'ListenAction', target: smartLink },
  };

  const videoSchema = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    '@id': `${pageUrl}#video`,
    name: 'Middle Child - Never Alone (feat. lowly sunday) [Official Audio]',
    description: 'The official audio for Never Alone by Middle Child featuring lowly sunday.',
    thumbnailUrl,
    uploadDate: '2026-08-01T00:00:00-05:00',
    duration: 'PT3M5S',
    embedUrl: 'https://www.youtube.com/embed/9bCVDn2P29Q',
    isPartOf: { '@id': `${pageUrl}#recording` },
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Who is Middle Child?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Middle Child is the emotional electronic music project of Minneapolis artist and producer Dan Larson.',
        },
      },
      {
        '@type': 'Question',
        name: 'What is Never Alone by Middle Child about?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Never Alone is about feeling invisible and broken, then recognizing that something was still carrying you through the darkest season.',
        },
      },
      {
        '@type': 'Question',
        name: 'What genre is Never Alone?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Never Alone blends melodic bass, future bass, cinematic electronic music, warm low end, guitar texture, and intimate vocals.',
        },
      },
      {
        '@type': 'Question',
        name: 'When was Never Alone released?',
        acceptedAnswer: { '@type': 'Answer', text: 'Never Alone was released on July 31, 2026.' },
      },
    ],
  };

  return (
    <main className={styles.page} data-release-page="never-alone">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(recordingSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(videoSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <nav className={styles.nav} aria-label="Primary navigation">
        <a className={styles.brand} href="/experience">MIDDLE CHILD</a>
        <div className={styles.navLinks}>
          <a href="#listen">Listen</a>
          <a href="#lyrics">Lyrics</a>
          <a href="#story">Story</a>
          <a className={styles.primary} href={smartLink} target="_blank" rel="noreferrer">Listen everywhere</a>
        </div>
      </nav>

      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Out now · July 31, 2026</p>
          <h1 className={styles.title}>Never<br /><span>Alone</span></h1>
          <p className={styles.lead}>An emotional melodic bass song about feeling invisible, carrying pain in silence, and discovering that even in the hardest seasons, you were never truly alone.</p>
          <div className={styles.actions}>
            <a className={styles.primary} href={smartLink} target="_blank" rel="noreferrer">Listen everywhere</a>
            <a className={styles.secondary} href={youtubeUrl} target="_blank" rel="noreferrer">Watch official audio</a>
          </div>
        </div>
        <div className={styles.cover} role="img" aria-label="Never Alone by Middle Child featuring lowly sunday">
          <div className={styles.coverCopy}>
            <small>Middle Child feat. lowly sunday</small>
            <strong>Never<br />Alone</strong>
            <small>BVSS FVM · 2026</small>
          </div>
        </div>
      </section>

      <section className={styles.section} id="listen">
        <p className={styles.eyebrow}>Official release</p>
        <h2>Listen to Never Alone</h2>
        <p className={styles.copy}>Choose your preferred platform or use the all-platform smart link. These links point to the official release by Middle Child featuring lowly sunday.</p>
        <div className={styles.platforms}>
          <a className={styles.primary} href={smartLink} target="_blank" rel="noreferrer">All platforms</a>
          {platforms.map(([name, href]) => <a className={styles.platform} href={href} key={name} target="_blank" rel="noreferrer">{name}</a>)}
        </div>
        <div className={styles.videoWrap}>
          <iframe
            src="https://www.youtube.com/embed/9bCVDn2P29Q"
            title="Middle Child - Never Alone (feat. lowly sunday) official audio"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </section>

      <section className={styles.section} id="story">
        <p className={styles.eyebrow}>The song</p>
        <h2>Some songs are released. Some are survived.</h2>
        <p className={styles.copy}>“Never Alone” was shaped by depression, grief, faith, healing, and a cancer diagnosis. It begins inside isolation and opens into recognition: even when life felt empty, something was still holding every broken part together. The production moves from fragile atmosphere into a cathartic drop that blooms instead of attacks.</p>
        <div className={styles.grid}>
          <article className={styles.card}><h3>Meaning</h3><p>A song for anyone who has felt invisible, anxious, broken, or alone and needed a reminder that they were still seen.</p></article>
          <article className={styles.card}><h3>Sound</h3><p>Dark synth pulses, cinematic space, warm low end, guitar texture, intimate vocals, and emotional melodic bass.</p></article>
          <article className={styles.card}><h3>Middle Child</h3><p>Middle Child is the emotional electronic project of Minneapolis artist and producer Dan Larson, active since 2014.</p></article>
          <article className={styles.card}><h3>lowly sunday</h3><p>lowly sunday is Dan Larson’s vocal alias on this release, presented in lowercase across the official metadata.</p></article>
        </div>
      </section>

      <section className={styles.section} id="lyrics">
        <p className={styles.eyebrow}>Official lyrics</p>
        <h2>Never Alone lyrics</h2>
        <div className={styles.lyrics}>
          {lyrics.map(([section, text]) => (
            <article className={styles.lyricBlock} key={section}>
              <span>{section}</span>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <p className={styles.eyebrow}>Release information</p>
        <h2>Credits and identifiers</h2>
        <dl className={styles.meta}>
          <div><dt>Artist</dt><dd>Middle Child</dd></div>
          <div><dt>Featured artist</dt><dd>lowly sunday</dd></div>
          <div><dt>Release date</dt><dd>July 31, 2026</dd></div>
          <div><dt>Label</dt><dd>BVSS FVM</dd></div>
          <div><dt>Written and produced by</dt><dd>Daniel Lawrence Larson</dd></div>
          <div><dt>UPC</dt><dd>882877618355</dd></div>
          <div><dt>ISRC</dt><dd>QT6EX2615333</dd></div>
          <div><dt>Duration</dt><dd>3:04</dd></div>
        </dl>
      </section>

      <section className={styles.section} aria-labelledby="faq-heading">
        <p className={styles.eyebrow}>Quick facts</p>
        <h2 id="faq-heading">About Never Alone</h2>
        <div className={styles.grid}>
          <article className={styles.card}><h3>Who made Never Alone?</h3><p>Middle Child, the emotional electronic project of Minneapolis producer Dan Larson, featuring his vocal alias lowly sunday.</p></article>
          <article className={styles.card}><h3>What is the song about?</h3><p>Feeling abandoned in a difficult season and later realizing that you were still being held, even when you could not feel it.</p></article>
          <article className={styles.card}><h3>What genre is it?</h3><p>Melodic bass and future bass with cinematic electronic production, guitar warmth, and a wounded but hopeful emotional arc.</p></article>
          <article className={styles.card}><h3>Where can I listen?</h3><p>Spotify, Apple Music, TIDAL, Qobuz, iHeartRadio, YouTube, and other services through the official smart link.</p></article>
        </div>
      </section>

      <footer className={styles.footer}>
        <span>Middle Child · Minneapolis, Minnesota</span>
        <span>BVSS FVM · © 2026</span>
        <a className={styles.textLink} href="/experience">Explore the full Middle Child experience</a>
      </footer>
    </main>
  );
}
