import { useEffect, useRef, useState } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import MapView, { Marker, Polyline, type Region } from 'react-native-maps';

import { type AppTheme } from '@/hooks/use-app-theme';

type Coord = { latitude: number; longitude: number };

export type ParkingCoords = { latitude: number; longitude: number };

export function ParkingMap({
  parking,
  userLocation,
  theme,
  style,
}: {
  parking: ParkingCoords;
  userLocation?: Coord;
  theme: AppTheme;
  style?: StyleProp<ViewStyle>;
}) {
  const [route, setRoute] = useState<Coord[]>([]);
  const mapRef = useRef<MapView>(null);

  const destination: Coord = { latitude: parking.latitude, longitude: parking.longitude };

  const region: Region = {
    latitude: parking.latitude,
    longitude: parking.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  useEffect(() => {
    setRoute([]);
    if (!userLocation) return;

    const { latitude: uLat, longitude: uLon } = userLocation;
    const { latitude: pLat, longitude: pLon } = parking;

    fetch(
      `https://router.project-osrm.org/route/v1/driving/${uLon},${uLat};${pLon},${pLat}?overview=full&geometries=geojson`
    )
      .then((res) => res.json())
      .then((data) => {
        const coords: [number, number][] = data?.routes?.[0]?.geometry?.coordinates ?? [];
        setRoute(coords.map(([lon, lat]) => ({ latitude: lat, longitude: lon })));
      })
      .catch(() => {});
  }, [parking.latitude, parking.longitude]);

  useEffect(() => {
    if (!mapRef.current || route.length === 0 || !userLocation) return;
    mapRef.current.fitToCoordinates([userLocation, destination], {
      edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
      animated: true,
    });
  }, [route]);

  return (
    <MapView
      ref={mapRef}
      style={[styles.map, style]}
      initialRegion={region}
      showsUserLocation={!!userLocation}
      showsMyLocationButton={false}
    >
      <Marker coordinate={destination} pinColor={theme.tint} />
      {route.length > 0 && (
        <Polyline coordinates={route} strokeColor={theme.tint} strokeWidth={3} />
      )}
    </MapView>
  );
}

const styles = StyleSheet.create({ map: { flex: 1, width: '100%' } });
