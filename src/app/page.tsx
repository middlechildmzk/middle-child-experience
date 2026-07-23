const releases = [
  {
    title: 'Never Alone',
    year: '2026',
    status: 'New single',
    note: 'A wounded but hopeful return built from dark synths, warm low end, guitar, and a drop that blooms instead of attacks.',
  },
  {
    title: 'Mercy',
    year: '2017',
    status: 'Listener favorite',
    note: 'A defining Middle Child release approaching one million Spotify streams.',
  },
  {
    title: 'Awaken',
    year: '2017',
    status: 'Early chapter',
    note: 'Part of the first major future-bass era: emotional, melodic, and built for release.',
  },
  {
    title: 'Miracle',
    year: '2017',
    status: 'Early chapter',
    note: 'A bright, melodic track rooted in the original Middle Child sound.',
  },
  {
    title: 'Bliss',
    year: '2017',
    status: 'Early chapter',
    note: 'A hopeful chapter in a catalog built around feeling, movement, and connection.',
  },
  {
    title: 'YOU',
    year: '2017',
    status: 'Archive',
    note: 'A fan-connected release from the project’s first wave of momentum.',
  },
];

const lyrics = [
  ['Verse', 'Empty room, cold and hollow\nevery night feels like the last\nsomething reaching through the darkness\nlike an echo from my past\nlike a voice inside the silence\nlike a hand I cannot see\nholding every broken part of me'],
  ['Pre-Chorus', 'I thought I was invisible\nI thought no one knew\nbut something in the dark\nwas always pulling me through'],
  ['Chorus', 'I was never alone\neven in the fire\nevery time I broke\nYou were pulling me higher\nI was never alone\nthrough the dark and the pain\nsomething held me close\nand called me by name'],
  ['Bridge', 'I don’t know how to name it\nbut I know that it is real\nevery wound I carried\nsomehow started to heal'],
];

