// Body text supports inline links written as [label](/internal-path) or
// [label](https://external). Nothing else is parsed: no HTML, no other markdown.
export type LearnTopic =
  | 'Spotify Promotion'
  | 'Free Music Promotion'
  | 'Playlist Promotion'
  | 'Music Marketing'
  | 'Releasing Music'
  | 'Genres & Curation';

export const learnTopics: LearnTopic[] = [
  'Spotify Promotion',
  'Free Music Promotion',
  'Playlist Promotion',
  'Music Marketing',
  'Releasing Music',
  'Genres & Curation',
];

export type GuideTable = {
  caption: string;
  columns: string[];
  rows: string[][];
};

// 'submit' renders the free-submission callout. Its disclosure line is fixed
// in the component and cannot be edited per article.
export type GuideCallout =
  | { kind: 'submit'; title?: string; body?: string }
  | { kind: 'warning' | 'note'; title: string; body: string };

export type GuideSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
  steps?: { title: string; body: string }[];
  table?: GuideTable;
  callout?: GuideCallout;
};

export type GuideSource = {
  label: string;
  publisher: string;
  href: string;
  accessed: string; // YYYY-MM-DD
};

export type LearnGuide = {
  slug: string;
  seoTitle: string;
  title: string;
  description: string;
  eyebrow: string;
  lead: string;
  topic: LearnTopic;
  published: string; // YYYY-MM-DD
  updated: string; // YYYY-MM-DD
  sections: GuideSection[];
  faq: { question: string; answer: string }[];
  related: { href: string; label: string; detail: string }[];
  sources?: GuideSource[];
};

