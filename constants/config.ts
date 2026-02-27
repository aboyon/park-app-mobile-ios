export const API_BASE = 'https://parkapp-a6c4d3dbb450.herokuapp.com';

export const NEARBY_RADIUS_METRES = 500;
export const MIN_DRIVING_SPEED_KMH = 10;

export function apiHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-park-app-api-version': 'application/vnd.parkapp.v1+json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}
