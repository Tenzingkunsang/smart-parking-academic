/**
 * Haversine distance in meters between two WGS84 points.
 */
export function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function formatDistance(meters) {
  if (meters == null || Number.isNaN(meters)) return '—';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Grid-based clustering for map pins. Larger cell = fewer clusters.
 */
export function clusterSpotsByGrid(spots, cellSizeDeg = 0.012) {
  if (!spots?.length) return [];
  const map = new Map();
  for (const s of spots) {
    if (!s?.location?.lat && s?.location?.lat !== 0) continue;
    if (!s?.location?.lng && s?.location?.lng !== 0) continue;
    const gx = Math.floor(s.location.lat / cellSizeDeg);
    const gy = Math.floor(s.location.lng / cellSizeDeg);
    const key = `${gx}_${gy}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(s);
  }
  return [...map.entries()].map(([key, group]) => {
    const lat = group.reduce((a, g) => a + g.location.lat, 0) / group.length;
    const lng = group.reduce((a, g) => a + g.location.lng, 0) / group.length;
    return {
      key,
      spots: group,
      isCluster: group.length > 1,
      position: [lat, lng],
    };
  });
}
