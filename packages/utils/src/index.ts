/**
 * Geo calculation: Haversine distance in kilometers between two GPS coordinates
 */
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

/**
 * Calculates compass bearing from point A to point B in degrees (0 - 360)
 */
export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const y = Math.sin(((lon2 - lon1) * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(((lon2 - lon1) * Math.PI) / 180);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

/**
 * Cyclical feature encoder for time/season ML features
 */
export function encodeCyclicalFeature(value: number, maxPeriod: number): { sin: number; cos: number } {
  return {
    sin: Number(Math.sin((2 * Math.PI * value) / maxPeriod).toFixed(4)),
    cos: Number(Math.cos((2 * Math.PI * value) / maxPeriod).toFixed(4))
  };
}

/**
 * Carbon & Fuel savings calculators
 */
export function calculateFuelSavedLiters(baselineKm: number, optimizedKm: number, fuelKmPerLiter: number = 3.5): number {
  const kmSaved = Math.max(0, baselineKm - optimizedKm);
  return Number((kmSaved / fuelKmPerLiter).toFixed(1));
}

export function calculateCO2SavedKg(fuelSavedLiters: number, co2KgPerLiter: number = 2.68): number {
  return Number((fuelSavedLiters * co2KgPerLiter).toFixed(1));
}

/**
 * Date / Time formatting
 */
export function formatRelativeTime(date: string | Date): string {
  const diffSec = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}
