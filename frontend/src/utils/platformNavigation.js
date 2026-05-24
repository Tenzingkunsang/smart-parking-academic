/**
 * Detect the user's platform: 'ios' | 'android' | 'web'
 */
export function detectPlatform() {
  if (typeof navigator === 'undefined') return 'web';
  const ua = navigator.userAgent || navigator.vendor || '';
  if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) return 'ios';
  if (/android/i.test(ua)) return 'android';
  return 'web';
}

/**
 * Build a deep-link URL for native maps apps. Falls back to google.com/maps
 * for desktop/web users.
 *
 * @param {number} lat  destination latitude
 * @param {number} lng  destination longitude
 * @param {string} label optional place label
 */
export function buildMapsDeepLink(lat, lng, label = 'Parking Spot') {
  const platform = detectPlatform();
  const encodedLabel = encodeURIComponent(label);

  if (platform === 'ios') {
    return `https://maps.apple.com/?daddr=${lat},${lng}&q=${encodedLabel}`;
  }
  if (platform === 'android') {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

/**
 * Open the maps deep link in a new tab (works on both desktop + mobile browsers).
 */
export function openInMaps(lat, lng, label) {
  const url = buildMapsDeepLink(lat, lng, label);
  window.open(url, '_blank', 'noopener,noreferrer');
}
