/**
 * Mechanical server-only guard for `lib/bridge/*`.
 *
 * The Architecture Pack (§7) requires adapters to run server-side:
 * submission-status tokens and future service-role reads pass through
 * this layer. Importing this module makes any client bundle that pulls
 * in the bridge fail fast at module evaluation instead of silently
 * shipping server-only code to the browser.
 *
 * This is a deliberate stand-in for the `server-only` npm package
 * (build-time failure) to avoid adding a dependency in tranche one.
 * Revisit when the pilot UI lands: prefer the package for a build error
 * over this runtime error.
 */

if (typeof window !== 'undefined') {
  throw new Error(
    '[bridge] lib/bridge/* is server-only and must not be imported from ' +
      'a Client Component. Move the call into a Server Component, Route ' +
      'Handler, or Server Action.',
  );
}

export {};
