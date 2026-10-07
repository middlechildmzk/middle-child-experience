// Correct known legacy system copy on read; preserve the stored event history.
export function publicStatusDetail(detail: string | null | undefined) {
  if (detail === 'Your track entered the BVSS FVM review queue and may also be routed to approved independent curators when there is a strong fit.') {
    return 'Your track entered the BVSS FVM review queue and may also be routed to matched, verified curator playlists you opted into. Each playlist receives a separate human decision.';
  }
  return detail;
}
