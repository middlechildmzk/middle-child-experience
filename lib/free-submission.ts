// Copy for /free-spotify-playlist-submission. Kept as data so the same
// publication gate that checks /learn guides (tests/learn) checks this page.
// Counts never live here: the page derives them from the playlist registry.
import type { GuideSource, GuideTable } from './learn-guides';

export const freeSubmissionPage = {
  path: '/free-spotify-playlist-submission',
  seoTitle: 'Free Spotify Playlist Submission: Human-Reviewed Playlists',
  title: 'Free Spotify Playlist Submission',
  description:
    'Submit your song free to human-curated Spotify playlists. Filter by genre, mood and moment, see how review works, and track every decision. No paid placement.',
  updated: '2026-10-07',
  lead:
    'Submit one track for free. It is routed to the playlists in our network that fit it, and a curator listens and decides for each one. Nothing is sold, and placement is never guaranteed.',

  steps: [
    {
      title: 'Find the lanes that fit (optional)',
      body: 'Filter the playlists below by genre, mood or listening moment. If you are not sure, skip this: routing suggests fits for you.',
    },
    {
      title: 'Submit the track once',
      body: 'Released: search for it or paste the Spotify link. Unreleased: upload the audio privately or share a private listening link. One submission can reach several playlists, so there is no need to send the same song again.',
    },
    {
      title: 'Software organizes, people decide',
      body: 'Routing compares your genre, moods and comparable artists with each playlist and suggests likely fits. A match is a suggestion for the queue, not a score of your song or a prediction of placement.',
    },
    {
      title: 'A curator decides for each playlist',
      body: 'Each playlist gets its own decision: accept, hold for later, or decline. A no from one playlist does not decide another.',
    },
    {
      title: 'Follow the decisions on your status page',
      body: 'After you submit, you get a private link that shows each recorded decision. An accepted track only counts as live once we see it on the actual Spotify playlist.',
    },
  ],

  freeTable: {
    caption: 'What free means here',
    columns: ['', 'BVSS FVM + CuratorOS', 'What we do not offer'],
    rows: [
      ['Submitting', 'Free', 'No paid submission tier'],
      ['Review', 'A human curator listens and decides', 'No automated accept or decline'],
      ['Placement', 'Decided on fit with the playlist', 'Never sold and never guaranteed'],
      ['Streams and followers', 'Not promised', 'No stream, follower or algorithm guarantees'],
      ['Spotify editorial', 'Not involved: these are independent playlists', 'We cannot pitch you to Spotify editors'],
    ],
  } satisfies GuideTable,

  disclosure: [
    'BVSS FVM playlists are programmed by BVSS FVM, the independent music label and playlist network that runs this site.',
    'CuratorOS playlists are programmed by the in-house CuratorOS curation team, which operates alongside BVSS FVM. They are not independent third-party curators.',
    'None of these playlists are Spotify editorial playlists. To be considered by Spotify’s own editors, pitch an unreleased song in [Spotify for Artists](https://support.spotify.com/us/artists/article/pitching-music-and-videos-to-playlist-editors/) before it is released. Spotify asks for at least 7 days so editors have time to listen, and a pitch made at least 7 days ahead also puts the song in your followers’ Release Radar.',
    'Follower counts appear only where they have been measured. Newer playlists show “Measuring” until a count is confirmed.',
  ],

  checklist: [
    'Submit the final master or final Spotify version, not a demo.',
    'Pick the primary genre a listener would hear, not the one you hope to be filed under.',
    'Choose two or three moods that really describe the track.',
    'Name comparable artists because the music overlaps, not because they are big.',
    'Keep the note short: what the song is and who it is for.',
    'Releasing soon? Also pitch the song to Spotify’s editors yourself; we cannot do that for you.',
  ],

  faq: [
    {
      question: 'Is it really free to submit?',
      answer: 'Yes. Submitting and review cost nothing, and there is no paid tier that gets faster or better treatment.',
    },
    {
      question: 'Does submitting guarantee a playlist placement?',
      answer: 'No. Submission gets your track reviewed. Each playlist’s curator decides based on fit, and placement is never sold.',
    },
    {
      question: 'Are these Spotify’s editorial playlists?',
      answer: 'No. They are independent playlists run by BVSS FVM and the in-house CuratorOS team. Spotify’s editorial playlists are pitched separately through Spotify for Artists.',
    },
    {
      question: 'Can I submit unreleased music?',
      answer: 'Yes. Upload the audio privately or share a private listening link. It is only used for review.',
    },
    {
      question: 'How long does review take?',
      answer: 'There is no fixed turnaround yet. Your private status page shows each decision as soon as it is recorded.',
    },
    {
      question: 'Do I need to submit to each playlist separately?',
      answer: 'No. Submit once and pick any playlists you want considered, or let routing suggest them. Each playlist still decides independently.',
    },
    {
      question: 'What about services that promise guaranteed streams?',
      answer: 'Avoid them. [Spotify says](https://support.spotify.com/us/artists/article/third-party-services-that-guarantee-streams/) paid services that guarantee streams are not legitimate and that using them can get your music removed.',
    },
  ],

  sources: [
    {
      label: 'Pitching music and videos to Spotify playlist editors',
      publisher: 'Spotify for Artists Support',
      href: 'https://support.spotify.com/us/artists/article/pitching-music-and-videos-to-playlist-editors/',
      accessed: '2026-10-07',
    },
    {
      label: 'Artificial streaming and paid 3rd-party services that guarantee streams',
      publisher: 'Spotify for Artists Support',
      href: 'https://support.spotify.com/us/artists/article/third-party-services-that-guarantee-streams/',
      accessed: '2026-10-07',
    },
  ] satisfies GuideSource[],
};
