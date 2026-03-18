// export const API_BASE = 'https://parkapp-a6c4d3dbb450.herokuapp.com';
export const API_BASE = 'http://192.168.1.56'
export const MP_PUBLIC_KEY = 'TEST-81b68f33-5310-49be-92b2-287dec588487'
export const PARKAPP_API_VERSION = 'application/vnd.parkapp.v1+json'

export const NEARBY_RADIUS_METRES = 500;
export const MIN_DRIVING_SPEED_KMH = 10;

export function apiHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-park-app-api-version': `${PARKAPP_API_VERSION}`,
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}
