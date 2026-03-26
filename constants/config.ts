export const API_BASE = 'https://parkapp-a6c4d3dbb450.herokuapp.com';
export const MP_PUBLIC_KEY = 'TEST-81b68f33-5310-49be-92b2-287dec588487'
export const PARKAPP_API_VERSION = 'application/vnd.parkapp.v1+json'

export const NEARBY_RADIUS_METRES = 500;
export const MIN_DRIVING_SPEED_KMH = 10;

import * as Localization from 'expo-localization';

export function apiHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-park-app-api-version': PARKAPP_API_VERSION,
  };
  const timeZone = Localization.getCalendars()[0]?.timeZone;
  if (timeZone) headers['x-park-app-user-time-zone'] = timeZone;
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}
