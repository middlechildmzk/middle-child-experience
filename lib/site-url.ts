const fallbackSiteUrl = 'https://middle-child-experience.vercel.app';

const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '');

export const siteUrl =
  configuredSiteUrl &&
  !configuredSiteUrl.includes('your-preview-domain') &&
  /^https:\/\//.test(configuredSiteUrl)
    ? configuredSiteUrl
    : fallbackSiteUrl;
