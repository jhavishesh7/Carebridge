export interface RouteEstimate {
  distanceKm: number;
  durationMinutes: number;
}

export interface FareBreakdown {
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  assistanceFee: number;
  total: number;
}

// Pricing constants (Rs)
const BASE_FARE_RS = 80;
const DISTANCE_FARE_PER_KM_RS = 40;
const TIME_FARE_PER_MIN_RS = 6;
const ASSISTANCE_STANDARD_RS = 150;
const ASSISTANCE_ENHANCED_RS = 300;

export function computeFare(
  distanceKmRoundTrip: number,
  durationMinutesRoundTrip: number,
  options?: { enhancedSupport?: boolean }
): FareBreakdown {
  const assistanceFee = options?.enhancedSupport ? ASSISTANCE_ENHANCED_RS : ASSISTANCE_STANDARD_RS;
  const baseFare = BASE_FARE_RS;
  const distanceFare = DISTANCE_FARE_PER_KM_RS * distanceKmRoundTrip;
  const timeFare = TIME_FARE_PER_MIN_RS * durationMinutesRoundTrip;
  const total = Math.round((baseFare + distanceFare + timeFare + assistanceFee) * 100) / 100;
  return { baseFare, distanceFare, timeFare, assistanceFee, total };
}

export async function geocodeAddress(address: string): Promise<{ lat: number; lon: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
  const resp = await fetch(url, { headers: { 'Accept-Language': 'en' } });
  const json = (await resp.json()) as Array<{ lat: string; lon: string }>;
  if (!Array.isArray(json) || json.length === 0) return null;
  return { lat: parseFloat(json[0].lat), lon: parseFloat(json[0].lon) };
}

export async function getDrivingRoute(
  origin: { lat: number; lon: number },
  dest: { lat: number; lon: number }
): Promise<RouteEstimate | null> {
  const url = `https://router.project-osrm.org/route/v1/driving/${origin.lon},${origin.lat};${dest.lon},${dest.lat}?overview=false`;
  const resp = await fetch(url);
  const json = await resp.json();
  if (!json || json.code !== 'Ok' || !json.routes?.length) return null;
  const route = json.routes[0];
  const distanceKm = route.distance / 1000; // meters -> km
  const durationMinutes = route.duration / 60; // seconds -> minutes
  return { distanceKm, durationMinutes };
}

export async function estimateFromAddresses(
  pickup: string,
  hospital: string
): Promise<RouteEstimate | null> {
  const [o, d] = await Promise.all([geocodeAddress(pickup), geocodeAddress(hospital)]);
  if (!o || !d) return null;
  return await getDrivingRoute(o, d);
}


