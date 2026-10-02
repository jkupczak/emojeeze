/**
 * Google AdSense — replace with your values from https://www.google.com/adsense/
 *
 * 1. Create a Display ad unit (vertical / skyscraper works well: 160×600).
 * 2. Paste your publisher ID (ca-pub-…) and ad slot ID below.
 * 3. Deploy on your live domain (AdSense does not serve on localhost).
 */
export const ADSENSE_CLIENT = "ca-pub-XXXXXXXXXXXXXXXX";
export const ADSENSE_SLOT = "0000000000";

export function adsConfigured() {
  return (
    ADSENSE_CLIENT.startsWith("ca-pub-") &&
    !ADSENSE_CLIENT.includes("X") &&
    /^\d+$/.test(ADSENSE_SLOT) &&
    ADSENSE_SLOT !== "0000000000"
  );
}
