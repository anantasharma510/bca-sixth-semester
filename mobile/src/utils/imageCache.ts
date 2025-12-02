/**
 * Cache-busting utility for image URLs
 * Only adds cache-busting when needed (for immediate updates on uploading device)
 * Memoized to prevent flickering during scroll
 */

let imageVersionCache: { [url: string]: number } = {};
let urlMemoCache: { [url: string]: string } = {};

/**
 * Get cache-busted URL for immediate updates
 * Memoized - only creates new cache-busted URL when base URL changes
 * This prevents flickering during scroll
 */
export function getCacheBustedUrl(
  url: string | null | undefined,
  forceUpdate: boolean = false
): string | null {
  // Always return null if URL is invalid
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return null;
  }
  
  const cleanUrl = url.trim();
  
  // If forcing update (e.g., after upload), add new version and clear memo
  if (forceUpdate) {
    const version = Date.now();
    imageVersionCache[cleanUrl] = version;
    // Clear memo for this URL so it gets recalculated
    delete urlMemoCache[cleanUrl];
    const bustedUrl = `${cleanUrl}${cleanUrl.includes('?') ? '&' : '?'}v=${version}`;
    urlMemoCache[cleanUrl] = bustedUrl;
    return bustedUrl;
  }
  
  // Return memoized version if available (prevents recalculation on every render)
  if (urlMemoCache[cleanUrl]) {
    return urlMemoCache[cleanUrl];
  }
  
  // If URL has a cached version, use it
  if (imageVersionCache[cleanUrl]) {
    const bustedUrl = `${cleanUrl}${cleanUrl.includes('?') ? '&' : '?'}v=${imageVersionCache[cleanUrl]}`;
    urlMemoCache[cleanUrl] = bustedUrl;
    return bustedUrl;
  }
  
  // Otherwise, return original URL (no cache-busting needed) and memoize it
  urlMemoCache[cleanUrl] = cleanUrl;
  return cleanUrl;
}

/**
 * Get base URL without cache-busting params (for stable keys)
 */
export function getBaseUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  
  // Remove cache-busting params
  const baseUrl = url.split('?')[0].split('&v=')[0];
  return baseUrl || null;
}

/**
 * Mark image URL as updated (for immediate refresh)
 * This clears the memo cache and forces a new cache-busted URL
 */
export function markImageUpdated(url: string | null | undefined): void {
  if (!url) return;
  const cleanUrl = url.trim();
  imageVersionCache[cleanUrl] = Date.now();
  // Clear memo cache so next getCacheBustedUrl call creates new version
  delete urlMemoCache[cleanUrl];
}

/**
 * Clear version cache for a specific URL
 */
export function clearImageVersion(url: string | null | undefined): void {
  if (!url) return;
  delete imageVersionCache[url];
}

/**
 * Clear all version cache
 */
export function clearAllImageVersions(): void {
  imageVersionCache = {};
}

