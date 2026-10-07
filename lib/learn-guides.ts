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
      { href: '/learn/why-playlist-curators-reject-songs', label: 'Why curators reject songs', detail: 'Each decline reason and what to do next.' },
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
            ['Editorial (Spotify logo in the byline)', 'Spotify’s editors', 'Pitch one unreleased song in Spotify for Artists before release, ideally at least 7 days ahead', 'The pitch, the timing and the song'],
            ['Release Radar (personalized, for your followers)', 'Spotify, for each of your followers', 'Pitch an unreleased song at least 7 days before release and Spotify adds it to your followers’ Release Radar', 'Pitch timing and how many people follow you'],
            ['Discover Weekly, Daily Mix and other personalized playlists', 'Spotify’s algorithms, per listener', 'No pitch exists. They respond to what listeners do', 'Real listening from real fans'],
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
          body: 'A song that is already out cannot be pitched to editors. Put the effort into independent playlists and into pitching your next release on time. Independent curators accept released songs, and so does our own network of [BVSS FVM and CuratorOS playlists](/free-spotify-playlist-submission).',
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
          'Timelines vary by distributor and genre. This is a practical order of operations built around Spotify’s timing guidance.',
        ],
        table: {
          caption: 'Order of operations around release day',
          columns: ['When', 'Do this'],
          rows: [
            ['Weeks before release', 'Finish the master and metadata. Deliver to your distributor with time to spare.'],
            ['Once it shows in Spotify for Artists', 'Pitch your chosen song to editors, ideally at least 7 days before release so it also reaches your followers’ Release Radar. It stays eligible until it is released.'],
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
      { question: 'Is it too late to pitch if my release is less than 7 days away?', answer: 'Eligibility depends on the song being unreleased, not on a set number of days. Spotify asks for at least 7 days so editors have time to listen, and only a pitch made at least 7 days ahead adds the song to your followers’ Release Radar. Pitch as early as you can.' },
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
      { href: '/learn/playlist-promotion', label: 'Playlist promotion: what you can measure', detail: 'What placements do, what Spotify for Artists shows and where attribution stops.' },
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
          { title: 'Deliver early and pitch one song', body: 'Get the release to your distributor early, then pitch one unreleased song in Spotify for Artists, ideally at least 7 days before release. A pitch made at least 7 days ahead also puts the song in your followers’ Release Radar, even if editors pass. The full rules are in [how to get on Spotify playlists](/learn/how-to-get-on-spotify-playlists).' },
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
      { question: 'Is submitting to playlists free?', answer: 'Many independent curators accept free submissions, and so does every playlist in the BVSS FVM and CuratorOS network. Free submission means a free review, not guaranteed placement.' },
    ],
    related: [
      { href: '/learn/free-music-promotion', label: 'Free music promotion, every channel', detail: 'A zero-budget plan beyond Spotify.' },
      { href: '/free-spotify-playlist-submission', label: 'Free Spotify playlist submission', detail: 'Every open playlist in our network, with filters and a free submit button.' },
      { href: '/learn/how-to-get-on-spotify-playlists', label: 'How to get on Spotify playlists', detail: 'Editorial pitching, algorithmic playlists and independent curators.' },
      { href: '/learn/how-we-review-playlist-submissions', label: 'How we review submissions', detail: 'What our curators listen for.' },
      { href: '/learn/best-free-music-promotion-sites', label: 'Free music promotion sites', detail: 'What is actually free on each service, checked against their own pages.' },
      { href: '/learn/spotify-promotion-scams', label: 'Spotify promotion scams', detail: 'How the common schemes work and what to do if a suspicious playlist adds you.' },
      { href: '/learn/how-to-get-more-spotify-streams', label: 'How to get more Spotify streams', detail: 'Grow real listeners and bring them back, without bots.' },
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
        heading: 'Common scam patterns',
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
          body: 'Do not infer an address or scrape for private contact details. Move on to a playlist whose curator publishes a way to submit.',
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
          'If you are not sure which of our playlists fits, the [Playlist Fit Checker](/tools/playlist-fit-checker) matches your genre, moods and listening moment against each open playlist and explains every match.',
          'Networks save time because the fit information is in one place and one submission can reach several playlists. Check who curates them and whether anything about the decision is for sale.',
          'In our case: BVSS FVM playlists are programmed by BVSS FVM, and CuratorOS playlists by the in-house CuratorOS team, which operates alongside us. They are not independent third-party curators and none of them are Spotify editorial playlists. Submission is free, and each playlist your song fits gets a human decision.',
        ],
        callout: { kind: 'submit' },
      },
    ],
    faq: [
      { question: 'How do I find a playlist curator’s email?', answer: 'Only use contact details the curator published for submissions, such as a link in the playlist description or on their website. If there is no published channel, move on to another playlist rather than guessing, scraping or hunting for private contact details.' },
      { question: 'Is it OK to message curators on social media?', answer: 'Only where they invite submissions there. Sending unsolicited messages to someone’s personal accounts usually works against you.' },
      { question: 'Are curator directories worth using?', answer: 'They can save time. Check who runs the playlists, whether you are paying for review or being sold a result, and whether the playlists actually fit your song.' },
      { question: 'How many curators should I contact per release?', answer: 'As many as genuinely fit, and no more. A short list of strong matches gets better results and better relationships than a mass send.' },
      { question: 'How can I tell if a playlist is real?', answer: 'Look for a coherent sound, recent updates and an identifiable curator, and avoid anything that sells streams or placement. Our [scams guide](/learn/spotify-promotion-scams) covers Spotify’s own warning signs.' },
    ],
    related: [
      { href: '/tools/playlist-fit-checker', label: 'Playlist Fit Checker', detail: 'Find playlists in our network that fit your song.' },
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
        heading: 'Why curators pass',
        paragraphs: [
          'In our review workflow a curator who passes must choose at least one reason: energy mismatch, not my genre lane, wrong mood, too similar to recent adds, vocal style, production not ready, mix / master, or other. Several describe fit with one playlist rather than the quality of the song, which is why the same song can be declined by one playlist and accepted by another.',
          'What each reason means and what to do next is on its own page: [why playlist curators reject songs](/learn/why-playlist-curators-reject-songs).',
          'Before you pitch our network, the [Playlist Fit Checker](/tools/playlist-fit-checker) shows which playlists fit your song’s genre, moods and listening moment, so you can avoid the obvious mismatches.',
        ],
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
          'Independent curators can often hear unreleased music, and many accept released songs. Spotify’s editors only consider unreleased songs, through a separate pitch you make yourself in Spotify for Artists. Spotify asks for at least 7 days’ notice so editors have time to listen, and that timing is also what puts the song in your followers’ Release Radar. The full routes are in [how to get on Spotify playlists](/learn/how-to-get-on-spotify-playlists).',
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
      { question: 'Can I pitch the same song to the same curator again?', answer: 'Generally no. Several of our decline reasons describe fit with that playlist at that moment. A new release is a better reason to get back in touch.' },
      { question: 'Should I pay to pitch curators?', answer: 'Spotify says to be highly skeptical of services that charge to be considered, and that selling placement breaks its terms. Submission to our playlists is free.' },
    ],
    related: [
      { href: '/tools/playlist-fit-checker', label: 'Playlist Fit Checker', detail: 'Check which playlists fit before you pitch.' },
      { href: '/learn/why-playlist-curators-reject-songs', label: 'Why curators reject songs', detail: 'Each decline reason and what to do next.' },
      { href: '/learn/find-spotify-playlist-curators', label: 'Find Spotify playlist curators', detail: 'Find playlists that fit before you pitch.' },
      { href: '/free-spotify-playlist-submission', label: 'Free Spotify playlist submission', detail: 'Submit free to human-curated playlists.' },
      { href: '/learn/how-we-review-playlist-submissions', label: 'How we review submissions', detail: 'What our curators listen for.' },
      { href: '/learn/spotify-promotion-scams', label: 'Spotify promotion scams', detail: 'Red flags before you pay anyone.' },
      { href: '/learn/playlist-promotion', label: 'Playlist promotion: what you can measure', detail: 'What placements do, what Spotify for Artists shows and where attribution stops.' },
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
    seoTitle: 'Free Music Promotion Sites (2026): What Is Actually Free?',
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
            ['Spotify for Artists', 'Pitching one unreleased song to Spotify’s editors (ideally at least 7 days before release, which also adds it to your followers’ Release Radar); Canvas, Artist Pick and Promo Cards', 'Display campaigns (Marquee, Showcase) and Spotify Ads Manager', 'Spotify’s editors. Spotify says pitching does not guarantee placement.'],
            ['BVSS FVM + CuratorOS (our network)', 'Submission and human review for every playlist in the network', 'Nothing: there is no paid tier and placement is never sold', 'BVSS FVM and the in-house CuratorOS team, separately for each playlist'],
            ['SubmitHub', 'Two standard credits every four hours. Curators may respond to standard submissions but are not required to. Premium credits can be earned through its Hot or Not feature (one per 20 ratings).', 'Premium credits, from $1 each and as low as $0.78 in bulk, according to its help center. For premium submissions, curators must respond within 72 hours, listen for at least 60 seconds, and either approve or explain in at least 20 words.', 'Individual playlisters, bloggers and influencers'],
            ['DailyPlaylists', 'A Standard tier for submitting to playlist owners who want submissions', 'Premium Credits for selected curators, and a Professional tier with more weekly submissions and tools (prices on its pricing page)', 'Individual playlist owners'],
            ['PitchPlaylists', 'Its own guide (last updated July 2025) describes the service as completely free and says playlist spots are not for sale', 'None described in that guide. Check the site for current terms.', 'Curators; an approved track is added to their playlist'],
            ['Soundplate', 'Submission to the playlists listed on its submission page, which it describes as free', 'The site also sells other marketing services, such as ad campaigns', 'Listed curators. The page does not say who runs its “Official Soundplate Playlists.”'],
          ],
        },
      },
      {
        heading: 'Paid models are a different question',
        paragraphs: [
          'This page only covers what is free. Some services, such as Groover, are paid only, and others charge for a curator’s time or run managed campaigns. How those models work, and what each payment covers, is in [playlist submission sites compared by model](/learn/best-spotify-playlist-submission-sites).',
          'Paying for review time is not the same as buying placement, but Spotify says to treat services that charge to be considered with high skepticism. Our [scams guide](/learn/spotify-promotion-scams) explains the difference.',
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
      { question: 'Which free music promotion site should I use?', answer: 'We do not rank them. They do different things: Spotify’s editorial pitch is the only route to editorial playlists, while the others connect you with independent curators. Use the table to match a service to your goal.' },
      { question: 'Are free submission sites worth it if curators do not have to reply?', answer: 'They can be, as long as you expect some silence. Accurate genre and mood details, and choosing playlists that really fit, improve your chances more than volume does.' },
      { question: 'Is SubmitHub free?', answer: 'Partly. According to its help center you get two standard credits every four hours, and curators are not required to respond to those. Premium credits cost money (or can be earned) and come with response requirements.' },
      { question: 'Is BVSS FVM really free?', answer: 'Yes. Submission and review are free for every playlist in the BVSS FVM and CuratorOS network, there is no paid tier, and placement is never sold.' },
      { question: 'Why is Groover not on the free list?', answer: 'Its own help center says it is a paid service: each curator contact costs Grooviz. Paid models are compared in [playlist submission sites compared by model](/learn/best-spotify-playlist-submission-sites).' },
    ],
    related: [
      { href: '/learn/free-music-promotion', label: 'Free music promotion, every channel', detail: 'A zero-budget plan beyond Spotify.' },
      { href: '/free-spotify-playlist-submission', label: 'Free Spotify playlist submission', detail: 'Every open playlist in our network, free to submit.' },
      { href: '/learn/free-spotify-promotion', label: 'Free Spotify promotion', detail: 'Spotify’s free artist tools, release by release.' },
      { href: '/learn/spotify-promotion-scams', label: 'Spotify promotion scams', detail: 'What not to pay for.' },
      { href: '/learn/how-to-pitch-playlist-curators', label: 'How to pitch playlist curators', detail: 'Templates and why curators pass.' },
      { href: '/learn/best-spotify-playlist-submission-sites', label: 'Playlist submission sites compared', detail: 'Free, paid, marketplace and managed models.' },
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
  },
  {
    slug: 'playlist-promotion',
    topic: 'Playlist Promotion',
    published: '2026-10-07',
    updated: '2026-10-07',
    seoTitle: 'Spotify Playlist Promotion: What Works and What You Can Measure',
    title: 'Spotify Playlist Promotion: What Works and What You Can Measure',
    description: 'How playlist promotion actually works, what Spotify for Artists lets you measure, where attribution stops, and what no playlist campaign can honestly promise.',
    eyebrow: 'Playlist promotion · Mechanics and measurement',
    lead: 'Playlist promotion is getting your song considered by the people and systems that program playlists, then finding out what the placements actually did. The first half gets most of the attention. This guide is about the second half: what a placement does, what Spotify for Artists lets you measure, and where the numbers stop being able to tell you anything.',
    sections: [
      {
        heading: 'What a placement actually does',
        paragraphs: [
          'A placement puts your song in front of the people who listen to that playlist, when they listen to it. That is the whole mechanism. A playlist’s follower count tells you how many people saved it at some point, not how many are playing it this week or how far into it they get.',
          'That is why Spotify for Artists ranks the playlists your music is on by how many of your listeners came from each one, not by follower count. Two playlists of similar size can send you very different numbers of listeners.',
          'The routes onto playlists (Spotify’s editors, algorithmic playlists and independent curators) are covered in [how to get on Spotify playlists](/learn/how-to-get-on-spotify-playlists). This page assumes you have, or are about to have, some placements and want to know what they are worth.',
        ],
      },
      {
        heading: 'What Spotify for Artists lets you measure',
        paragraphs: [
          'Spotify groups where streams come from into active sources, where the listener went looking for your music, and programmed sources, where Spotify or another listener chose it for them. You can view these by streams, listeners or streams per listener, and filter by country and time period.',
        ],
        table: {
          caption: 'Source of streams in Spotify for Artists',
          columns: ['Source', 'What it includes', 'What it can tell you'],
          rows: [
            ['Artist profile and catalog (active)', 'Plays from your profile, album pages and your “This Is” playlist', 'People seeking you out directly'],
            ['Listener’s own playlists and library (active)', 'Liked Songs, saved albums and listeners’ own playlists', 'People keeping your music for themselves'],
            ['Listener’s queue (active)', 'Plays added with Add to queue', 'Deliberate, in-the-moment choices'],
            ['Editorial and personalized editorial playlists (programmed)', 'Spotify editor-curated playlists and charts', 'Editorial support'],
            ['Personalized playlists, autoplay and mixes (programmed)', 'Discover Weekly, Release Radar, Radio, Autoplay, Daily Mix, daylist and AI DJ', 'Spotify recommending you to listeners'],
            ['Other listeners’ playlists (programmed)', 'Playlists created by other Spotify users, which includes independent curators', 'Where independent placements show up'],
          ],
        },
      },
      {
        heading: 'Where attribution stops',
        paragraphs: [
          'This is the part most promotion pitches skip. Spotify for Artists reports where each stream happened. Its documentation does not describe a way to follow one listener from a playlist to your profile, a follow or a save. So you can see that a playlist sent you listeners, but not, for example, how many of them followed you afterwards.',
          'Some other limits worth knowing, all from Spotify’s documentation:',
        ],
        bullets: [
          'A stream only counts once a song has played for at least 30 seconds.',
          'The Playlists view lists up to 100 of the playlists you are on, includes a playlist only once at least 3 of your listeners have played your music there, and covers only the last 12 months.',
          'When you view sources by listeners, the subtotals can add up to more than your total, because one person can listen from several sources.',
          'Stats are recorded in UTC, so a “day” may not line up with your local day.',
        ],
        callout: {
          kind: 'note',
          title: 'Correlation is not attribution',
          body: 'If your listeners rise in the same week as a placement, the placement may be why. It may also be a social post, a release from a similar artist, or Release Radar. Change one thing at a time when you can, and treat any single week as a hint rather than proof.',
        },
      },
      {
        heading: 'How to run a playlist campaign you can actually read',
        paragraphs: [],
        steps: [
          { title: 'Take a baseline', body: 'Before you submit anywhere, note your listeners, streams per listener and source-of-streams mix for the last few weeks.' },
          { title: 'Log every placement', body: 'Playlist, date added and curator, in the same tracker you use for submissions (see [finding curators](/learn/find-spotify-playlist-curators)).' },
          { title: 'Watch “Other listeners’ playlists”', body: 'That is where independent placements land. Compare it with your baseline rather than looking at totals.' },
          { title: 'Check the Playlists view', body: 'Once a playlist has sent you at least 3 listeners it appears there, ranked by your listeners. That is the closest thing to a per-playlist result Spotify gives you.' },
          { title: 'Look at what people do next', body: 'Rising “Artist profile and catalog” and “Listener’s own playlists and library” numbers suggest new listeners are coming back on their own. That is the outcome that lasts.' },
        ],
      },
      {
        heading: 'What playlist promotion cannot promise',
        paragraphs: [
          'Any honest playlist promotion, free or paid, comes with these limits. If an offer claims otherwise, read our [scams guide](/learn/spotify-promotion-scams).',
        ],
        bullets: [
          'A placement. Curators and Spotify’s editors decide; selling placement breaks Spotify’s terms.',
          'A number of streams. That depends on how many people play the playlist and how they react to your song.',
          'Algorithmic pickup. Spotify does not publish thresholds for its personalized playlists, so nobody can promise them.',
          'Followers or saves. Those are listener decisions, and Spotify for Artists’ documented stats do not attribute them to playlists.',
          'Royalties on every stream. Spotify only pays recorded royalties on tracks with at least 1,000 streams in the previous 12 months, plus a minimum number of unique listeners it does not publish.',
        ],
      },
      {
        heading: 'Comparing the main routes',
        paragraphs: [],
        table: {
          caption: 'Playlist promotion routes compared',
          columns: ['Route', 'Cost', 'Who decides', 'How you will see it'],
          rows: [
            ['Spotify editorial pitch', 'Free', 'Spotify’s editors', 'Editorial playlists source; Release Radar under personalized playlists'],
            ['Independent curators (free submission)', 'Free', 'Each curator', 'Other listeners’ playlists source; Playlists view'],
            ['Paid review platforms', 'Per submission', 'Each curator', 'Same as above; you pay for review, not results'],
            ['PR or marketing firms', 'Varies', 'The firm’s contacts', 'Depends on the channels they use. Ask before you hire.'],
          ],
        },
        callout: {
          kind: 'submit',
          title: 'Free submission, measurable results',
          body: 'Placements on BVSS FVM and CuratorOS playlists show up in your Spotify for Artists data like any other non-editorial playlist. Find the right lane on our [free submission page](/free-spotify-playlist-submission).',
        },
      },
    ],
    faq: [
      { question: 'Is playlist promotion worth it?', answer: 'It can be when the playlists fit your song and have real listeners. Judge it by the listeners each playlist sends you in Spotify for Artists, not by follower counts or promises.' },
      { question: 'Why are my streams much lower than the playlist’s follower count?', answer: 'Followers are people who saved the playlist at some point. Your streams depend on how many of them play it now, how far they get, and whether your song holds them for 30 seconds.' },
      { question: 'Can I see which playlist got me new followers?', answer: 'Not directly. Spotify for Artists shows where streams happened, but its documentation does not describe attributing follows or saves to a specific playlist.' },
      { question: 'Does a playlist placement trigger Spotify’s algorithm?', answer: 'Spotify says personalized playlists are based on listening activity, but it does not publish thresholds. Nobody can honestly promise algorithmic pickup from a placement.' },
      { question: 'How long until a placement shows up in my stats?', answer: 'Streams appear in your source-of-streams data, and the playlist appears in the Playlists view once at least 3 of your listeners have played your music there.' },
    ],
    related: [
      { href: '/learn/how-to-get-on-spotify-playlists', label: 'How to get on Spotify playlists', detail: 'The routes onto editorial, algorithmic and independent playlists.' },
      { href: '/learn/how-to-pitch-playlist-curators', label: 'How to pitch playlist curators', detail: 'Templates and why curators pass.' },
      { href: '/learn/best-free-music-promotion-sites', label: 'Free music promotion sites', detail: 'What is actually free on each service.' },
      { href: '/learn/best-spotify-playlist-submission-sites', label: 'Playlist submission sites compared', detail: 'Free, paid, marketplace and managed models.' },
      { href: '/free-spotify-playlist-submission', label: 'Free Spotify playlist submission', detail: 'Submit free to human-curated playlists.' },
      { href: '/learn/how-to-get-more-spotify-streams', label: 'How to get more Spotify streams', detail: 'Grow real listeners and bring them back, without bots.' },
    ],
    sources: [
      { label: 'Source of streams', publisher: 'Spotify for Artists Support', href: 'https://support.spotify.com/us/artists/article/source-of-streams/', accessed: '2026-10-07' },
      { label: 'Seeing playlists you’re added to', publisher: 'Spotify for Artists Support', href: 'https://support.spotify.com/us/artists/article/seeing-playlists-your-music-is-on/', accessed: '2026-10-07' },
      { label: 'How your streams are counted', publisher: 'Spotify for Artists Support', href: 'https://support.spotify.com/us/artists/article/how-your-streams-are-counted/', accessed: '2026-10-07' },
      { label: 'Listener and follower data', publisher: 'Spotify for Artists Support', href: 'https://support.spotify.com/us/artists/article/listener-and-follower-data/', accessed: '2026-10-07' },
      { label: 'Types of Spotify playlists', publisher: 'Spotify for Artists Support', href: 'https://support.spotify.com/us/artists/article/types-of-spotify-playlists/', accessed: '2026-10-07' },
      { label: 'Track monetization eligibility', publisher: 'Spotify for Artists Support', href: 'https://support.spotify.com/us/artists/article/track-monetization-eligibility/', accessed: '2026-10-07' },
      { label: 'Artificial streaming and paid 3rd-party services that guarantee streams', publisher: 'Spotify for Artists Support', href: 'https://support.spotify.com/us/artists/article/third-party-services-that-guarantee-streams/', accessed: '2026-10-07' },
    ],
  },
  {
    slug: 'how-to-get-more-spotify-streams',
    topic: 'Spotify Promotion',
    published: '2026-10-07',
    updated: '2026-10-07',
    seoTitle: 'How to Get More Spotify Streams Without Bots (2026 Guide)',
    title: 'How to Get More Spotify Streams Without Bots',
    description: 'More Spotify streams come from more real listeners who come back. A practical plan using Spotify’s own tools and data, with no bought plays or algorithm myths.',
    eyebrow: 'Spotify promotion · Audience growth',
    lead: 'Every legitimate stream is a person choosing to play your song for at least 30 seconds. So there are only two honest ways to get more streams: reach more people, and give the people you reach reasons to come back. This guide covers both, using Spotify’s own tools and data, and explains why bought streams are not a shortcut.',
    sections: [
      {
        heading: 'Why bought streams are not an option',
        paragraphs: [
          'Spotify defines an artificial stream as one that “doesn’t reflect genuine user listening intent,” and says services that sell streams are not legitimate. When it confirms artificial streaming it can withhold the related royalties, correct stream counts, remove the song from playlists, and in serious cases have it removed altogether. Any scheme that inflates plays without real listening sits on the wrong side of that line. Our [scams guide](/learn/spotify-promotion-scams) covers the common offers.',
          'You will also not find promises here about the exact number of saves, skips or streams that “trigger” Spotify’s recommendations. Spotify does not publish those thresholds, so nobody outside Spotify can honestly give them to you.',
        ],
      },
      {
        heading: 'Start by reading where your streams come from',
        paragraphs: [
          'In Spotify for Artists, source of streams splits your plays into active sources (people seeking you out) and programmed sources (playlists and recommendations). Your current mix tells you where the next effort will pay off.',
        ],
        table: {
          caption: 'What your source mix suggests',
          columns: ['If most streams come from', 'It usually means', 'Focus next on'],
          rows: [
            ['Your profile, catalog and listeners’ own libraries', 'A loyal core that seeks you out', 'Reaching new people: playlists, sharing, collaborations'],
            ['Other listeners’ playlists', 'Playlists are introducing you', 'Turning those listeners into followers'],
            ['Personalized playlists and mixes', 'Spotify is recommending you', 'Keeping new listeners: follows, saves, your next release'],
            ['Very little of anything yet', 'You are early', 'A small, real audience first: people who already like your music'],
          ],
        },
      },
      {
        heading: 'Reach more real listeners',
        paragraphs: [],
        steps: [
          { title: 'Pitch every release to Spotify’s editors', body: 'Pitch one unreleased song in Spotify for Artists before release. Pitch at least 7 days ahead and Spotify also adds it to your followers’ Release Radar, even if editors pass. Details in [how to get on Spotify playlists](/learn/how-to-get-on-spotify-playlists).' },
          { title: 'Get on independent playlists that fit', body: 'Playlists with listeners who like your sound are the most direct way to reach new people. Find them with [this guide](/learn/find-spotify-playlist-curators), pitch them with [these templates](/learn/how-to-pitch-playlist-curators), or submit free to [our network](/free-spotify-playlist-submission).' },
          { title: 'Bring people in from outside Spotify', body: 'Share your Spotify link wherever your audience already is, with a Promo Card or your own artwork, and Spotify Codes on anything physical. Spotify’s own advice is that sharing helps turn listeners into followers.' },
          { title: 'Collaborate', body: 'A release with another artist puts your music in front of their listeners as well as yours. Make sure you are credited correctly (main or featured artist) when it is delivered.' },
          { title: 'Consider Spotify’s own paid tools, if you have a budget', body: 'Marquee and Showcase display campaigns and Spotify Ads Manager are legitimate ways to reach listeners. They are optional; everything above is free.' },
        ],
      },
      {
        heading: 'Give listeners reasons to come back',
        paragraphs: [
          'Reach gets the first stream. What happens afterwards decides whether there is a second.',
        ],
        steps: [
          { title: 'Ask for the follow', body: 'Followers get your new releases in Release Radar and notifications about new releases. When you share a song, say plainly that following you is how people hear the next one.' },
          { title: 'Make your profile a destination', body: 'Pin your latest release as your Artist Pick (it stays up for 180 days unless you change it), add a Canvas, and feature an artist playlist on your profile with new music or songs you love.' },
          { title: 'Help your fans help Spotify understand you', body: 'Spotify says your Fans Also Like section is based on your fans’ listening habits, and suggests encouraging fans to stream, save and add your music to their playlists. Real fans doing that is the legitimate version of every “algorithm hack.”' },
          { title: 'Keep the next release coming', body: 'Every release is a new chance to reach your followers through Release Radar and to pitch editors again. Plan the next one before this one peaks.' },
        ],
        callout: { kind: 'submit' },
      },
      {
        heading: 'Measure the right things',
        paragraphs: [
          'Release engagement in Spotify for Artists shows what percentage of your monthly active listeners (as of the day before release) streamed your new release in its first 28 days. It is a direct read on whether your existing audience is showing up for new music.',
          'Alongside it, watch your source-of-streams mix and the Playlists view, which lists the playlists sending you listeners. [Playlist promotion: what you can measure](/learn/playlist-promotion) explains how to read them and where attribution stops.',
        ],
      },
      {
        heading: 'A realistic expectation',
        paragraphs: [
          'Legitimate growth is usually gradual and uneven: a placement here, a good release there, a few hundred people who decide they like what you do. That is slower than buying a number, and it is the only version that pays out in fans. Spotify only pays recorded royalties on tracks with at least 1,000 streams in the previous 12 months and a minimum number of unique listeners, which it does not publish, so real, repeat listening from real people matters even before you think about recommendations.',
        ],
      },
    ],
    faq: [
      { question: 'How many streams do I need to get on Discover Weekly?', answer: 'Spotify does not publish a number. Personalized playlists are built from each listener’s activity, so anyone quoting a threshold is guessing.' },
      { question: 'Do saves and skips affect my streams?', answer: 'Spotify does not publish how it weighs them. It does say that when fans add music to their playlists, it tells Spotify what they like and what to recommend.' },
      { question: 'Can I pay to get more streams?', answer: 'You can pay for Spotify’s own advertising tools. Paying anyone for streams or guaranteed placements is against Spotify’s terms and can get your music removed.' },
      { question: 'How long does it take to grow streams?', answer: 'There is no fixed timeline. Measure each release with release engagement and source of streams, and build on what is working.' },
      { question: 'Is submitting to playlists a good way to get streams?', answer: 'It can be, when the playlist fits your song and has real listeners. Submission to BVSS FVM and CuratorOS playlists is free; placement is decided by curators and never sold.' },
    ],
    related: [
      { href: '/learn/playlist-promotion', label: 'Playlist promotion: what you can measure', detail: 'Read your stats and the limits of attribution.' },
      { href: '/learn/free-spotify-promotion', label: 'Free Spotify promotion', detail: 'Spotify’s free artist tools, release by release.' },
      { href: '/learn/spotify-promotion-scams', label: 'Spotify promotion scams', detail: 'Why bought streams backfire.' },
      { href: '/free-spotify-playlist-submission', label: 'Free Spotify playlist submission', detail: 'Submit free to human-curated playlists.' },
    ],
    sources: [
      { label: 'How your streams are counted', publisher: 'Spotify for Artists Support', href: 'https://support.spotify.com/us/artists/article/how-your-streams-are-counted/', accessed: '2026-10-07' },
      { label: 'Artificial streaming', publisher: 'Spotify for Artists', href: 'https://artists.spotify.com/artificial-streaming', accessed: '2026-10-07' },
      { label: 'Artificial streaming and paid 3rd-party services that guarantee streams', publisher: 'Spotify for Artists Support', href: 'https://support.spotify.com/us/artists/article/third-party-services-that-guarantee-streams/', accessed: '2026-10-07' },
      { label: 'Source of streams', publisher: 'Spotify for Artists Support', href: 'https://support.spotify.com/us/artists/article/source-of-streams/', accessed: '2026-10-07' },
      { label: 'Getting music on Release Radar', publisher: 'Spotify for Artists Support', href: 'https://support.spotify.com/us/artists/article/getting-music-on-release-radar/', accessed: '2026-10-07' },
      { label: 'Fans Also Like', publisher: 'Spotify for Artists Support', href: 'https://support.spotify.com/us/artists/article/fans-also-like/', accessed: '2026-10-07' },
      { label: 'Posting artist playlists to your profile', publisher: 'Spotify for Artists Support', href: 'https://support.spotify.com/us/artists/article/artist-playlists/', accessed: '2026-10-07' },
      { label: 'Managing your Artist Pick', publisher: 'Spotify for Artists Support', href: 'https://support.spotify.com/us/artists/article/managing-your-artist-pick/', accessed: '2026-10-07' },
      { label: 'Understanding release engagement', publisher: 'Spotify for Artists Support', href: 'https://support.spotify.com/km-en/artists/article/understanding-release-engagement/', accessed: '2026-10-07' },
      { label: 'Sharing your music', publisher: 'Spotify for Artists Support', href: 'https://support.spotify.com/cm-en/artists/article/sharing-your-music/', accessed: '2026-10-07' },
      { label: 'Types of Spotify playlists', publisher: 'Spotify for Artists Support', href: 'https://support.spotify.com/us/artists/article/types-of-spotify-playlists/', accessed: '2026-10-07' },
      { label: 'Track monetization eligibility', publisher: 'Spotify for Artists Support', href: 'https://support.spotify.com/us/artists/article/track-monetization-eligibility/', accessed: '2026-10-07' },
    ],
  },
  {
    slug: 'best-spotify-playlist-submission-sites',
    topic: 'Playlist Promotion',
    published: '2026-10-07',
    updated: '2026-10-07',
    seoTitle: 'Spotify Playlist Submission Sites Compared by Model (2026)',
    title: 'Spotify Playlist Submission Sites, Compared by Model',
    description: 'How Spotify playlist submission sites work: free submission, paid consideration, curator marketplaces and managed campaigns, checked against each site’s own pages.',
    eyebrow: 'Playlist promotion · Transparent comparison',
    lead: 'Playlist submission sites look similar from the outside and work very differently underneath. Some are free, some charge for a curator’s time, some are marketplaces, and some run the campaign for you. This comparison sorts them by model, using what each site says about itself. One of the networks listed is ours, and it is labeled.',
    sections: [
      {
        heading: 'How we compared them',
        paragraphs: [
          'Every platform detail below comes from that platform’s own website or help center, checked on October 7, 2026, and linked in the sources. We have not tested these services against each other, so there are no rankings, acceptance rates, user counts or “best overall” verdicts, and prices appear only where the platform publishes them. Terms change; check the source before you pay for anything.',
          'Disclosure: BVSS FVM operates its own playlist network (BVSS FVM and the in-house CuratorOS team). It is listed under free submission because that is how it works.',
        ],
      },
      {
        heading: 'The four models',
        paragraphs: [
          'Most confusion comes from comparing sites that sell different things. Start by deciding which of these you are buying, if anything.',
        ],
        table: {
          caption: 'Playlist submission models',
          columns: ['Model', 'What you pay for', 'What you get', 'Watch for'],
          rows: [
            ['Free submission', 'Nothing', 'A chance to be heard; curators may not have to reply', 'Silence is normal. Fit matters more than volume.'],
            ['Paid consideration', 'A curator’s time to listen and respond', 'A response, often with rules about listening time or feedback', 'You are paying for review, not results.'],
            ['Curator marketplace', 'Varies: free and paid options on one platform', 'Access to many curators with their own terms', 'Each curator decides; check what each option includes.'],
            ['Managed promotion', 'A campaign run on your behalf', 'Your song sent to curators the service selects', 'Ask who the curators are and what happens if none of them add the song.'],
          ],
        },
        callout: {
          kind: 'warning',
          title: 'The line Spotify draws',
          body: 'Paying for a curator’s time is not the same as paying for a placement. Spotify says services that promise placement in exchange for money break its terms, and that services charging to be considered deserve high skepticism. See [promotion scams](/learn/spotify-promotion-scams).',
        },
      },
      {
        heading: 'Platforms by model',
        paragraphs: [
          'What each platform says about its own model. Some fit more than one.',
        ],
        table: {
          caption: 'What each platform says (checked October 7, 2026)',
          columns: ['Platform', 'Model', 'Free', 'Paid'],
          rows: [
            ['BVSS FVM + CuratorOS (our network)', 'Free submission', 'Submission and human review for every playlist', 'Nothing; placement is never sold'],
            ['SubmitHub', 'Marketplace: free and paid consideration', 'Two standard credits every four hours; curators are not required to respond', 'Premium credits from $1 (as low as $0.78 in bulk); curators must respond within 72 hours, listen 60 seconds, and approve or explain in 20+ words'],
            ['SubmitLink', 'Free submission and paid consideration', 'One song to two eligible playlists every 24 hours; no reply required', 'Paid campaigns that it says charge for curator consideration, not placement, with a seven-day nonresponse credit'],
            ['DailyPlaylists', 'Marketplace', 'Standard tier submissions', 'Premium Credits and a Professional tier (prices on its pricing page)'],
            ['Groover', 'Paid consideration marketplace', 'Not free', '2 Grooviz per curator (€1 each), 4 for top curators; Grooviz returned if no reply in 7 days'],
            ['Musosoup', 'Curator marketplace', 'Submitting is free', 'Curators make offers, paid or free, that you choose to accept; prices on its pricing page'],
            ['Playlist Push', 'Managed promotion', 'Not free', 'Spotify campaigns from $280 (it says the average is $550); curators review for up to 2 to 4 weeks; it says placements are not guaranteed'],
          ],
        },
        callout: {
          kind: 'note',
          title: 'Not on this list',
          body: 'Spotify’s own editorial pitch is not a submission site: it is free inside Spotify for Artists and separate from everything here. See [how to get on Spotify playlists](/learn/how-to-get-on-spotify-playlists). For the free side of each service in more detail, see [what is actually free](/learn/best-free-music-promotion-sites).',
        },
      },
      {
        heading: 'How to choose',
        paragraphs: [],
        steps: [
          { title: 'Decide what you need', body: 'Reach on a small budget points to free submission. Wanting a reply on a deadline points to paid consideration. Help running a campaign points to managed promotion.' },
          { title: 'Check the curators, not the platform', body: 'Whatever the model, a curator decides. Open their playlists and check fit before you spend anything, using [this checklist](/learn/find-spotify-playlist-curators).' },
          { title: 'Read what the payment covers', body: 'Listening time, written feedback, a campaign? If any wording implies a placement in exchange for money, walk away.' },
          { title: 'Pitch accurately', body: 'Honest genre, moods and comparable artists matter on every platform. [These templates](/learn/how-to-pitch-playlist-curators) work anywhere.' },
          { title: 'Measure the result', body: 'Use the Playlists view and source of streams in Spotify for Artists, not the platform’s own summary. [Here is how](/learn/playlist-promotion).' },
        ],
        callout: {
          kind: 'submit',
          title: 'Start with free submission',
          body: 'Every playlist in our network that is open to submissions is on our [free submission page](/free-spotify-playlist-submission), with filters for genre, mood and moment. Submit once; each playlist that fits gets a human decision.',
        },
      },
    ],
    faq: [
      { question: 'Which playlist submission site should I use?', answer: 'We do not rank them. They sell different things, so the right choice depends on whether you want free submission, a response on a deadline, a marketplace or a managed campaign.' },
      { question: 'Is paying for playlist submission legal on Spotify?', answer: 'Paying for a curator’s time to review is different from buying a placement. Spotify says paying for placement breaks its terms, and it advises high skepticism toward services that charge to be considered.' },
      { question: 'Do paid submissions get accepted more often?', answer: 'We have no data to say so, and platforms that charge for consideration say you are paying for review, not results.' },
      { question: 'Is BVSS FVM a submission site?', answer: 'It is a playlist network that accepts free submissions to its own playlists: BVSS FVM and the in-house CuratorOS team. It does not sell placement or charge for review.' },
      { question: 'What is managed playlist promotion?', answer: 'A service runs a campaign for you, sending your song to curators it works with. Check who those curators are, what you are paying for and what is not guaranteed.' },
    ],
    related: [
      { href: '/free-spotify-playlist-submission', label: 'Free Spotify playlist submission', detail: 'Submit free to our network.' },
      { href: '/learn/best-free-music-promotion-sites', label: 'What is actually free', detail: 'The free side of each service.' },
      { href: '/learn/find-spotify-playlist-curators', label: 'Find Spotify playlist curators', detail: 'Check fit before you submit.' },
      { href: '/learn/how-to-pitch-playlist-curators', label: 'How to pitch playlist curators', detail: 'Templates that work on any platform.' },
      { href: '/learn/playlist-promotion', label: 'Measure playlist promotion', detail: 'What your stats can and cannot tell you.' },
    ],
    sources: [
      { label: 'What’s the difference between standard and premium credits?', publisher: 'SubmitHub Help', href: 'https://www.submithub.com/help/QPHgFWDSCm82W7vLJ', accessed: '2026-10-07' },
      { label: 'Free Spotify playlist submission', publisher: 'SubmitLink', href: 'https://www.submitlink.io/features/playlist-submissions', accessed: '2026-10-07' },
      { label: 'DailyPlaylists homepage', publisher: 'DailyPlaylists', href: 'https://dailyplaylists.com/en/', accessed: '2026-10-07' },
      { label: 'Do I have to pay to use Groover?', publisher: 'Groover Help Center', href: 'https://help.groover.co/en/articles/2966389-do-i-have-to-pay-to-use-groover', accessed: '2026-10-07' },
      { label: 'How it works: artists', publisher: 'Musosoup', href: 'https://musosoup.com/artists-how-it-works', accessed: '2026-10-07' },
      { label: 'How do Spotify campaigns work for artists?', publisher: 'Playlist Push Help', href: 'https://help.playlistpush.com/en/articles/2456849-how-do-spotify-campaigns-work-for-artists', accessed: '2026-10-07' },
      { label: 'Artificial streaming', publisher: 'Spotify for Artists', href: 'https://artists.spotify.com/artificial-streaming', accessed: '2026-10-07' },
      { label: 'Artificial streaming and paid 3rd-party services that guarantee streams', publisher: 'Spotify for Artists Support', href: 'https://support.spotify.com/us/artists/article/third-party-services-that-guarantee-streams/', accessed: '2026-10-07' },
    ],
  },
  {
    slug: 'free-music-promotion',
    topic: 'Free Music Promotion',
    published: '2026-10-07',
    updated: '2026-10-07',
    seoTitle: 'Free Music Promotion: A Zero-Budget Plan for Independent Artists',
    title: 'Free Music Promotion: A Zero-Budget Plan',
    description: 'How to promote music without a budget across Spotify, playlists, short video, your own audience, collaborations and artist profiles. Free costs time, not money.',
    eyebrow: 'Free music promotion · Across every channel',
    lead: 'Free music promotion is real, but it is not effortless. What you save in money you spend in time, consistency and a lot of small, specific asks. This plan covers every channel an independent artist can use without a budget, what each one is good for, and how to fit them around a release so the work adds up instead of scattering.',
    sections: [
      {
        heading: 'What “free” costs',
        paragraphs: [
          'Nothing on this page needs money. All of it needs time: preparing assets, writing pitches, posting, replying, following up. Results are uneven and slow, and no free channel guarantees listeners, playlist adds or followers. The plan below is built to make that time count.',
          'If you only want Spotify’s own tools, the [free Spotify promotion plan](/learn/free-spotify-promotion) covers them release by release. This page is the wider picture.',
        ],
      },
      {
        heading: 'The channels, and what each one is for',
        paragraphs: [],
        table: {
          caption: 'Free promotion channels compared',
          columns: ['Channel', 'Good for', 'What it takes'],
          rows: [
            ['Spotify for Artists', 'Editorial pitching, Release Radar for followers, profile tools', 'One pitch per release, ideally at least 7 days ahead; keeping the profile current'],
            ['Playlist submission', 'Reaching listeners who already like your sound', 'Finding playlists that fit and pitching each one accurately'],
            ['Short-form video', 'Being discovered by people who have never heard of you', 'Regular posting, and ideas built around the song rather than ads for it'],
            ['Direct fans and communities', 'Turning a few listeners into people who show up every release', 'Replying, sharing in places you already take part in, not spamming'],
            ['Collaborations', 'Sharing audiences with an artist at a similar stage', 'A real creative fit and correct credits'],
            ['Email and owned audience', 'Reaching fans without depending on any platform', 'A sign-up link and a reason to use it'],
            ['Artist profiles everywhere', 'Looking credible when someone checks you out', 'Claiming each profile once and keeping it consistent'],
          ],
        },
      },
      {
        heading: 'Before release: get the assets ready once',
        paragraphs: [
          'Most free promotion fails at the asset stage: no clean link, no short clip, no one-line description of the song. Prepare these once and every channel gets easier.',
        ],
        bullets: [
          'A one-sentence description of the song: genre, mood, and what it sounds like.',
          'Artwork in square and vertical formats.',
          'Several short vertical clips (the hook, a behind-the-scenes moment, a lyric).',
          'A Spotify Canvas, a 3 to 8 second looping visual for the track.',
          'A single link that points to the song on every service, plus your Spotify link on its own.',
          'Two or three comparable artists whose music genuinely overlaps with yours.',
        ],
      },
      {
        heading: 'Claim and tidy your artist profiles',
        paragraphs: [
          'People check you out before they press play, and so do curators. Claim the free artist profiles where your music lives: Spotify for Artists, Apple Music for Artists (which shows how your music performs across Apple Music, iTunes and Shazam), and YouTube. On YouTube, an Official Artist Channel brings your subscribers and content into one place; you request it through your distributor or label, and it requires at least one official release delivered to YouTube.',
          'Use the same photo, bio and links everywhere. A consistent, current profile does not promote anything on its own, but an empty one can undo the rest of your work.',
        ],
      },
      {
        heading: 'Release week, channel by channel',
        paragraphs: [],
        steps: [
          { title: 'Spotify', body: 'Pitch the song to Spotify’s editors before release. Pitch at least 7 days ahead and Spotify also adds it to your followers’ Release Radar, even if editors pass. Set the release as your Artist Pick. The [Spotify plan](/learn/free-spotify-promotion) has every step.' },
          { title: 'Playlists', body: 'Pitch a short list of independent playlists that really fit, using [this checklist](/learn/find-spotify-playlist-curators) and [these templates](/learn/how-to-pitch-playlist-curators). Submission to [our network](/free-spotify-playlist-submission) is free.' },
          { title: 'Short-form video', body: 'Post the clips you prepared, then keep going after release week. A clip that tells a small story about the song, or shows how part of it was made, gives people a reason to look the song up.' },
          { title: 'Your own audience', body: 'Tell the people who already listen, directly: your email list, close friends of the music, the communities you are part of. Ask for one specific thing, like following you on Spotify so they hear the next release.' },
          { title: 'Collaborators', body: 'If the release has a feature or remix, plan together who posts what and when, and check the credits are correct on every service.' },
        ],
        callout: { kind: 'submit' },
      },
      {
        heading: 'Build an audience you own',
        paragraphs: [
          'Every platform can change how much of your audience sees you. An email list cannot be taken away by an algorithm change, and it is free to start. Put a sign-up link wherever your music lives, and give people a reason to join: early listens, lyrics, the story behind a song.',
          'Some music platforms help directly. Bandcamp, for example, gives fans who buy from you or follow you the choice to join your mailing list, and lets you require an email address for free downloads.',
        ],
      },
      {
        heading: 'Collaborations that actually help',
        paragraphs: [
          'A collaboration puts your music in front of another artist’s listeners, and theirs in front of yours. It works best between artists at a similar stage whose music genuinely fits together. Make sure each artist is credited correctly (main or featured) when the release is delivered, so it shows up on both profiles.',
          'Smaller collaborations count too: a remix swap, a shared playlist, a joint live stream, or simply sharing each other’s releases.',
        ],
      },
      {
        heading: 'What to skip, even when it is free',
        paragraphs: [],
        bullets: [
          'Mass messaging strangers with the same link. It burns goodwill faster than it finds fans.',
          '“Free” stream or follower exchanges. Spotify treats streams that do not reflect genuine listening as artificial and can remove the music. See [promotion scams](/learn/spotify-promotion-scams).',
          'Pitching playlists or blogs that do not cover your genre. A wrong-fit pitch costs you and the curator time.',
          'Spreading thin. Two channels done every week beat seven done once.',
        ],
      },
      {
        heading: 'Measure what worked',
        paragraphs: [
          'After each release, check Spotify for Artists: source of streams shows whether new listeners came from playlists, recommendations or people seeking you out, and the Playlists view shows which playlists sent listeners. Keep doing what moved those numbers and drop what did not. [Here is how to read them](/learn/playlist-promotion).',
        ],
      },
    ],
    faq: [
      { question: 'Can you really promote music for free?', answer: 'Yes, but free means no money, not no effort. Every channel here costs time, and none of them guarantees listeners or placements.' },
      { question: 'What is the best free way to promote music?', answer: 'There is no single best channel. Spotify’s editorial pitch and Release Radar cover your followers; fitting playlists and short-form video reach new people; email keeps the fans you find.' },
      { question: 'How is this different from free Spotify promotion?', answer: 'Our [free Spotify promotion guide](/learn/free-spotify-promotion) covers Spotify’s own tools only. This page covers every channel, on and off Spotify.' },
      { question: 'Is free playlist submission worth it?', answer: 'It can be when the playlist fits your song. BVSS FVM and CuratorOS submission is free and human reviewed, with no guaranteed placement.' },
      { question: 'How often should I post short-form video?', answer: 'Often enough that you can keep it up. Consistency over months matters more than a burst during release week.' },
    ],
    related: [
      { href: '/learn/free-spotify-promotion', label: 'Free Spotify promotion', detail: 'Spotify’s free artist tools, release by release.' },
      { href: '/learn/best-free-music-promotion-sites', label: 'What is actually free', detail: 'Free and paid parts of each promotion site.' },
      { href: '/free-spotify-playlist-submission', label: 'Free Spotify playlist submission', detail: 'Submit free to human-curated playlists.' },
      { href: '/learn/how-to-get-more-spotify-streams', label: 'Get more Spotify streams', detail: 'Grow real listening, without bots.' },
    ],
    sources: [
      { label: 'Pitching music and videos to Spotify playlist editors', publisher: 'Spotify for Artists Support', href: 'https://support.spotify.com/us/artists/article/pitching-music-and-videos-to-playlist-editors/', accessed: '2026-10-07' },
      { label: 'Getting music on Release Radar', publisher: 'Spotify for Artists Support', href: 'https://support.spotify.com/us/artists/article/getting-music-on-release-radar/', accessed: '2026-10-07' },
      { label: 'Managing your Artist Pick', publisher: 'Spotify for Artists Support', href: 'https://support.spotify.com/us/artists/article/managing-your-artist-pick/', accessed: '2026-10-07' },
      { label: 'Adding a Canvas to Spotify', publisher: 'Spotify for Artists Support', href: 'https://support.spotify.com/us/artists/article/adding-a-canvas/', accessed: '2026-10-07' },
      { label: 'Apple Music for Artists', publisher: 'Apple', href: 'https://artists.apple.com/', accessed: '2026-10-07' },
      { label: 'Official Artist Channels', publisher: 'YouTube Help', href: 'https://support.google.com/youtube/answer/7336634', accessed: '2026-10-07' },
      { label: 'How do I get started on Bandcamp?', publisher: 'Bandcamp Help Center', href: 'https://get.bandcamp.help/hc/en-us/articles/23020667057943-How-do-I-get-started-on-Bandcamp-', accessed: '2026-10-07' },
      { label: 'Artificial streaming', publisher: 'Spotify for Artists', href: 'https://artists.spotify.com/artificial-streaming', accessed: '2026-10-07' },
      { label: 'Source of streams', publisher: 'Spotify for Artists Support', href: 'https://support.spotify.com/us/artists/article/source-of-streams/', accessed: '2026-10-07' },
    ],
  },
  {
    slug: 'why-playlist-curators-reject-songs',
    topic: 'Playlist Promotion',
    published: '2026-10-07',
    updated: '2026-10-07',
    seoTitle: 'Why Playlist Curators Reject Songs (and What to Do Next)',
    title: 'Why Playlist Curators Reject Songs',
    description: 'The decline reasons curators choose from in the BVSS FVM review workflow, what each one means, and what to change before your next pitch.',
    eyebrow: 'Playlist promotion · Decline reasons explained',
    lead: 'A curator passing on your song is a decision about one song on one playlist at one moment. It is not a verdict on you as an artist. This page explains the decline reasons available in the BVSS FVM and CuratorOS review workflow, what each one means, and what you can do with it.',
    sections: [
      {
        heading: 'How a decline works here',
        paragraphs: [
          'Every submission is reviewed by a person, separately for each playlist it is routed to. For each playlist the curator can accept the song, put it on hold with a date to revisit it, or decline it. A decline on one playlist says nothing about the others.',
          'A curator cannot decline without choosing at least one reason; the review tool will not save the decision otherwise. The reason is shown to you on your submission status page. Our [review process](/learn/how-we-review-playlist-submissions) explains the full workflow.',
          'What we publish here are the reason definitions and our guidance. We do not publish how often each reason is used, and no reason below should be read as more or less common than another.',
        ],
      },
      {
        heading: 'The decline reasons, defined',
        paragraphs: [
          'These are the reasons a curator can choose from in our review workflow. Several can apply at once.',
        ],
        table: {
          caption: 'Decline reasons available in the BVSS FVM and CuratorOS review workflow',
          columns: ['Reason', 'What it means', 'What to do next'],
          rows: [
            ['Energy mismatch', 'The song is noticeably calmer or more intense than the playlist around it', 'Pitch playlists whose energy matches the track, and describe its energy honestly'],
            ['Not my genre lane', 'The song sits outside what this playlist covers', 'Re-check the genre a listener would hear, not the one you hope to reach'],
            ['Wrong mood', 'Right genre, different feeling', 'Choose moods that describe the song as it sounds, and pitch playlists built on that mood'],
            ['Too similar to recent adds', 'The playlist already has that sound in rotation right now', 'Try a different playlist, or come back to this one with a later release'],
            ['Vocal style', 'The vocal approach does not suit the playlist’s sequence', 'Look for playlists built around a similar vocal approach, or an instrumental lane if you have one'],
            ['Production not ready', 'The idea is there; the recording is not yet at the level of the playlist', 'Revisit the production before pitching this song again'],
            ['Mix / master', 'Balance or loudness stands out against the songs around it', 'A/B the track against songs on the playlist and consider a mix or master revision'],
            ['Other', 'A reason not covered above', 'Treat it as a fit decision for that playlist and move on to the next one'],
          ],
        },
      },
      {
        heading: 'Fit reasons and readiness reasons',
        paragraphs: [
          'The reasons fall into two groups, and they call for different responses.',
        ],
        bullets: [
          'Fit: energy mismatch, not my genre lane, wrong mood, too similar to recent adds, vocal style. The song may be finished and good, and still not belong on that playlist. The fix is choosing playlists better, not changing the song.',
          'Readiness: production not ready, mix / master. These point at the recording itself. If you hear the same note from more than one curator, it is worth taking seriously before your next release.',
          'Other can be either. If it is not clear, treat it as fit and pitch elsewhere.',
        ],
        callout: {
          kind: 'note',
          title: 'A worked example (fictional)',
          body: 'Lowtide Avenue is a fictional artist used for illustration. They pitch a slow, hushed indie song to an upbeat indie playlist and it is declined for energy mismatch. The song is not the problem; the target was. They pitch the same song to a quieter late-night playlist instead.',
        },
      },
      {
        heading: 'Reasons a curator may decline anywhere',
        paragraphs: [
          'Outside our network, a curator may decline without saying why. They may pass for the reasons above, or for reasons that come from the pitch rather than the music:',
        ],
        bullets: [
          'The pitch names a genre or mood the song does not have.',
          'The pitch is clearly copied and pasted to many playlists.',
          'The link is broken, private or points to the wrong version.',
          'The playlist is not taking submissions in that lane right now.',
        ],
      },
      {
        heading: 'What to do after a decline',
        paragraphs: [],
        steps: [
          { title: 'Read the reason as information', body: 'It tells you about one playlist’s needs at one moment. Write it down next to the playlist in your tracker.' },
          { title: 'Decide: fit or readiness?', body: 'Fit reasons mean pitch elsewhere. Readiness reasons mean look at the recording before the next pitch.' },
          { title: 'Find a better match', body: 'Use [this checklist](/learn/find-spotify-playlist-curators) to find playlists that fit the energy, genre and mood of the song, or the [Playlist Fit Checker](/tools/playlist-fit-checker) to match it against our network.' },
          { title: 'Tighten the pitch', body: 'Accurate genre, moods and comparable artists help every curator. [These templates](/learn/how-to-pitch-playlist-curators) keep it short.' },
          { title: 'Do not argue or resubmit straight away', body: 'A short thank-you is fine; a debate is not. Come back with your next release rather than the same song.' },
        ],
        callout: {
          kind: 'submit',
          title: 'Submit where the reason is shown',
          body: 'Every decline in our network comes with at least one reason on your status page. Find playlists that fit on our [free submission page](/free-spotify-playlist-submission).',
        },
      },
    ],
    faq: [
      { question: 'Why was my song rejected by a playlist?', answer: 'A curator may have felt it did not fit that playlist at that moment (energy, genre, mood, vocal style or what was recently added), or that the recording was not ready yet. In our network the curator always gives at least one reason.' },
      { question: 'Does a rejection mean my song is bad?', answer: 'No. Five of the eight reasons in our review workflow describe fit with a specific playlist, not the quality of the song, so the same song can be declined by one playlist and accepted by another.' },
      { question: 'Can I resubmit a declined song?', answer: 'Pitching a different playlist that fits better is generally a better use of the song. For the same playlist, come back with your next release.' },
      { question: 'Do you publish how often each reason is used?', answer: 'No. Every reason here is a real option in our review tool, and each one deserves the same attention when you receive it.' },
      { question: 'What does a hold mean?', answer: 'A hold is not a decline. The curator is keeping the song in their queue and will revisit it by a date shown on your status page.' },
    ],
    related: [
      { href: '/tools/playlist-fit-checker', label: 'Playlist Fit Checker', detail: 'Reduce obvious genre and mood mismatches.' },
      { href: '/learn/how-to-pitch-playlist-curators', label: 'How to pitch playlist curators', detail: 'Templates that avoid the easy declines.' },
      { href: '/learn/find-spotify-playlist-curators', label: 'Find Spotify playlist curators', detail: 'Check fit before you submit.' },
      { href: '/learn/how-we-review-playlist-submissions', label: 'How we review submissions', detail: 'Accept, hold or decline, step by step.' },
      { href: '/free-spotify-playlist-submission', label: 'Free Spotify playlist submission', detail: 'Submit free; every decline comes with a reason.' },
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