export default function Home() {
  const recordingSchema = {
    '@context': 'https://schema.org',
    '@type': 'MusicRecording',
    name: 'Never Alone',
    byArtist: { '@type': 'MusicGroup', name: 'Middle Child' },
    datePublished: '2026-07-31',
    genre: ['Melodic Bass', 'Future Bass', 'Electronic'],
    recordLabel: { '@type': 'Organization', name: 'BVSS FVM' },
    description: 'An emotional electronic single about discovering that even in the darkest moments, you were never truly alone.',
  };

  return (
    <main id="main-content">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(recordingSchema) }} />
      <a className="skip-link" href="#main-content">Skip to content</a>

      <nav className="nav" aria-label="Primary navigation">
        <a className="brand" href="#top" aria-label="Middle Child home">
          <span className="brand-mark" aria-hidden="true">✦</span>
          <span>MIDDLE CHILD</span>
        </a>
        <div className="links">
          <a href="#never-alone">Never Alone</a>
          <a href="#music">Music</a>
          <a href="#story">Story</a>
          <a href="#creators">Creators</a>
        </div>
        <a className="nav-cta" href="https://distrokid.com/hyperfollow/middlechild7/never-alone-feat-low-sunday/" target="_blank" rel="noreferrer">Pre-save</a>
      </nav>

      <section id="top" className="hero">
        <div className="stars" aria-hidden="true" />
        <div className="glow glow-one" aria-hidden="true" />
        <div className="glow glow-two" aria-hidden="true" />
        <div className="orb-shell" aria-hidden="true">
          <div className="orb" />
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
        </div>

        <div className="hero-copy">
          <p className="eyebrow">Middle Child presents · July 31, 2026</p>
          <h1>Never<br /><em>Alone</em></h1>
          <p className="lede">Some songs are released.<br />Some are survived.</p>
          <p className="sub">Emotional electronic music for people carrying more than they show.</p>
          <div className="actions">
            <a className="button primary" href="https://distrokid.com/hyperfollow/middlechild7/never-alone-feat-low-sunday/" target="_blank" rel="noreferrer">Pre-save the single <span>↗</span></a>
            <a className="button ghost" href="#never-alone">Enter the story <span>↓</span></a>
          </div>
          <p className="hero-note">Middle Child feat. lowly sunday · BVSS FVM</p>
        </div>

        <div className="release-stamp" aria-label="New single releasing July 31, 2026">
          <span>New single</span>
          <strong>07.31.26</strong>
        </div>
        <div className="scroll-cue" aria-hidden="true"><span /> Scroll gently</div>
      </section>

      <section className="welcome" aria-labelledby="welcome-heading">
        <div className="welcome-inner">
          <span className="tiny-star" aria-hidden="true">✦</span>
          <p className="eyebrow">For whoever needed to find this</p>
          <h2 id="welcome-heading">I’m glad you found your way here.</h2>
          <p>You do not have to explain what you are carrying. Stay for a song, read the story, or just take a quiet minute.</p>
        </div>
      </section>

      <section id="never-alone" className="section release-story">
        <div className="wrap">
          <div className="section-heading">
            <div>
              <p className="eyebrow">The new chapter</p>
              <h2>Broken. Held together.<br />Repaired by light.</h2>
            </div>
            <p className="section-intro">“Never Alone” was shaped by depression, grief, faith, healing, and a cancer diagnosis. It does not pretend darkness is easy. It simply leaves a light on inside it.</p>
          </div>

          <div className="story-grid">
            <article className="story-card story-card-large">
              <div className="card-number">01</div>
              <p className="eyebrow">The meaning</p>
              <h3>Even when life felt empty, something was still holding every broken part together.</h3>
              <p>The song begins inside isolation and slowly opens into recognition: the listener was never as abandoned as the darkness made them feel.</p>
            </article>
            <article className="story-card">
              <div className="card-number">02</div>
              <p className="eyebrow">The sound</p>
              <h3>A drop that blooms instead of attacks.</h3>
              <p>Dark synth pulses, atmospheric space, warm low end, guitar texture, and a vocal hook that grows from fragile to cathartic.</p>
            </article>
            <article className="story-card visual-card">
              <div className="visual-core" aria-hidden="true"><span /></div>
              <p>Wounded → hopeful<br />intimate → cinematic</p>
            </article>
          </div>
        </div>
      </section>

      <section className="lyrics-section">
        <div className="wrap lyrics-layout">
          <div className="lyrics-sticky">
            <p className="eyebrow">Never Alone</p>
            <h2>Words for the<br />darkest room.</h2>
            <p>Written and released by Middle Child, featuring Dan’s own lowly sunday vocal alias.</p>
            <a className="text-link" href="https://distrokid.com/hyperfollow/middlechild7/never-alone-feat-low-sunday/" target="_blank" rel="noreferrer">Pre-save for July 31 <span>↗</span></a>
          </div>
          <div className="lyrics">
            {lyrics.map(([label, text]) => (
              <article className="lyric-block" key={label}>
                <span>{label}</span>
                <p>{text}</p>
              </article>
            ))}
            <article className="lyric-block outro">
              <span>Outro</span>
              <p>…never alone<br />…never alone</p>
            </article>
          </div>
        </div>
      </section>

      <section id="music" className="section wrap catalog">
        <div className="section-heading catalog-heading">
          <div><p className="eyebrow">The catalog</p><h2>Music as chapters,<br />not content.</h2></div>
          <p className="section-intro">Middle Child has always been an outlet for what is difficult to say plainly. Each release belongs to a different season, but the thread is the same: feeling made audible.</p>
        </div>
        <div className="grid">
          {releases.map((release, index) => (
            <article className={`card card-${(index % 3) + 1}`} key={release.title}>
              <div className="card-top"><span>{release.year}</span><span>{release.status}</span></div>
              <div className="card-art" aria-hidden="true"><i /><b /></div>
              <h3>{release.title}</h3>
              <p>{release.note}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="story" className="section artist-story">
        <div className="wrap split">
          <div className="story-title">
            <p className="eyebrow">The artist</p>
            <h2>Turning pain into something that can hold another person.</h2>
            <div className="signature">Middle Child · est. 2014</div>
          </div>
          <div className="prose">
            <p className="lead-paragraph">Middle Child is the emotional electronic project of Minneapolis artist and producer Dan Larson.</p>
            <p>It began in 2014 after more than a decade of guitar, bands, rap, beat-making, electronic production, and DJing. The project became a form of self-expression, therapy, and a way to give hope to people navigating mental health and substance-use struggles.</p>
            <p>The 2017 chapter brought releases including “Awaken,” “Miracle,” “Bliss,” “Mercy,” and “YOU,” alongside support from electronic-music media and listeners around the world.</p>
            <p>“Never Alone” marks a return after years away. It carries the same emotional core, but with more scars, more perspective, and a quieter kind of hope.</p>
          </div>
        </div>
      </section>

      <section id="creators" className="section wrap creator-section">
        <div className="creator-banner">
          <div>
            <p className="eyebrow">For creators</p>
            <h2>Clear permission.<br />No guessing.</h2>
          </div>
          <p>Selected one-stop Middle Child releases will be available for approved creator uses, with track-level guidance that explains what is allowed and what still needs clearance.</p>
        </div>
        <div className="feature-grid">
          <div className="feature"><span>01</span><h3>Creator-friendly</h3><p>Approved videos, streams, podcasts, films, nonprofit projects, and social content can use selected music under a clear license.</p></div>
          <div className="feature"><span>02</span><h3>Rights respected</h3><p>The music is not copyright-free. Middle Child and BVSS FVM retain ownership while granting specific permissions.</p></div>
          <div className="feature"><span>03</span><h3>Track by track</h3><p>Label releases, remixes, collaborations, and sampled works remain restricted until their rights are individually verified.</p></div>
        </div>
        <div className="rights-note"><strong>Suggested credit</strong><span>Music: Middle Child — [Track Title]</span></div>
      </section>

      <section className="closing">
        <div className="closing-glow" aria-hidden="true" />
        <div className="closing-content">
          <p className="eyebrow">July 31, 2026</p>
          <h2>You were never<br />truly alone.</h2>
          <p>Pre-save “Never Alone” and be there when this chapter opens.</p>
          <a className="button primary" href="https://distrokid.com/hyperfollow/middlechild7/never-alone-feat-low-sunday/" target="_blank" rel="noreferrer">Pre-save now <span>↗</span></a>
        </div>
      </section>

      <footer>
        <div className="footer-brand"><strong>MIDDLE CHILD</strong><span>Music for people carrying more than they show.</span></div>
        <div className="footer-meta"><span>Minneapolis, Minnesota</span><span>BVSS FVM · © 2026</span></div>
        <a href="#top">Back to the light ↑</a>
      </footer>
    </main>
  );
}
