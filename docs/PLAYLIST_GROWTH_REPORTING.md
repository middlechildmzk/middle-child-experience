# BVSS FVM playlist growth reporting contract

## Purpose

Daily follower reporting must separate **network membership changes** from **actual follower movement**.

The earlier dashboard/report comparison mixed changing playlist populations, which produced misleading totals such as a positive report-to-report change while the same-playlist cohort had declined.

This contract defines the canonical read-only reporting method.

## Source of truth

Follower-growth reporting uses:

- `public.bvss_playlist_metric_snapshots`
- `source = 'soundcharts'`
- `public.bvss_playlists` only to determine current eligibility / labels

Do not calculate growth from changing aggregate dashboard totals alone.

## Current eligible registry

A playlist is eligible for the BVSS public network cohort when:

- `public_status = 'public'`
- `lifecycle_state = 'active'`

A playlist is **measured for a comparison date** only when it has a non-null Soundcharts `followers` snapshot on that date.

## Canonical daily delta

For each report run:

1. Find the latest Soundcharts `metric_date` for an eligible playlist.
2. Find the preceding distinct Soundcharts `metric_date`.
3. Build the **comparable 1D cohort** as the intersection of eligible playlists with non-null follower snapshots on both dates.
4. Sum follower movement only across that intersection.
5. Report playlists present on only one side separately as cohort additions/missing measurements.
6. Never treat a newly measured playlist's existing follower base as new daily growth.

Therefore:

`daily follower growth = sum(current followers - previous followers) for the same playlist IDs present on both comparison dates`

## Canonical 7-day delta

Use the latest eligible Soundcharts date as the endpoint.

Use the latest available Soundcharts date **on or before endpoint - 7 days** as the baseline.

The 7-day comparable cohort is again the intersection of playlists measured on both dates.

Do not compare whole-network totals when the membership differs.

## Current network total

Report these separately:

- **Eligible public/active playlists** — registry population.
- **Latest Soundcharts measured playlists** — playlists with an actual follower value on the latest metric date.
- **Latest measured follower total** — sum of those latest snapshot values.
- **Unmeasured/currently missing** — eligible playlists without a current Soundcharts follower snapshot.

This prevents a registry row with `0`, a newly connected playlist, or a temporarily missing feed from distorting the follower-growth number.

## Required daily report fields

- latest metric date
- eligible public/active playlist count
- current measured cohort count
- current measured follower total
- 1D comparable cohort count
- 1D comparable start total
- 1D comparable end total
- **1D net follower change**
- playlists added to comparison coverage
- playlists missing from current coverage
- biggest gainers
- biggest decliners
- flat playlists
- 7D comparable cohort count and delta
- milestone watch: 1K / 2.5K / 5K / 10K
- anomaly flags where appropriate

## Example: 2026-09-28

Raw Soundcharts snapshots:

- latest date: 2026-09-28
- measured today: 16 playlists / 9,743 followers
- prior date: 2026-09-27
- measured prior date: 13 playlists / 9,270 followers
- comparable playlists present on both dates: 13
- comparable prior total: 9,270
- comparable current total: 9,129
- **canonical 1D change: -141**

Three playlists became newly measured on 2026-09-28:

- Emotional Bass
- Late Night Drive
- Liquid DnB

Their combined existing follower base was 614. That 614 is **coverage expansion**, not follower growth.

The naive whole-snapshot calculation would be:

`9,743 - 9,270 = +473`

but that incorrectly mixes:

`-141 actual comparable follower movement + 614 newly measured existing followers = +473 report-total movement`

The daily report must use **-141** as the follower-growth number and separately disclose the +614 coverage addition.

## 7-day example: 2026-09-28 vs 2026-09-21

Six playlists had valid Soundcharts follower snapshots on both dates.

- baseline: 7,218
- current: 7,486
- **7D comparable growth: +268**

Only those six belong in that 7-day growth claim.

## Anomalies

Large negative/positive changes must still be reported when present in the comparable cohort; they must not be silently discarded.

However, flag a value for review when it is inconsistent with surrounding history or may represent a source/mapping correction.

Do not relabel an observed decline as a data error without evidence.

## Reporting language

Preferred:

> 13 playlists were comparable day-over-day and lost 141 followers net. Three additional playlists became measurable today, adding 614 existing followers to coverage; that coverage expansion is not counted as growth.

Avoid:

> The network gained 473 followers today.

unless all 473 came from same-playlist follower movement.
