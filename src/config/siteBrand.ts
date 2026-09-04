export type SiteRegion = 'hn' | 'hcm';

export const SITE_REGION: SiteRegion =
  typeof window !== 'undefined' && /(^|\.)hcm\./i.test(window.location.hostname)
    ? 'hcm'
    : 'hn';

export const SITE_BRAND = `NPI-CPS-${SITE_REGION.toUpperCase()}`;