export const guides: LearnGuide[] = [
  {
    slug: 'what-is-emotional-bass',
    topic: 'Genres & Curation',
    published: '2026-09-26',
    updated: '2026-09-26',
    seoTitle: 'What Is Emotional Bass? A Curator’s Guide',
    title: 'What Is Emotional Bass?',
    description: 'A BVSS FVM curator guide to emotional bass, melodic dubstep, future bass, and what makes a track fit an emotion-first electronic playlist.',
    eyebrow: 'Genre guide · BVSS FVM',
    lead: 'Emotional bass is less a rigid genre box than a shared listening experience: electronic music where melody, atmosphere, vocals, and low-end impact are used to make the emotional payoff feel as important as the drop.',
    sections: [
      {
        heading: 'Emotional bass is an umbrella, not a single production formula.',
        paragraphs: [
          'At BVSS FVM, we use “emotional bass” as a practical curation term for records that sit across melodic dubstep, future bass, melodic bass, cinematic electronic music, and adjacent styles. The common thread is not one BPM range or one synth preset. It is the way the arrangement builds emotional tension and then releases it through melody, harmony, vocals, or a bass-driven drop.',
          'A future bass track can fit. A melodic dubstep record can fit. A softer cinematic electronic record can fit too. What matters is whether the song creates a strong emotional arc instead of using melody as decoration around an otherwise unrelated drop.'
        ],
        bullets: [
          'Melodic dubstep usually leans heavier, wider, and more dramatic in the drop.',
          'Future bass often uses brighter chord movement, vocal chops, and more elastic rhythmic production.',
          'Melodic bass overlaps both, but tends to prioritize songwriting and emotional payoff over strict genre rules.',
          'Emotional bass is the listening lane that connects those sounds when the feeling is the organizing principle.'
        ]
      },
      {
        heading: 'What we listen for when curating emotional bass.',
        paragraphs: [
          'The strongest records usually establish a recognizable emotional identity early. That might be a vocal phrase, guitar motif, piano progression, pad texture, or a chord movement that returns later in a bigger form. When the drop arrives, it should feel connected to the song that came before it.',
          'We also care about contrast. A huge drop is more effective when the verses and breakdowns give it somewhere to go. Density, loudness, and complexity are not substitutes for an arc. The best records leave enough space for the vocal, melody, and low end to each have a job.'
        ],
        bullets: [
          'A memorable melodic or vocal idea.',
          'A drop that feels earned by the buildup.',
          'Low end with weight but enough separation to stay musical.',
          'A coherent emotional tone from intro through outro.',
          'Production that rewards headphones and still translates on larger systems.'
        ]
      },
      {
        heading: 'How the BVSS FVM playlist lane is different.',
        paragraphs: [
          'Our Emotional Bass playlist is not intended to be a generic “all melodic EDM” dump. It is designed around songs that feel cinematic, vulnerable, euphoric, reflective, or hopeful while still delivering a meaningful electronic payoff.',
          'That means a technically excellent bass record can still be wrong for this particular lane. A track may be better suited to Bass Music, Hardwave, Chillstep, or EMO // ELECTRONIC depending on its energy, texture, vocal style, and emotional center. The job of curation is not to force every good song into the biggest playlist; it is to place it where the full sequence makes sense.'
        ]
      },
      {
        heading: 'If you are submitting an emotional bass track.',
        paragraphs: [
          'Send the version that best represents the finished record. Genre labels help with routing, but comparable artists, mood, and a concise note about the song are often more useful than stacking five overlapping subgenre names.',
          'Placement is never guaranteed. Our matching system can suggest likely BVSS FVM lanes, but a human curator makes the editorial decision. A strong submission explains what the track is without trying to game the playlist name.'
        ]
      }
    ],
    faq: [
      {
        question: 'Is emotional bass the same as melodic dubstep?',
        answer: 'Not exactly. Melodic dubstep is one of the main sounds inside the emotional-bass lane, but emotional bass can also include future bass, melodic bass, cinematic electronic music, and softer adjacent records when the emotional arc is the defining feature.'
      },
      {
        question: 'Can future bass fit an emotional bass playlist?',
        answer: 'Yes. Future bass fits naturally when the record has strong melodic or vocal storytelling and enough bass-driven payoff to belong beside melodic bass and melodic dubstep.'
      },
      {
        question: 'Can independent artists submit to BVSS FVM?',
        answer: 'Yes. BVSS FVM accepts Spotify-track submissions through its first-party submission form. Matching helps route tracks, but all placements remain human editorial decisions.'
      }
    ],
    related: [
      { href: '/playlists/emotional-bass', label: 'Emotional Bass 2026', detail: 'Hear the lane in context on Spotify.' },
      { href: '/playlists/emo-electronic', label: 'EMO // ELECTRONIC', detail: 'For sadder, alternative, guitar-adjacent electronic records.' },
      { href: '/submit?playlist=emotional-bass', label: 'Submit an emotional bass track', detail: 'Send one Spotify track for editorial consideration.' }
    ]
  },
  {
    slug: 'liquid-dnb-vs-dancefloor-dnb',
    topic: 'Genres & Curation',
    published: '2026-09-26',
    updated: '2026-09-26',
    seoTitle: 'Liquid DnB vs Dancefloor DnB: Curator Guide',
    title: 'Liquid DnB vs Dancefloor DnB',
    description: 'How BVSS FVM separates liquid drum & bass from dancefloor DnB, including mood, vocals, production, energy, and playlist fit.',
    eyebrow: 'Drum & bass guide · BVSS FVM',
    lead: 'Liquid DnB and dancefloor DnB can share tempo, vocals, and melodic writing, but they solve different listening problems. We keep them in separate BVSS FVM lanes because energy, arrangement, and context matter as much as BPM.',
    sections: [
      {
        heading: 'Liquid DnB prioritizes flow, atmosphere, and emotional detail.',
        paragraphs: [
          'Liquid drum & bass often feels continuous rather than explosive. The drums can still move quickly, but the emotional focus may sit in a vocal, piano line, pad bed, guitar texture, or warm bass movement. The record should be able to carry a long drive, focused work session, or headphone listen without demanding maximum intensity every sixteen bars.',
          'That does not mean liquid has to be quiet. Some liquid records are euphoric and highly energetic. The distinction is that the energy tends to feel smooth, rolling, and immersive rather than engineered around a festival-sized release.'
        ],
        bullets: [
          'Rolling breaks and a sense of forward motion.',
          'Atmospheric pads, keys, guitars, or soulful harmony.',
          'Vocals that remain part of the song instead of only setting up the drop.',
          'Warm or fluid bass movement rather than constant impact design.',
          'A sequence that works for driving, headphones, focus, and emotional listening.'
        ]
      },
      {
        heading: 'Dancefloor DnB is built around lift, impact, and immediate payoff.',
        paragraphs: [
          'Dancefloor DnB usually pushes the hook and the drop farther forward. Bigger synths, cleaner tension-and-release structure, louder vocal moments, and more obvious festival translation are common. A dancefloor record often makes its purpose clear quickly: it wants movement.',
          'For BVSS FVM, this lane can include melodic and vocal records as long as the payoff is large enough to change the energy of the room. We do not require aggression; we do require momentum and a clear peak.'
        ],
        bullets: [
          'Large vocal or melodic hooks.',
          'Builds with obvious tension and a strong downbeat payoff.',
          'Festival, running, workout, or high-energy driving context.',
          'Production that stays readable when the arrangement gets dense.',
          'Drops that create a physical change in energy.'
        ]
      },
      {
        heading: 'Why we maintain two separate playlists.',
        paragraphs: [
          'If every melodic drum & bass record goes into one playlist, the listener experience gets unstable. A soft, reflective liquid track can feel out of place immediately after a huge dancefloor anthem, and the reverse is equally true.',
          'Separating the lanes lets each playlist develop a clearer promise. Liquid DnB can stay atmospheric and replayable. Dancefloor DnB can stay euphoric and high-impact. Some artists will fit both over time, but not necessarily with the same record.'
        ]
      },
      {
        heading: 'How to decide where your own track fits.',
        paragraphs: [
          'Ask what happens when the chorus or drop arrives. If the record gets wider, louder, and more physically energetic, Dancefloor DnB is probably the better first look. If the arrangement keeps flowing while deepening the emotion, Liquid DnB is usually the stronger match.',
          'If you are unsure, submit once. The BVSS FVM routing system can suggest likely lanes from genre, mood, comparable artists, and your preferred playlist, but the final decision remains human.'
        ]
      }
    ],
    faq: [
      {
        question: 'Is liquid DnB always chill?',
        answer: 'No. Liquid DnB can be fast, euphoric, and energetic. The key distinction is usually the smoother emotional flow and atmospheric emphasis rather than a low energy level.'
      },
      {
        question: 'Can a vocal DnB song fit both playlists?',
        answer: 'Potentially, but the same track should only be placed where its energy and sequencing make sense. Vocal presence alone does not determine the lane.'
      },
      {
        question: 'Which BVSS FVM DnB playlist should I submit to?',
        answer: 'Choose Liquid DnB for atmospheric, rolling, emotional records and Dancefloor DnB for larger festival-ready melodic or vocal records. If unsure, submit once and let the routing system suggest a fit.'
      }
    ],
    related: [
      { href: '/playlists/liquid-dnb', label: 'Liquid DnB 2026', detail: 'Atmospheric, melodic, and emotional drum & bass.' },
      { href: '/playlists/dancefloor-dnb', label: 'Dancefloor DnB 2026', detail: 'Vocal, euphoric, and festival-ready drum & bass.' },
      { href: '/submit', label: 'Submit a DnB track', detail: 'One submission can be routed across the network.' }
    ]
  },
  {
    slug: 'late-night-drive-electronic-music',
    topic: 'Genres & Curation',
    published: '2026-09-26',
    updated: '2026-09-26',
    seoTitle: 'How We Curate Late-Night Drive Electronic Music',
    title: 'How We Curate Late-Night Drive Electronic Music',
    description: 'A first-party BVSS FVM guide to building a late-night electronic playlist using mood, pacing, low end, vocals, and sequencing instead of one genre label.',
    eyebrow: 'Mood curation guide · BVSS FVM',
    lead: '“Late-night drive” is a listener intent, not a genre. A good driving playlist can move through melodic house, chill electronic, deep bass, indie electronic, future garage, and emotional dance without losing the atmosphere that made the listener press play.',
    sections: [
      {
        heading: 'The playlist promise comes before the genre.',
        paragraphs: [
          'When we curate for late-night driving, the first question is not “what genre is this?” It is “does this record preserve the feeling of motion?” The strongest tracks create space around the listener while still carrying enough pulse to keep the sequence moving.',
          'That can mean a four-on-the-floor melodic house groove, a halftime electronic record, a soft future-garage rhythm, or a bass-heavy track with restrained vocals. Genre variety works when the atmosphere remains coherent.'
        ]
      },
      {
        heading: 'What usually makes a track work at night.',
        paragraphs: [
          'Darkness changes how dense production feels. Tracks with too many competing elements can become tiring across a long playlist, while records with controlled low end, clear focal points, and wide atmosphere often feel larger without feeling louder.',
          'Vocals matter too. Intimate, distant, processed, or emotionally restrained vocals tend to sit naturally in this context because they leave room for the road, the environment, and the listener’s own headspace.'
        ],
        bullets: [
          'A steady sense of forward movement.',
          'Low end that feels deep without masking the rest of the mix.',
          'Atmosphere that creates width or distance.',
          'Melodies and vocals that can carry emotion without demanding constant attention.',
          'Transitions that avoid sudden mood whiplash.'
        ]
      },
      {
        heading: 'Sequencing is what turns songs into a drive.',
        paragraphs: [
          'A useful playlist is more than a folder of tracks with similar tags. We think about energy curves: how quickly the playlist should settle in, where it can get brighter or heavier, and how often it needs a reset before the next lift.',
          'That is why Late Night Drive can overlap with Melodic House & Techno, Chillstep, Indie Electronic, Deep Bass, and UK Garage without simply duplicating them. Those playlists are organized around sounds. Late Night Drive is organized around a moment.'
        ]
      },
      {
        heading: 'Submitting a track for a mood-based playlist.',
        paragraphs: [
          'For a mood playlist, your genre label is useful but incomplete. Include the mood and a couple of comparable artists that describe the actual listening context. If a track is technically house but behaves like a cinematic late-night record, that information helps the curator route it correctly.',
          'As with every BVSS FVM playlist, there is no guaranteed placement. The point is to build a coherent listener experience first.'
        ]
      }
    ],
    faq: [
      {
        question: 'What genre is late-night drive music?',
        answer: 'There is no single genre. Late-night electronic playlists can combine melodic house, chill electronic, deep bass, future garage, indie electronic, UK garage, and other styles when the pacing and atmosphere remain coherent.'
      },
      {
        question: 'What makes electronic music good for driving?',
        answer: 'Consistent motion, controlled low end, clear focal points, atmospheric space, and smooth transitions are more important than one specific tempo or subgenre.'
      },
      {
        question: 'Can I submit a song specifically for Late Night Drive?',
        answer: 'Yes. Select Late Night Drive as a preferred playlist on the BVSS FVM submission form, and include mood and comparable-artist context to help with routing.'
      }
    ],
    related: [
      { href: '/playlists/late-night-drive', label: 'Late Night Drive 2026', detail: 'The BVSS FVM mood-first driving playlist.' },
      { href: '/playlists/melodic-house', label: 'Melodic House & Techno', detail: 'A related house-focused lane with more genre specificity.' },
      { href: '/submit?playlist=late-night-drive', label: 'Submit for Late Night Drive', detail: 'Send a Spotify track for editorial consideration.' }
    ]
  },
  {
    slug: 'how-we-review-playlist-submissions',
    topic: 'Playlist Promotion',
    published: '2026-09-26',
    updated: '2026-09-26',
    seoTitle: 'How BVSS FVM Reviews Playlist Submissions',
    title: 'How BVSS FVM Reviews Playlist Submissions',
    description: 'A transparent look at the BVSS FVM playlist submission process, matching system, human review criteria, placement rules, and what artists can expect.',
    eyebrow: 'Artist guide · BVSS FVM',
    lead: 'BVSS FVM uses software to organize submissions, not to make taste decisions. A track can be routed automatically toward likely playlists, but a human curator decides whether it belongs in the listening experience.',
    sections: [
      {
        heading: 'Step 1: one track enters one submission record.',
        paragraphs: [
          'Artists submit a Spotify track URL, artist name, genre, moods, comparable artists, release date, and optional notes. Preferred playlists are optional. You do not need to submit the same song separately to Emotional Bass, Late Night Drive, Chillstep, or another BVSS FVM playlist.',
          'The system also blocks obvious duplicate submissions so the queue stays usable for both artists and curators.'
        ]
      },
      {
        heading: 'Step 2: matching organizes the queue.',
        paragraphs: [
          'The routing layer compares your genre, moods, comparable artists, and any preferred playlist against the metadata of the active BVSS FVM network. It can produce a short list of likely fits and explain why a match was suggested.',
          'A match score is not a quality score, a placement score, or a promise. It is simply a way to reduce administrative work so the curator can spend more time listening.'
        ]
      },
      {
        heading: 'Step 3: a human reviews the record in context.',
        paragraphs: [
          'The curator listens for the song itself and for playlist fit. A well-produced record can still be rejected from a specific lane if it changes the sequence too sharply, duplicates a sound already overrepresented, or fits another BVSS FVM playlist better.',
          'The central question is not “is this artist big enough?” It is “does this track make this playlist better for the listener?”'
        ],
        bullets: [
          'Songwriting or musical idea: is there something worth returning to?',
          'Production translation: does the important material remain clear and balanced?',
          'Genre and mood fit: does the record belong beside the current sequence?',
          'Distinctiveness: does it add something rather than merely imitate an anchor artist?',
          'Replay value: does the song hold up beyond the first drop or hook?'
        ]
      },
      {
        heading: 'Step 4: accept, hold, or reject.',
        paragraphs: [
          'Accepted tracks are assigned to a playlist and the placement is recorded so we can understand what was added, when it was added, and how the network evolves. A hold means the track may deserve another listen or a later programming window. A rejection means we are not placing that submission in the current network.',
          'BVSS FVM does not sell guaranteed playlist placement. Any paid third-party route we may reference must be understood as payment for review or consideration only, never payment for a guaranteed editorial outcome.'
        ]
      },
      {
        heading: 'What helps an artist submit well.',
        paragraphs: [
          'Use the final Spotify version, choose a realistic primary genre, add a few useful moods, and name comparable artists because the actual music overlaps—not because those artists are large. A short note about the record is more useful than a long press release.',
          'Most importantly, submit the song you want heard. The routing system can handle uncertainty about which exact playlist is the best fit.'
        ]
      }
    ],
    faq: [
      {
        question: 'Does submitting guarantee a BVSS FVM playlist placement?',
        answer: 'No. Submission creates an opportunity for editorial review. Placement is never guaranteed and remains a human curation decision.'
      },
      {
        question: 'Do I need to submit the same track to multiple BVSS FVM playlists?',
        answer: 'No. Submit once. The routing system can suggest multiple possible playlist fits from the information you provide.'
      },
      {
        question: 'Does a high matching score mean my song will be accepted?',
        answer: 'No. Matching only helps route the submission. It is not a quality rating or placement probability.'
      },
      {
        question: 'Can emerging artists submit?',
        answer: 'Yes. BVSS FVM evaluates the track and its fit with the playlist rather than requiring an artist to already have a large audience.'
      }
    ],
    related: [
      { href: '/submit', label: 'Submit music', detail: 'Send one Spotify track to the BVSS FVM review queue.' },
      { href: '/playlists', label: 'Explore all playlists', detail: 'Understand the active lanes before or after submitting.' },
      { href: '/learn/what-is-emotional-bass', label: 'What is emotional bass?', detail: 'See how one BVSS FVM lane is defined editorially.' }
    ]
  },
  {
    slug: 'how-to-get-on-spotify-playlists',
    topic: 'Spotify Promotion',
    published: '2026-10-07',
    updated: '2026-10-07',
    seoTitle: 'How to Get on Spotify Playlists in 2026: A Curator’s Guide',
    title: 'How to Get on Spotify Playlists in 2026',
    description: 'The three ways onto Spotify playlists: editorial pitching, algorithmic playlists and independent curators. Spotify’s actual rules, a timeline and red flags.',
    eyebrow: 'Spotify promotion · Curator’s guide',
    lead: 'There are three ways onto Spotify playlists, and each works differently: Spotify’s editors, Spotify’s algorithms and independent curators. This guide covers all three using Spotify’s published rules, plus what we see from the curator side of the inbox at BVSS FVM.',
    sections: [
      {
        heading: 'The three kinds of Spotify playlists',
        paragraphs: [
          'Spotify itself sorts playlists into editorial, personalized (algorithmic) and listener-created. They are reached in completely different ways, so it helps to know which one you are aiming at before you spend time or money.',
        ],
        table: {
          caption: 'Who decides, and how you get considered',
          columns: ['Playlist type', 'Who decides', 'How you get considered', 'What you control'],
          rows: [
            ['Editorial (Spotify logo in the byline)', 'Spotify’s editors', 'Pitch one unreleased song in Spotify for Artists at least 7 days before release', 'The pitch, the timing and the song'],
            ['Personalized (Release Radar, Discover Weekly, Daily Mix)', 'Spotify’s algorithms, per listener', 'No pitch exists. They respond to what listeners do', 'Your followers and real listening'],
            ['Independent (curators, brands, labels, fans)', 'Whoever runs the playlist', 'Their submission form, platform or contact', 'Fit, quality and how you approach them'],
          ],
        },
      },
      {
        heading: 'Route 1: pitch Spotify’s editors yourself',
        paragraphs: [
          'Editorial pitching is free and happens inside Spotify for Artists. Nobody else can do it for you unless they have access to your artist profile, and no legitimate service can sell you a guaranteed spot. Spotify’s own wording is that pitching “doesn’t guarantee playlist placement.”',
        ],
        steps: [
          { title: 'Deliver the release early', body: 'Get your music to your distributor well ahead of release day. Spotify asks for delivery at least 7 days before release so editors have time to listen. Leave extra time for your distributor to process it.' },
          { title: 'Choose the one song to pitch', body: 'You can pitch one song at a time, and it has to be unreleased. Once a song is live it is no longer eligible, so decide before release day.' },
          { title: 'Fill in the pitch properly', body: 'Genre, mood, instruments and a short description of the song. Spotify says more detail gives a song a better chance. Describe the song, not your career goals.' },
          { title: 'Know what you get either way', body: 'If you pitch an unreleased song at least 7 days before release, Spotify adds it to your followers’ Release Radar, even if editors pass on it.' },
        ],
        callout: {
          kind: 'note',
          title: 'Missed the window?',
          body: 'A song that is already out cannot be pitched to editors. Put the effort into independent playlists and into pitching your next release on time. Independent curators (including [ours](/free-spotify-playlist-submission)) accept released songs.',
        },
      },
      {
        heading: 'Route 2: algorithmic playlists (what you can and can’t control)',
        paragraphs: [
          'Personalized playlists are built for each listener from what that person plays and when. There is no form to fill in. What you can influence is the audience those algorithms are working with.',
          'Release Radar is the most concrete one. Your followers get songs from your new release there. If you pitched a song, that is the one they get; if not, Spotify picks. Each listener gets one song per artist per week, a song can stay for up to 4 weeks if the listener has not heard it, and it is only included where you are the main or featured artist.',
          'That makes followers the lever you actually hold: Spotify’s own advice is to encourage fans to follow you, because followers get your releases. Spotify also says that when fans add music to their own playlists, it tells Spotify what they like and what to recommend. Bought streams do not help; they are a risk (see the red flags below).',
        ],
      },
      {
        heading: 'Route 3: independent playlists, done properly',
        paragraphs: [
          'Independent playlists are run by people, labels and brands. Some accept submissions through a form or a platform, some only through direct contact, and many accept nothing at all. The work is finding the ones that fit and approaching them the way they ask to be approached.',
        ],
        steps: [
          { title: 'Find playlists that fit the song, not just the genre tag', body: 'Search Spotify for the sound and mood of your song, then open each playlist and listen to what is actually on it. Fit is about the sequence: would your track sit naturally between the songs already there?' },
          { title: 'Check it is real and alive', body: 'Look at when it was last updated, whether the tracks belong together, and who runs it. Use the red flags below before sending anything, and never pay for a guaranteed add.' },
          { title: 'Use the curator’s own channel', body: 'Submit through their form, platform or listed contact. Ignoring their instructions is the fastest way to be skipped.' },
          { title: 'Pitch the song in a few lines', body: 'The Spotify link (or a private link for unreleased music), the genre and mood a listener would hear, two or three comparable artists, and one sentence on why it fits that specific playlist.' },
          { title: 'Follow up once, then move on', body: 'A no or no answer is about fit with that playlist at that moment. Keep a simple list of who you contacted and when, and approach them again with your next release rather than the same song.' },
        ],
        callout: {
          kind: 'submit',
          title: 'Want one place to start?',
          body: 'Our [free submission page](/free-spotify-playlist-submission) lists every playlist in the BVSS FVM and CuratorOS network that is open to submissions, with filters for genre, mood and moment. Submit once and each playlist that fits gets a human decision.',
        },
      },
      {
        heading: 'Red flags before you submit or pay anyone',
        paragraphs: [
          'Spotify’s position is direct: paid third-party services that guarantee streams are not legitimate, services promising guaranteed playlist placement for money break its terms, and using them can get your music removed. Spotify can also withhold royalties tied to artificial streams. These are the warning signs we tell artists to check.',
        ],
        table: {
          caption: 'Warning signs and what they usually mean',
          columns: ['You see', 'Why it matters'],
          rows: [
            ['A promise of placement, streams or followers in exchange for payment', 'Spotify says selling guaranteed placement breaks its terms. Legitimate curators decide after listening.'],
            ['Price based on the number of streams you will get', 'Nobody can promise listener behavior honestly. This is how bot services sell.'],
            ['Tracks with no common sound or mood', 'Often a playlist built for numbers, not listeners. Your song will not find its audience there.'],
            ['No way to tell who runs it', 'You cannot judge a curator you cannot identify.'],
            ['Requests for your Spotify for Artists or distributor login', 'No legitimate curator needs access to your accounts. Never share them.'],
          ],
        },
      },
      {
        heading: 'What curators actually listen for',
        paragraphs: [
          'From our side of the inbox at BVSS FVM, the question is never “is this artist big enough?” It is “does this song make this playlist better for the person listening?” In practice that comes down to a few things, which we explain in full in [how we review submissions](/learn/how-we-review-playlist-submissions).',
        ],
        bullets: [
          'Fit with the lane: the genre and mood a listener hears, not the label on the file.',
          'Sequence: whether the track sits naturally next to what is already playing.',
          'Production translation: the important parts stay clear and balanced on ordinary speakers and earbuds.',
          'Something to come back to: a hook, an idea or a feeling that holds up after the first listen.',
          'Honest metadata: a realistic primary genre and comparable artists whose music actually overlaps.',
        ],
      },
      {
        heading: 'A release timeline that covers all three routes',
        paragraphs: [
          'Timelines vary by distributor and genre. This is a practical order of operations built around Spotify’s 7-day rule.',
        ],
        table: {
          caption: 'Order of operations around release day',
          columns: ['When', 'Do this'],
          rows: [
            ['Weeks before release', 'Finish the master and metadata. Deliver to your distributor with time to spare.'],
            ['Once it shows in Spotify for Artists', 'Pitch your chosen song to editors. It must be at least 7 days before release.'],
            ['Before release', 'Build a short list of independent playlists that genuinely fit, and note how each accepts submissions. Curators that take unreleased music can hear it now.'],
            ['Release week', 'Point fans to your Spotify profile and ask them to follow. Submit to the independent playlists on your list.'],
            ['Following weeks', 'Check Spotify for Artists to see where listeners are finding the song, follow up once where appropriate, and start planning the next pitch.'],
          ],
        },
      },
      {
        heading: 'How to tell whether a placement is working',
        paragraphs: [
          'In Spotify for Artists, go to Music then Playlists. Spotify shows the playlists your music is on (up to 100 of them), ordered by how many of your listeners came from each, for the last 12 months. A playlist only appears once at least 3 of your listeners have played your music there.',
          'A playlist’s follower count tells you its potential, not what it will do for your song. The listeners it actually sends you are the number to watch.',
        ],
      },
    ],
    faq: [
      { question: 'Can I pay to get on Spotify editorial playlists?', answer: 'No. Editorial pitching is free in Spotify for Artists, and Spotify says services that sell guaranteed playlist placement break its terms.' },
      { question: 'Can I pitch a song that is already released?', answer: 'Not to Spotify’s editors: once a song is live it is no longer eligible. Independent curators often do accept released songs.' },
      { question: 'How many songs can I pitch to Spotify editors?', answer: 'One song at a time, and it must be unreleased.' },
      { question: 'Do I need a label or distributor relationship to pitch?', answer: 'You need access to your artist profile in Spotify for Artists. Anyone on the team with Admin or Editor access can pitch.' },
      { question: 'Will a small playlist placement earn royalties?', answer: 'Spotify only pays recorded royalties on tracks that reached at least 1,000 streams in the previous 12 months (a policy in effect since April 2024), along with a minimum number of unique listeners it does not publish.' },
      { question: 'Is submitting to independent curators the same as pitching Spotify?', answer: 'No. Independent curators run their own playlists. Their decision has nothing to do with Spotify’s editors, and you should still pitch editors yourself for unreleased songs.' },
    ],
    related: [
      { href: '/free-spotify-playlist-submission', label: 'Free Spotify playlist submission', detail: 'Every open playlist in our network, with filters and a free submit button.' },
      { href: '/learn/how-we-review-playlist-submissions', label: 'How we review submissions', detail: 'What our curators listen for and what accept, hold and decline mean.' },
      { href: '/learn/free-spotify-promotion', label: 'Free Spotify promotion', detail: 'Spotify’s free artist tools and a release-by-release plan.' },
      { href: '/learn/spotify-promotion-scams', label: 'Spotify promotion scams', detail: 'How the common schemes work and what to do if a suspicious playlist adds you.' },
      { href: '/learn/find-spotify-playlist-curators', label: 'Find Spotify playlist curators', detail: 'Find playlists that fit and reach curators through their own channels.' },
      { href: '/learn/how-to-pitch-playlist-curators', label: 'How to pitch playlist curators', detail: 'Templates, a worked example and why curators pass.' },
      { href: '/playlists/collections', label: 'Playlist collections', detail: 'Browse playlists by genre, mood and moment.' },
    ],
    sources: [
      { label: 'Pitching music and videos to Spotify playlist editors', publisher: 'Spotify for Artists Support', href: 'https://support.spotify.com/us/artists/article/pitching-music-and-videos-to-playlist-editors/', accessed: '2026-10-07' },
      { label: 'Getting music on Release Radar', publisher: 'Spotify for Artists Support', href: 'https://support.spotify.com/us/artists/article/getting-music-on-release-radar/', accessed: '2026-10-07' },
      { label: 'Types of Spotify playlists', publisher: 'Spotify for Artists Support', href: 'https://support.spotify.com/us/artists/article/types-of-spotify-playlists/', accessed: '2026-10-07' },
      { label: 'Promoting music on Spotify', publisher: 'Spotify for Artists Support', href: 'https://support.spotify.com/by-en/artists/article/promoting-music-on-spotify/', accessed: '2026-10-07' },
      { label: 'Artificial streaming and paid 3rd-party services that guarantee streams', publisher: 'Spotify for Artists Support', href: 'https://support.spotify.com/us/artists/article/third-party-services-that-guarantee-streams/', accessed: '2026-10-07' },
      { label: 'Seeing playlists you’re added to', publisher: 'Spotify for Artists Support', href: 'https://support.spotify.com/us/artists/article/seeing-playlists-your-music-is-on/', accessed: '2026-10-07' },
      { label: 'Track monetization eligibility', publisher: 'Spotify for Artists Support', href: 'https://support.spotify.com/us/artists/article/track-monetization-eligibility/', accessed: '2026-10-07' },
    ],
  },
  {
    slug: 'free-spotify-promotion',
    topic: 'Free Music Promotion',
    published: '2026-10-07',
    updated: '2026-10-07',
    seoTitle: 'Free Spotify Promotion: A Practical Plan Without Buying Streams',
    title: 'Free Spotify Promotion for Artists: A Practical Plan',
    description: 'Free Spotify promotion that is real: Spotify’s own free artist tools, free playlist submission and your audience, in a release-by-release plan. No bots.',
    eyebrow: 'Free music promotion · Artist plan',
    lead: 'Free Spotify promotion is real, but it is a set of tools and habits, not a service you buy. Spotify gives every artist free tools, independent curators accept free submissions, and your own listeners do the rest. This is the plan we would follow, release by release.',
    sections: [
      {
        heading: 'What free promotion can and can’t do',
        paragraphs: [
          'Free promotion puts your music in front of people who might care about it. It cannot promise numbers. Anything that promises streams or placements in exchange for money is not promotion, and [Spotify says](https://support.spotify.com/us/artists/article/third-party-services-that-guarantee-streams/) using those services can get your music removed.',
        ],
        table: {
          caption: 'Free, paid and the things to avoid',
          columns: ['Category', 'Examples', 'Verdict'],
          rows: [
            ['Free tools from Spotify', 'Editorial pitching, Release Radar via your pitch, Artist Pick, Canvas, Promo Cards, Spotify Codes, Countdown Pages (if eligible)', 'Use all that apply'],
            ['Free outside Spotify', 'Independent playlist submission, your own channels, fans sharing your link', 'Core of the plan'],
            ['Paid tools from Spotify', 'Marquee and Showcase display campaigns, Spotify Ads Manager', 'Legitimate, optional, not needed to start'],
            ['Services selling streams or placements', 'Bot plays, paid playlist adds', 'Avoid: against Spotify’s terms'],
          ],
        },
      },
      {
        heading: 'Before release: set up the free tools',
        paragraphs: [
          'Most of the free leverage on Spotify happens before release day, because editorial pitching closes once a song is live.',
        ],
        steps: [
          { title: 'Deliver early and pitch one song', body: 'Get the release to your distributor early, then pitch one unreleased song in Spotify for Artists at least 7 days before release. Even if editors pass, Spotify adds the pitched song to your followers’ Release Radar. The full rules are in [how to get on Spotify playlists](/learn/how-to-get-on-spotify-playlists).' },
          { title: 'Add a Canvas', body: 'Canvas is a 3 to 8 second vertical loop that replaces your artwork in the Now Playing view on mobile. Spotify lets you add it to unreleased tracks too, so it is ready on release day.' },
          { title: 'Set up a Countdown Page if you qualify', body: 'For a new album or EP (not a single), artists with at least 3,000 monthly active listeners can create a Countdown Page. Fans can pre-save from your profile, and on release day Spotify notifies everyone who pre-saved and adds it to their library.' },
          { title: 'Line up your independent playlist list', body: 'Find playlists whose current songs sit naturally next to yours and note how each accepts submissions. Curators that take unreleased music can hear it now, including the playlists on our [free submission page](/free-spotify-playlist-submission).' },
        ],
      },
      {
        heading: 'Release week: point everything at Spotify',
        paragraphs: [
          'Release week is about turning attention into followers, because followers are who Spotify delivers your next releases to through Release Radar.',
        ],
        steps: [
          { title: 'Pin the release as your Artist Pick', body: 'Artist Pick sits at the top of your profile and stays live for 180 days unless you change it. Pin the new song or release so every profile visit lands on it.' },
          { title: 'Share it in a format people stop for', body: 'Use a Promo Card or your own artwork with your Spotify link, and Spotify Codes on anything physical. Spotify’s own advice is that sharing helps turn listeners into followers.' },
          { title: 'Ask for the follow, not just the stream', body: 'A follow means your next release reaches that person through Release Radar. Say so plainly when you share.' },
          { title: 'Submit to independent playlists', body: 'Send the song to the playlists on your list through their own channels. Submitting to our network is free, and every playlist it fits gets a human decision.' },
        ],
        callout: { kind: 'submit' },
      },
      {
        heading: 'After release: measure, then plan the next one',
        paragraphs: [
          'In Spotify for Artists, Music then Playlists shows which playlists sent you listeners over the last 12 months. Use it to see which independent playlists actually moved the song, and thank those curators.',
          'Then start the cycle again. Pitching only works for unreleased songs, so the best free promotion for this release is often getting the next one pitched on time.',
        ],
      },
      {
        heading: '“Free” offers to be careful with',
        paragraphs: [
          'Some offers use the word free to get you in the door. These are the patterns we warn artists about. Our guide to [getting on Spotify playlists](/learn/how-to-get-on-spotify-playlists) has a fuller red-flag table.',
        ],
        bullets: [
          'A free trial of streams or followers, with a paid package afterwards. Spotify’s terms prohibit artificial streams whether they were free or paid.',
          'Free placement in exchange for a follow-for-follow or stream-for-stream swap. These do not build real listeners.',
          'Requests for your Spotify for Artists or distributor login to “set up” promotion. Never share account access.',
          'Free submission that turns into a fee to be considered. Read the terms before you send anything.',
        ],
      },
      {
        heading: 'A zero-budget routine you can repeat',
        paragraphs: [
          'Promotion compounds when it is a habit rather than a launch event. A simple routine that costs nothing:',
        ],
        bullets: [
          'Every release: pitch one song on time, set a Canvas, update your Artist Pick.',
          'Every release: submit to independent playlists that genuinely fit, through their own channels.',
          'Every week: share something real about the music (a clip, the story, a live take) with your Spotify link, and ask for the follow.',
          'Every month: check the Playlists view in Spotify for Artists and keep a short list of curators who have supported you.',
        ],
      },
    ],
    faq: [
      { question: 'Does free Spotify promotion actually work?', answer: 'It can, but nothing honest comes with a number attached. The free tools help the fans and followers you already have hear the release, and free playlist submission gets your song in front of curators who actually listen.' },
      { question: 'Should I pay for Spotify promotion?', answer: 'Spotify’s own paid tools, such as Marquee, Showcase and Ads Manager, are legitimate. Third-party services that sell guaranteed streams or playlist placements are not, according to Spotify.' },
      { question: 'Is Canvas free?', answer: 'Canvas is added in Spotify for Artists by the first main artist (Admin or Editor). Spotify’s help article does not list a fee.' },
      { question: 'Can I use Countdown Pages for a single?', answer: 'No. Countdown Pages are for new, original albums and EPs, and the artist needs at least 3,000 monthly active listeners.' },
      { question: 'Is submitting to playlists free?', answer: 'Many independent curators accept free submissions, including every playlist in the BVSS FVM and CuratorOS network. Free submission means a free review, not guaranteed placement.' },
    ],
    related: [
      { href: '/free-spotify-playlist-submission', label: 'Free Spotify playlist submission', detail: 'Every open playlist in our network, with filters and a free submit button.' },
      { href: '/learn/how-to-get-on-spotify-playlists', label: 'How to get on Spotify playlists', detail: 'Editorial pitching, algorithmic playlists and independent curators.' },
      { href: '/learn/how-we-review-playlist-submissions', label: 'How we review submissions', detail: 'What our curators listen for.' },
      { href: '/learn/best-free-music-promotion-sites', label: 'Free music promotion sites', detail: 'What is actually free on each service, checked against their own pages.' },
      { href: '/learn/spotify-promotion-scams', label: 'Spotify promotion scams', detail: 'How the common schemes work and what to do if a suspicious playlist adds you.' },
    ],
    sources: [
      { label: 'Promoting music on Spotify', publisher: 'Spotify for Artists Support', href: 'https://support.spotify.com/by-en/artists/article/promoting-music-on-spotify/', accessed: '2026-10-07' },
      { label: 'Pitching music and videos to Spotify playlist editors', publisher: 'Spotify for Artists Support', href: 'https://support.spotify.com/us/artists/article/pitching-music-and-videos-to-playlist-editors/', accessed: '2026-10-07' },
      { label: 'Adding a Canvas to Spotify', publisher: 'Spotify for Artists Support', href: 'https://support.spotify.com/us/artists/article/adding-a-canvas/', accessed: '2026-10-07' },
      { label: 'Getting started with Countdown Pages on Spotify', publisher: 'Spotify for Artists Support', href: 'https://support.spotify.com/us/artists/article/getting-started-with-countdown-pages-on-spotify/', accessed: '2026-10-07' },
      { label: 'Managing your Artist Pick', publisher: 'Spotify for Artists Support', href: 'https://support.spotify.com/us/artists/article/managing-your-artist-pick/', accessed: '2026-10-07' },
      { label: 'Sharing your music', publisher: 'Spotify for Artists Support', href: 'https://support.spotify.com/cm-en/artists/article/sharing-your-music/', accessed: '2026-10-07' },
      { label: 'Seeing playlists you’re added to', publisher: 'Spotify for Artists Support', href: 'https://support.spotify.com/us/artists/article/seeing-playlists-your-music-is-on/', accessed: '2026-10-07' },
      { label: 'Artificial streaming and paid 3rd-party services that guarantee streams', publisher: 'Spotify for Artists Support', href: 'https://support.spotify.com/us/artists/article/third-party-services-that-guarantee-streams/', accessed: '2026-10-07' },
    ],
  },
  {
    slug: 'spotify-promotion-scams',
    topic: 'Spotify Promotion',
    published: '2026-10-07',
    updated: '2026-10-07',
    seoTitle: 'Spotify Promotion Scams: Fake Streams & Suspicious Playlists',
    title: 'Spotify Promotion Scams: Fake Streams & Suspicious Playlists',
    description: 'How Spotify promotion scams work, what Spotify actually prohibits, how to check an offer before you pay, and what to do if a suspicious playlist adds your song.',
    eyebrow: 'Spotify promotion · Artist safety',
    lead: 'Most Spotify promotion scams sell one of two things: streams or playlist placements. Spotify’s position on both is the same. In its own words, it “strictly prohibits using any third party service that promises streams or playlist placement in exchange for money.” Here is how the common schemes work, how to check an offer, and what to do if your music ends up somewhere it should not be.',
    sections: [
      {
        heading: 'What Spotify actually prohibits',
        paragraphs: [
          'Spotify defines an artificial stream as one that “doesn’t reflect genuine user listening intent,” including any attempt to manipulate streaming with automated processes such as bots or scripts. It says paid third-party services that guarantee streams are not legitimate, and that services promising guaranteed playlist placement in exchange for money break its terms.',
          'Spotify lists what can happen when it confirms artificial streaming:',
        ],
        bullets: [
          'Royalties tied to confirmed artificial streams can be withheld, and public stream counts corrected.',
          'The song may be removed from Spotify playlists.',
          'Distributors receive reports and may warn artists or, in serious or repeated cases, remove content or suspend accounts.',
          'In repeated or egregious cases, Spotify can remove the manipulated content.',
          'Labels and distributors can be charged a per-track fee when flagrant artificial streaming is detected.',
        ],
      },
      {
        heading: 'The scams we see most often',
        paragraphs: [
          'These patterns line up with Spotify’s published guidance. A single offer often mixes several.',
        ],
        table: {
          caption: 'Common patterns and why they are a problem',
          columns: ['Pattern', 'What it looks like', 'Why it is a problem'],
          rows: [
            ['Stream packages', 'A price per thousand streams, or a promised number of plays', 'Spotify says services that sell streams are not legitimate and can get your music removed.'],
            ['Paid playlist placement', 'A fee in exchange for a promised add to a playlist', 'Spotify says selling placement for money breaks its terms.'],
            ['Paying to be “considered”', 'A fee for review with vague terms about what happens next', 'Spotify says to treat services that charge to be considered with high skepticism. Know exactly what you are paying for.'],
            ['Fake editorial pitching', 'Someone offers to pitch you to Spotify’s editors for a fee', 'Pitching is free inside Spotify for Artists and is done by people with access to your profile. Nobody can sell you an editorial spot.'],
            ['Account access requests', 'A service asks for your Spotify for Artists or distributor login to “set things up”', 'No legitimate curator or promoter needs your login. Never share it.'],
            ['Fake Spotify emails', 'Messages claiming to be Spotify asking for passwords, payment or downloads', 'Spotify says it never asks for your password or payment details by email, and real emails come from an address ending in @spotify.com.'],
            ['Follower surges', 'Cheap follower packages or follow-for-follow schemes', 'Spotify lists short-lived surges in follower growth as a warning sign of artificial activity.'],
          ],
        },
      },
      {
        heading: 'How to check an offer before you pay anything',
        paragraphs: [
          'Legitimate promotion can explain how real people will hear your music. Use these questions on any service, including us.',
        ],
        steps: [
          { title: 'Ask what exactly you are paying for', body: 'Review time, advertising, PR outreach or a result? If the answer is a number of streams, followers or adds, walk away.' },
          { title: 'Ask how listeners will find the song', body: 'A real answer names a channel: a playlist with an audience that fits, an ad campaign, press, social content. “Our network” with no detail is not an answer.' },
          { title: 'Look at the playlists themselves', body: 'Open them on Spotify. Do the songs belong together? Is it clear who runs them? Is it updated? A playlist built for numbers rarely has a coherent sound.' },
          { title: 'Keep your accounts to yourself', body: 'Share links, never logins. Pitching to Spotify’s editors is something you or your team does inside Spotify for Artists.' },
          { title: 'Check the reviews and the method', body: 'Spotify’s advice for hiring a PR or marketing firm is to ask about its promotion methods directly and read reviews from artists who have worked with it.' },
        ],
        callout: {
          kind: 'submit',
          title: 'A free alternative to pay-to-be-considered',
          body: 'Submitting to the BVSS FVM and CuratorOS playlists costs nothing. A curator listens and decides for each playlist your song fits, and nothing about that decision is for sale. See every open playlist on our [free submission page](/free-spotify-playlist-submission).',
        },
      },
      {
        heading: 'Warning signs in your own data',
        paragraphs: [
          'Spotify lists these signals in Spotify for Artists as possible signs of artificial streaming. None of them proves anything on its own. A real playlist placement or a moment on social media can also cause a spike, so look at them together and in context.',
        ],
        bullets: [
          'A sudden spike in streams for no apparent reason, followed by a drop-off.',
          'Streams from places where your music has not been active before.',
          'Most streams coming from sources you cannot explain, such as “Other.”',
          'Short-lived surges in follower growth.',
        ],
      },
      {
        heading: 'If your song lands on a suspicious playlist',
        paragraphs: [
          'Spotify notes that some services use bots on music without the artist’s consent, so this can happen even if you never paid anyone. Act quickly and keep a record.',
        ],
        steps: [
          { title: 'Find the playlist', body: 'In Spotify for Artists, go to Music then Playlists to see which playlists your music is on. A playlist appears once at least 3 of your listeners have played your music there.' },
          { title: 'Report it to Spotify', body: 'Use the [playlist reporter form](https://artists.spotify.com/c/playlist-reporter) in Spotify for Artists. Spotify says it investigates before taking action.' },
          { title: 'Tell your distributor or label', body: 'Spotify’s advice is to share the unusual data with your distributor or label right away, because they can work with Spotify to resolve it.' },
          { title: 'Keep notes', body: 'Screenshots of the playlist and your stats, dates, and any messages with whoever added you. If you did not ask for the placement, a clear record helps.' },
        ],
        callout: {
          kind: 'warning',
          title: 'Got a “Spotify” email asking for your password?',
          body: 'Do not click anything. Spotify says real emails come from an address ending in @spotify.com and that it never asks for passwords or payment details by email. Forward suspicious messages to spoof@spotify.com and delete them.',
        },
      },
      {
        heading: 'What legitimate paid promotion looks like',
        paragraphs: [
          'Paying for promotion is not the problem; paying for a result that only manipulation can deliver is. Spotify’s own paid tools, including Marquee and Showcase display campaigns and Spotify Ads Manager, are legitimate ways to reach listeners. PR and marketing firms can be too, if their methods hold up to the questions above.',
          'If you would rather not spend anything, there is a full free plan in [free Spotify promotion](/learn/free-spotify-promotion), and the honest routes onto playlists are in [how to get on Spotify playlists](/learn/how-to-get-on-spotify-playlists).',
        ],
      },
    ],
    faq: [
      { question: 'Will Spotify penalize me if someone else used bots on my song?', answer: 'Spotify says some services stream music without the artist’s consent. Its advice is to report the playlist and share the data with your distributor or label quickly so they can work with Spotify on it.' },
      { question: 'Are paid playlist submission sites scams?', answer: 'Not necessarily, but Spotify says to treat services that charge to be considered for playlists with high skepticism. Make sure you know whether you are paying for review time or being sold a result.' },
      { question: 'Does Spotify catch every fake stream?', answer: 'Spotify does not publish how it detects artificial streaming, so nobody outside Spotify can tell you what will or will not be caught. The safe assumption is that buying streams puts your music at risk.' },
      { question: 'How do I report a fake Spotify email?', answer: 'Forward it to spoof@spotify.com and delete it. If you clicked a link or entered details, reset your password and update it anywhere you reused it.' },
      { question: 'Is submitting to BVSS FVM a paid service?', answer: 'No. Submission to every BVSS FVM and CuratorOS playlist is free, and placement is never sold.' },
    ],
    related: [
      { href: '/free-spotify-playlist-submission', label: 'Free Spotify playlist submission', detail: 'Submit free to human-curated playlists. Placement is never sold.' },
      { href: '/learn/how-to-get-on-spotify-playlists', label: 'How to get on Spotify playlists', detail: 'The legitimate routes: editors, algorithms and independent curators.' },
      { href: '/learn/free-spotify-promotion', label: 'Free Spotify promotion', detail: 'A release-by-release plan with Spotify’s free tools.' },
    ],
    sources: [
      { label: 'Artificial streaming', publisher: 'Spotify for Artists', href: 'https://artists.spotify.com/artificial-streaming', accessed: '2026-10-07' },
      { label: 'Artificial streaming and paid 3rd-party services that guarantee streams', publisher: 'Spotify for Artists Support', href: 'https://support.spotify.com/us/artists/article/third-party-services-that-guarantee-streams/', accessed: '2026-10-07' },
      { label: 'Is this Spotify email legit?', publisher: 'Spotify Support', href: 'https://support.spotify.com/us/article/spotify-email-legit/', accessed: '2026-10-07' },
      { label: 'Pitching music and videos to Spotify playlist editors', publisher: 'Spotify for Artists Support', href: 'https://support.spotify.com/us/artists/article/pitching-music-and-videos-to-playlist-editors/', accessed: '2026-10-07' },
      { label: 'Seeing playlists you’re added to', publisher: 'Spotify for Artists Support', href: 'https://support.spotify.com/us/artists/article/seeing-playlists-your-music-is-on/', accessed: '2026-10-07' },
      { label: 'Promoting music on Spotify', publisher: 'Spotify for Artists Support', href: 'https://support.spotify.com/by-en/artists/article/promoting-music-on-spotify/', accessed: '2026-10-07' },
    ],
  },
  {
    slug: 'find-spotify-playlist-curators',
    topic: 'Playlist Promotion',
    published: '2026-10-07',
    updated: '2026-10-07',
    seoTitle: 'How to Find Spotify Playlist Curators (and Check the Fit)',
    title: 'How to Find Spotify Playlist Curators and Check Fit',
    description: 'Find Spotify playlists that genuinely fit your song, check they are real and active, and reach curators through the channels they publish. No scraping.',
    eyebrow: 'Playlist promotion · Curator discovery',
    lead: 'Finding playlist curators is easy. Finding the right ones, and reaching them the way they have asked to be reached, is the actual work. This guide covers both, with one rule throughout: use the submission routes and contacts curators publish for that purpose, and nothing else.',
    sections: [
      {
        heading: 'Start from the song, not from a list',
        paragraphs: [
          'Before you search, write down three things about the track: the genre a listener would hear (not the one you hope to be filed under), two or three moods that really describe it, and a few artists whose music genuinely overlaps with yours. These become your search terms and your fit test. A long list of big playlists in the wrong lane is worth less than a handful that fit.',
        ],
      },
      {
        heading: 'Where to find playlists that fit',
        paragraphs: [],
        steps: [
          { title: 'Search Spotify the way a listener would', body: 'Spotify’s own guidance is that listener-made playlists are found by searching keywords. Search for your sound and mood (“melancholic indie pop”, “late night drive electronic”), not just the genre name, and open the playlists that come up.' },
          { title: 'Use the artists you sound like', body: 'Spotify notes you can view playlists on artist profiles. Look at the profiles of artists your music overlaps with, and at their Fans Also Like section, which Spotify builds from fans’ listening habits, to widen the circle of comparable artists.' },
          { title: 'Use networks and directories that list open submissions', body: 'Some curator networks publish which playlists are open and how to submit. Our [free submission page](/free-spotify-playlist-submission) does this for every BVSS FVM and CuratorOS playlist, with genre, mood and moment filters and the artists each playlist sounds like.' },
          { title: 'Watch where curators announce open submissions', body: 'Some curators post calls for submissions on their websites, newsletters or community forums. Follow the rules of each space and respond where you are invited to.' },
        ],
      },
      {
        heading: 'Check the fit before you contact anyone',
        paragraphs: [
          'Open each playlist and listen for a few minutes. The question is whether your song would sit naturally in that sequence for that listener.',
        ],
        table: {
          caption: 'A quick fit check',
          columns: ['Check', 'Good sign', 'Move on if'],
          rows: [
            ['Sound', 'Songs share a clear sound or mood that matches yours', 'Tracks have nothing in common'],
            ['Activity', 'Recently updated, with newer releases mixed in', 'Nothing has changed in a long time'],
            ['Curator', 'You can tell who runs it and what they care about', 'There is no way to tell who is behind it'],
            ['Submissions', 'A published way to submit, and it fits your release stage', 'It says it does not accept submissions'],
            ['Signals', 'Nothing about it promises results', 'It sells placement or streams: see [promotion scams](/learn/spotify-promotion-scams)'],
          ],
        },
      },
      {
        heading: 'Reach curators ethically, through their own channels',
        paragraphs: [
          'Some guides suggest piecing together a curator’s personal accounts, guessing email addresses or buying contact lists. Do not. It treats someone’s private information as yours to use, it annoys the people you want to win over, and it rarely works. Curators who want submissions tell you how to send them.',
        ],
        table: {
          caption: 'Ethical outreach',
          columns: ['Do', 'Do not'],
          rows: [
            ['Use a submission link or form in the playlist description or on the curator’s website', 'Scrape, guess or buy email addresses'],
            ['Use a business contact the curator published for submissions', 'Message someone’s personal profiles across several platforms'],
            ['Submit through a platform where the curator lists their playlist', 'Send the same mass email to everyone'],
            ['Follow each curator’s instructions on format and timing', 'Follow up repeatedly or push after a no'],
          ],
        },
        callout: {
          kind: 'note',
          title: 'No published channel?',
          body: 'Then the curator is not asking for submissions right now. Move on to a playlist that is.',
        },
      },
      {
        heading: 'Keep a simple tracker',
        paragraphs: [
          'A spreadsheet is enough: playlist name and link, how it accepts submissions, the date you submitted, the outcome, and a note on fit. It stops you sending the same song twice and shows you, release after release, which curators are a genuine match for your sound.',
        ],
      },
      {
        heading: 'Using a curator network',
        paragraphs: [
          'Networks save time because the fit information is in one place and one submission can reach several playlists. Check who curates them and whether anything about the decision is for sale.',
          'In our case: BVSS FVM playlists are programmed by BVSS FVM, and CuratorOS playlists by the in-house CuratorOS team, which operates alongside us. They are not independent third-party curators and none of them are Spotify editorial playlists. Submission is free, and each playlist your song fits gets a human decision.',
        ],
        callout: { kind: 'submit' },
      },
    ],
    faq: [
      { question: 'How do I find a playlist curator’s email?', answer: 'Only use contact details the curator published for submissions, such as a link in the playlist description or on their website. If there is no published channel, they are not taking submissions right now.' },
      { question: 'Is it OK to message curators on social media?', answer: 'Only where they invite submissions there. Sending unsolicited messages to someone’s personal accounts usually works against you.' },
      { question: 'Are curator directories worth using?', answer: 'They can save time. Check who runs the playlists, whether you are paying for review or being sold a result, and whether the playlists actually fit your song.' },
      { question: 'How many curators should I contact per release?', answer: 'As many as genuinely fit, and no more. A short list of strong matches gets better results and better relationships than a mass send.' },
      { question: 'How can I tell if a playlist is real?', answer: 'Look for a coherent sound, recent updates and an identifiable curator, and avoid anything that sells streams or placement. Our [scams guide](/learn/spotify-promotion-scams) covers Spotify’s own warning signs.' },
    ],
    related: [
      { href: '/free-spotify-playlist-submission', label: 'Free Spotify playlist submission', detail: 'Every open playlist in our network, with fit filters and free submission.' },
      { href: '/learn/how-to-get-on-spotify-playlists', label: 'How to get on Spotify playlists', detail: 'Editorial, algorithmic and independent routes.' },
      { href: '/learn/how-to-pitch-playlist-curators', label: 'How to pitch playlist curators', detail: 'Templates, a worked example and why curators pass.' },
      { href: '/learn/spotify-promotion-scams', label: 'Spotify promotion scams', detail: 'Red flags to check before you submit or pay.' },
      { href: '/playlists/collections', label: 'Playlist collections', detail: 'Browse playlists by genre, mood and moment.' },
    ],
    sources: [
      { label: 'Find playlists on Spotify', publisher: 'Spotify Support', href: 'https://support.spotify.com/us/article/find-playlists/', accessed: '2026-10-07' },
      { label: 'Fans Also Like', publisher: 'Spotify for Artists Support', href: 'https://support.spotify.com/us/artists/article/fans-also-like/', accessed: '2026-10-07' },
      { label: 'Types of Spotify playlists', publisher: 'Spotify for Artists Support', href: 'https://support.spotify.com/us/artists/article/types-of-spotify-playlists/', accessed: '2026-10-07' },
      { label: 'Artificial streaming', publisher: 'Spotify for Artists', href: 'https://artists.spotify.com/artificial-streaming', accessed: '2026-10-07' },
    ],
  },
  {
    slug: 'how-to-pitch-playlist-curators',
    topic: 'Playlist Promotion',
    published: '2026-10-07',
    updated: '2026-10-07',
    seoTitle: 'How to Pitch Playlist Curators: Examples & Templates',
    title: 'How to Pitch Playlist Curators: Examples & Templates',
    description: 'What curators need from a playlist pitch, ready-to-use templates, a worked example, and the real reasons curators pass, from the curator side of the inbox.',
    eyebrow: 'Playlist promotion · Curator’s view',
    lead: 'This guide is written from the curator side of the inbox at BVSS FVM. The pitches that work are short, accurate and easy to act on: they help the curator hear the song in the right context, then get out of the way. Here is what a curator actually needs from you, templates you can adapt, and the reasons we pass, so you can pitch like someone curators want to hear from.',
    sections: [
      {
        heading: 'What a curator does with your pitch',
        paragraphs: [
          'The song decides. The pitch decides whether the song gets heard in the right lane, by the right curator, with the right expectations. On our side, a submission is routed to the playlists it might fit, and a curator listens and makes a separate decision for each one: accept, hold for later, or decline. When we decline, our system requires the curator to pick at least one reason from a fixed list (below).',
          'So the job of a pitch is simple: describe the song accurately enough that it reaches the playlist where it has the best chance, and give the curator one reason to press play now.',
        ],
      },
      {
        heading: 'What to include, and why',
        paragraphs: [],
        table: {
          caption: 'The parts of a good pitch',
          columns: ['Include', 'Why it matters', 'Example (fictional artist)'],
          rows: [
            ['A working link', 'The song is the pitch. A released Spotify link, or a private listening link if it is unreleased.', 'Spotify link to “Paper Lanterns” by Lowtide Avenue'],
            ['The genre a listener hears', 'Routes the song to the right lane. Honest beats ambitious.', 'Indie pop'],
            ['Two or three moods', 'Tells us where it sits in a sequence.', 'Wistful, warm, late-summer'],
            ['Artists it genuinely sounds like', 'Gives us a reference point in seconds. Pick overlap, not fame.', 'Sounds like: soft-focus guitar pop with close harmonies'],
            ['Release status and date', 'We plan around it.', 'Out Friday, October 16'],
            ['One line on why this playlist', 'Shows you listened to it.', '“Fits the slower end of your Sunday Morning lane.”'],
          ],
        },
        callout: {
          kind: 'note',
          title: 'What to leave out',
          body: 'Long biographies, press-release language, stream counts as a selling point, attachments the curator did not ask for, and any request for a guaranteed add. None of it helps the song.',
        },
      },
      {
        heading: 'Template: email to a curator’s published address',
        paragraphs: [
          'Use this only for a contact the curator published for submissions. Keep it to a few lines; the link does the rest.',
        ],
        bullets: [
          'Subject: Submission for [Playlist name]: “[Song title]” by [Artist]',
          'Hi [Curator name, if published],',
          '“[Song title]” is a [genre] track with a [mood] feel, out [release date]. I think it fits the [specific part] of [Playlist name].',
          'Sounds like: [two or three comparable artists]. Listen: [Spotify link or private link].',
          'Thanks for listening either way. [Your name], [one link to your profile]',
        ],
      },
      {
        heading: 'Template: the note field on a submission form',
        paragraphs: [
          'Forms already ask for the link, genre and moods, so the note is for what the fields cannot say. Ours is labeled “Note for curators.” Two or three sentences is plenty.',
        ],
        bullets: [
          '“[Song title]” is about [one-line story]. It sits between [comparable artist] and [comparable artist], and I think it suits [playlist or lane] because [one specific reason].',
          'Unreleased: out [date]. Happy to share the final master if anything changes.',
        ],
      },
      {
        heading: 'A worked example',
        paragraphs: [
          'Lowtide Avenue is a fictional artist used for illustration. Here is a pitch that does its job:',
          '“Paper Lanterns” is a wistful indie pop song with close harmonies and a slow-burn chorus, out Friday. I think it fits the gentler half of your Sunday Morning playlist, next to the acoustic-leaning tracks you added recently. Sounds like soft-focus guitar pop. Listen: [link]. Thanks for listening either way.',
          'It works because it is accurate, specific to that playlist, and takes under ten seconds to read.',
        ],
      },
      {
        heading: 'Why curators pass (the reasons we use)',
        paragraphs: [
          'These are the decline reasons our curators choose from when they pass on a submission. Most are about fit, not quality, which is why the same song can be declined by one playlist and accepted by another.',
        ],
        table: {
          caption: 'Decline reasons in the BVSS FVM and CuratorOS review tool',
          columns: ['Reason', 'What it usually means', 'What you can do'],
          rows: [
            ['Energy mismatch', 'The song is noticeably calmer or more intense than the playlist', 'Target playlists whose energy matches the track'],
            ['Not my genre lane', 'It is outside what the playlist covers', 'Re-check the genre a listener would hear'],
            ['Wrong mood', 'Right genre, different feeling', 'Choose moods more carefully when pitching'],
            ['Too similar to recent adds', 'The playlist already has that sound right now', 'Try another playlist, or this one later with a new release'],
            ['Vocal style', 'The vocal approach does not suit the sequence', 'Look for playlists built around a similar vocal style'],
            ['Production not ready', 'The idea is there; the recording is not yet', 'Revisit the production before the next pitch'],
            ['Mix / master', 'Balance or loudness stands out against the playlist', 'Compare against tracks on the playlist; consider a mix revision'],
            ['Other', 'Anything not covered above', 'Treat it as a fit decision for that playlist'],
          ],
        },
      },
      {
        heading: 'Mistakes that get pitches skipped',
        paragraphs: [],
        bullets: [
          'Pitching a playlist you have not listened to.',
          'Calling the song a genre it is not, to reach a bigger playlist.',
          'Sending the same message to every curator at once.',
          'Following up more than once, or arguing with a decision.',
          'Leading with numbers instead of the music.',
          'Asking a curator to promise a placement, or offering to pay for one. Spotify says selling placement breaks its terms; see [promotion scams](/learn/spotify-promotion-scams).',
        ],
      },
      {
        heading: 'Timing and follow-up',
        paragraphs: [
          'Independent curators can often hear unreleased music, and many accept released songs. Spotify’s editors only take unreleased songs pitched at least 7 days before release, and that is a separate pitch you make yourself in Spotify for Artists. The full routes are in [how to get on Spotify playlists](/learn/how-to-get-on-spotify-playlists).',
          'If there is no reply, one polite follow-up after a reasonable wait is fine. After a decline, thank the curator and pitch them your next release instead of the same song.',
        ],
        callout: {
          kind: 'submit',
          title: 'Practice on a pitch that gets heard',
          body: 'Our form asks for exactly the details above, and every playlist your song fits gets a human decision. Find the right lane first on our [free submission page](/free-spotify-playlist-submission).',
        },
      },
    ],
    faq: [
      { question: 'How long should a playlist pitch be?', answer: 'A few lines. Link, genre, a couple of moods, comparable artists, release date and one sentence on why that playlist. Curators decide by listening.' },
      { question: 'Should I mention my streams or followers?', answer: 'Only if it adds context, and never as the main argument. Curators are judging whether the song fits their playlist.' },
      { question: 'Should I follow up if a curator does not reply?', answer: 'Once, politely, after a reasonable wait. Then move on and pitch them your next release.' },
      { question: 'Can I pitch the same song to the same curator again?', answer: 'Generally no. A decline is usually about fit with that playlist at that moment. A new release is a better reason to get back in touch.' },
      { question: 'Should I pay to pitch curators?', answer: 'Spotify says to be highly skeptical of services that charge to be considered, and that selling placement breaks its terms. Submission to our playlists is free.' },
    ],
    related: [
      { href: '/learn/find-spotify-playlist-curators', label: 'Find Spotify playlist curators', detail: 'Find playlists that fit before you pitch.' },
      { href: '/free-spotify-playlist-submission', label: 'Free Spotify playlist submission', detail: 'Submit free to human-curated playlists.' },
      { href: '/learn/how-we-review-playlist-submissions', label: 'How we review submissions', detail: 'What our curators listen for.' },
      { href: '/learn/spotify-promotion-scams', label: 'Spotify promotion scams', detail: 'Red flags before you pay anyone.' },
    ],
    sources: [
      { label: 'Pitching music and videos to Spotify playlist editors', publisher: 'Spotify for Artists Support', href: 'https://support.spotify.com/us/artists/article/pitching-music-and-videos-to-playlist-editors/', accessed: '2026-10-07' },
      { label: 'Artificial streaming', publisher: 'Spotify for Artists', href: 'https://artists.spotify.com/artificial-streaming', accessed: '2026-10-07' },
      { label: 'Artificial streaming and paid 3rd-party services that guarantee streams', publisher: 'Spotify for Artists Support', href: 'https://support.spotify.com/us/artists/article/third-party-services-that-guarantee-streams/', accessed: '2026-10-07' },
    ],
  },
  {
    slug: 'best-free-music-promotion-sites',
    topic: 'Free Music Promotion',
    published: '2026-10-07',
    updated: '2026-10-07',
    seoTitle: 'Best Free Music Promotion Sites in 2026: What Is Actually Free?',
    title: 'Free Music Promotion Sites in 2026: What Is Actually Free?',
    description: 'What is actually free on Spotify for Artists, SubmitHub, DailyPlaylists, PitchPlaylists, Soundplate and BVSS FVM, checked against each service’s own pages.',
    eyebrow: 'Free music promotion · Checked against official pages',
    lead: '“Free” means very different things across music promotion sites: free to submit, free to be heard, or free for a few tries before you pay. We checked what each service says about itself on its own pages and laid it out side by side. We have not ranked them, and one of them is ours.',
    sections: [
      {
        heading: 'How we put this together',
        paragraphs: [
          'Every claim below comes from the service’s own website or help center, checked on October 7, 2026, and linked in the sources. We have not run paid campaigns on these platforms to compare them, so there are no ratings, success rates or “best overall” picks. Terms change; check the linked page before you rely on any detail.',
          'Disclosure: BVSS FVM and CuratorOS are our own playlist network. They are listed because they fit the topic, and they are labeled as ours.',
        ],
      },
      {
        heading: 'What is free, service by service',
        paragraphs: [],
        table: {
          caption: 'What each service says is free and what costs money (checked October 7, 2026)',
          columns: ['Service', 'What is free', 'What costs money', 'Who decides'],
          rows: [
            ['Spotify for Artists', 'Pitching one unreleased song to Spotify’s editors (at least 7 days before release); Release Radar for your followers; Canvas, Artist Pick and Promo Cards', 'Display campaigns (Marquee, Showcase) and Spotify Ads Manager', 'Spotify’s editors. Spotify says pitching does not guarantee placement.'],
            ['BVSS FVM + CuratorOS (our network)', 'Submission and human review for every playlist in the network', 'Nothing: there is no paid tier and placement is never sold', 'BVSS FVM and the in-house CuratorOS team, separately for each playlist'],
            ['SubmitHub', 'Two standard credits every four hours. Curators may respond to standard submissions but are not required to. Premium credits can be earned through its Hot or Not feature (one per 20 ratings).', 'Premium credits, from $1 each and as low as $0.78 in bulk, according to its help center. For premium submissions, curators must respond within 72 hours, listen for at least 60 seconds, and either approve or explain in at least 20 words.', 'Individual playlisters, bloggers and influencers'],
            ['DailyPlaylists', 'A Standard tier for submitting to playlist owners who want submissions', 'Premium Credits for selected curators, and a Professional tier with more weekly submissions and tools (prices on its pricing page)', 'Individual playlist owners'],
            ['PitchPlaylists', 'Its own guide (last updated July 2025) describes the service as completely free and says playlist spots are not for sale', 'None described in that guide. Check the site for current terms.', 'Curators; an approved track is added to their playlist'],
            ['Soundplate', 'Submission to the playlists listed on its submission page, which it describes as free', 'The site also sells other marketing services, such as ad campaigns', 'Listed curators. The page does not say who runs its “Official Soundplate Playlists.”'],
          ],
        },
      },
      {
        heading: 'Paid, for comparison: Groover',
        paragraphs: [
          'Groover is often listed alongside these services, but it is not free. Its help center says sending a track to one curator or industry professional costs 2 Grooviz (each priced at €1, taxes included), and top curators cost 4. If a contact does not respond within 7 days, Groover returns the Grooviz for that contact to use again.',
          'Paying for review time is not the same as buying placement, but Spotify says to treat services that charge to be considered with high skepticism. Know which one you are paying for. Our [scams guide](/learn/spotify-promotion-scams) explains the difference.',
        ],
      },
      {
        heading: 'How to judge any “free” promotion offer',
        paragraphs: [],
        steps: [
          { title: 'Free to submit, or free to be heard?', body: 'Some free routes put no obligation on the curator to listen or reply. That can still be worth it, but set your expectations accordingly.' },
          { title: 'Who decides, and do they disclose it?', body: 'Look for who runs the playlists and whether the platform owns any of them. Own-network playlists are fine when they are labeled as such.' },
          { title: 'What is for sale?', body: 'Review time, advertising and tools are legitimate things to sell. Streams and placements are not, according to Spotify.' },
          { title: 'Does it fit your song?', body: 'A free submission to the wrong playlist costs you nothing but time, and costs the curator time too. Fit beats volume; see [how to find curators](/learn/find-spotify-playlist-curators).' },
          { title: 'Can you measure it?', body: 'Check the Playlists view in Spotify for Artists to see which placements actually sent you listeners.' },
        ],
      },
      {
        heading: 'Getting the most from free routes',
        paragraphs: [
          'Free routes work best when the pitch is accurate and the song is in the right lane. Use [how to pitch playlist curators](/learn/how-to-pitch-playlist-curators) for templates, and the [free Spotify promotion plan](/learn/free-spotify-promotion) for the Spotify tools that cost nothing.',
        ],
        callout: {
          kind: 'submit',
          title: 'Our network, free to submit',
          body: 'Every BVSS FVM and CuratorOS playlist open to submissions is listed on our [free submission page](/free-spotify-playlist-submission), with genre, mood and moment filters. Submit once; each playlist that fits gets a human decision.',
        },
      },
    ],
    faq: [
      { question: 'Which free music promotion site is the best?', answer: 'We do not rank them. They do different things: Spotify’s editorial pitch is the only route to editorial playlists, while the others connect you with independent curators. Use the table to match a service to your goal.' },
      { question: 'Are free submission sites worth it if curators do not have to reply?', answer: 'They can be, as long as you expect some silence. Accurate genre and mood details, and choosing playlists that really fit, improve your chances more than volume does.' },
      { question: 'Is SubmitHub free?', answer: 'Partly. According to its help center you get two standard credits every four hours, and curators are not required to respond to those. Premium credits cost money (or can be earned) and come with response requirements.' },
      { question: 'Is BVSS FVM really free?', answer: 'Yes. Submission and review are free for every playlist in the BVSS FVM and CuratorOS network, there is no paid tier, and placement is never sold.' },
      { question: 'Why is Groover not on the free list?', answer: 'Its own help center says it is a paid service: each curator contact costs Grooviz. It is included for comparison only.' },
    ],
    related: [
      { href: '/free-spotify-playlist-submission', label: 'Free Spotify playlist submission', detail: 'Every open playlist in our network, free to submit.' },
      { href: '/learn/free-spotify-promotion', label: 'Free Spotify promotion', detail: 'Spotify’s free artist tools, release by release.' },
      { href: '/learn/spotify-promotion-scams', label: 'Spotify promotion scams', detail: 'What not to pay for.' },
      { href: '/learn/how-to-pitch-playlist-curators', label: 'How to pitch playlist curators', detail: 'Templates and why curators pass.' },
    ],
    sources: [
      { label: 'Pitching music and videos to Spotify playlist editors', publisher: 'Spotify for Artists Support', href: 'https://support.spotify.com/us/artists/article/pitching-music-and-videos-to-playlist-editors/', accessed: '2026-10-07' },
      { label: 'Promoting music on Spotify', publisher: 'Spotify for Artists Support', href: 'https://support.spotify.com/by-en/artists/article/promoting-music-on-spotify/', accessed: '2026-10-07' },
      { label: 'Artificial streaming', publisher: 'Spotify for Artists', href: 'https://artists.spotify.com/artificial-streaming', accessed: '2026-10-07' },
      { label: 'What’s the difference between standard and premium credits?', publisher: 'SubmitHub Help', href: 'https://www.submithub.com/help/QPHgFWDSCm82W7vLJ', accessed: '2026-10-07' },
      { label: 'How to get Spotify playlist placements and blog coverage for free', publisher: 'SubmitHub', href: 'https://www.submithub.com/story/free-music-promotion', accessed: '2026-10-07' },
      { label: 'DailyPlaylists homepage', publisher: 'DailyPlaylists', href: 'https://dailyplaylists.com/en/', accessed: '2026-10-07' },
      { label: 'Free, safe Spotify playlist promo with Pitchplaylists', publisher: 'PitchPlaylists', href: 'https://pitchplaylists.com/blog/guides/spotify-playlist-promo/', accessed: '2026-10-07' },
      { label: 'Submit music to Spotify playlists', publisher: 'Soundplate', href: 'https://soundplate.com/new-spotify-playlists1/', accessed: '2026-10-07' },
      { label: 'Do I have to pay to use Groover?', publisher: 'Groover Help Center', href: 'https://help.groover.co/en/articles/2966389-do-i-have-to-pay-to-use-groover', accessed: '2026-10-07' },
    ],
  }
];

export const guideBySlug = new Map(guides.map((guide) => [guide.slug, guide]));

export function guidesByTopic() {
  return learnTopics
    .map((topic) => ({ topic, guides: guides.filter((guide) => guide.topic === topic) }))
    .filter((group) => group.guides.length > 0);
}

// Strip [label](href) markup for metadata and structured data.
export function plainText(text: string) {
  return text.replace(/\[([^\]\n]+)\]\(((?:\/|https:\/\/)[^)\s]+)\)/g, '$1');
}

export function formatGuideDate(isoDate: string) {
  return new Date(isoDate + 'T12:00:00Z').toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
