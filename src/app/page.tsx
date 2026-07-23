const releases = [
  { title: 'Never Alone', year: '2026', note: 'A wounded but hopeful return built from dark synths, warm low end, guitar, and a drop that blooms instead of attacks.' },
  { title: 'Mercy', year: '2017', note: 'A defining Middle Child release approaching one million Spotify streams.' },
  { title: 'Awaken', year: '2017', note: 'Part of the first major future-bass chapter.' },
  { title: 'Miracle', year: '2017', note: 'Melodic, emotional, and rooted in the original Middle Child era.' },
  { title: 'Bliss', year: '2017', note: 'A bright chapter in a catalog built around feeling and release.' },
  { title: 'YOU', year: '2017', note: 'A fan-connected release from the project’s early momentum.' },
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
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(recordingSchema) }} />
      <nav className="nav">
        <a className="brand" href="#top">MIDDLE CHILD</a>
        <div className="links"><a href="#music">Music</a><a href="#story">Story</a><a href="#creators">Creators</a><a href="#press">Press</a></div>
      </nav>

      <section id="top" className="hero">
        <div className="orb" />
        <div className="stars" />
        <div className="hero-copy">
          <p className="eyebrow">Middle Child presents</p>
          <h1>Never<br />Alone</h1>
          <p className="lede">Some songs are released. Some are survived.</p>
          <p className="sub">Emotional electronic music for people carrying more than they show.</p>
          <div className="actions">
            <a className="button primary" href="https://distrokid.com/hyperfollow/middlechild7/never-alone-feat-low-sunday/">Pre-save · July 31</a>
            <a className="button" href="#story">Enter the story</a>
          </div>
        </div>
        <div className="release"><span>New single</span><strong>07.31.26</strong></div>
      </section>

      <section className="statement">
        <p>Broken → held together → repaired by light → alive again → quietly radiant.</p>
      </section>

      <section id="music" className="section wrap">
        <p className="eyebrow">The catalog</p>
        <h2>Music as chapters,<br />not content.</h2>
        <div className="grid">
          {releases.map((release) => (
            <article className="card" key={release.title}>
              <span>{release.year}</span><h3>{release.title}</h3><p>{release.note}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="story" className="section story">
        <div className="wrap split">
          <div><p className="eyebrow">The story</p><h2>A project built to turn pain into something that can hold another person.</h2></div>
          <div className="prose">
            <p>Middle Child began in 2014 after more than a decade of guitar, bands, rap, beat-making, electronic production, and DJing. Created by Dan Larson, it became a form of self-expression and therapy.</p>
            <p>The 2017 era brought releases including Awaken, Miracle, Bliss, Mercy, and YOU, with support across electronic-music media and hundreds of thousands of listeners.</p>
            <p>Never Alone marks a return shaped by depression, grief, faith, healing, and a cancer diagnosis. Its message is simple: even when life feels empty, you may be more held than you realize.</p>
          </div>
        </div>
      </section>

      <section id="creators" className="section wrap">
        <p className="eyebrow">Creator library</p>
        <h2>Clear permission.<br />No guessing.</h2>
        <div className="feature-grid">
          <div className="feature"><h3>Creator-friendly releases</h3><p>Selected Middle Child music will be available royalty-free for approved videos, streams, podcasts, films, nonprofit projects, and social content.</p></div>
          <div className="feature"><h3>Copyright remains intact</h3><p>The music is not copyright-free. Middle Child and BVSS FVM retain ownership while granting creators a clear license for approved uses.</p></div>
          <div className="feature"><h3>Track-by-track rights</h3><p>Older label releases, remixes, collaborations, and sampled works remain restricted until their rights are individually verified.</p></div>
        </div>
        <p className="credit">Suggested credit: “Music: Middle Child — [Track Title]”</p>
      </section>

      <section id="press" className="section press">
        <div className="wrap split">
          <div><p className="eyebrow">Press</p><h2>Middle Child is an emotional electronic project from Minneapolis.</h2></div>
          <div className="prose"><p>The sound blends melodic bass, atmospheric future bass, cinematic low-end warmth, guitar textures, and wounded-but-hopeful songwriting.</p><p>Label: BVSS FVM<br />Artist: Middle Child<br />Creator: Dan Larson<br />Featured alias on Never Alone: lowly sunday</p></div>
        </div>
      </section>

      <footer><strong>MIDDLE CHILD</strong><span>Music for people carrying more than they show.</span><span>© 2026 Middle Child / BVSS FVM</span></footer>
    </main>
  );
}
