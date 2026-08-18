const canonicalHosts = new Set(['bvssfvm.com', 'www.bvssfvm.com']);

function normalizeUrl(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim().replace(/\/$/, '');
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    if (url.hostname === 'your-preview-domain.vercel.app' || url.hostname === 'localhost') return null;
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

const configuredSiteUrl = normalizeUrl(process.env.NEXT_PUBLIC_SITE_URL);
const configuredHost = configuredSiteUrl ? new URL(configuredSiteUrl).hostname : null;

export const isCanonicalDomainConfigured = Boolean(
  configuredSiteUrl && configuredHost && canonicalHosts.has(configuredHost)
);

const vercelHost = process.env.VERCEL_BRANCH_URL || process.env.VERCEL_URL;
const previewSiteUrl = normalizeUrl(vercelHost) || 'https://middle-child-experience.vercel.app';

/**
 * Use the real BVSS FVM domain only when it is explicitly configured.
 * Until then, previews describe themselves with their actual Vercel origin and
 * remain noindexed so search engines never consolidate signals into a domain
 * that has not been attached yet.
 */
export const siteUrl = isCanonicalDomainConfigured
  ? configuredSiteUrl!
  : previewSiteUrl;

export const canIndexSite =
  isCanonicalDomainConfigured && process.env.VERCEL_ENV === 'production';
