import * as Location from 'expo-location';

export type PickedLocation = {
  latitude: number;
  longitude: number;
  /** Best-effort street address from reverse geocoding (may be null). */
  address: string | null;
};

export class LocationPermissionError extends Error {}

/** Asks for foreground permission and returns the device's current position. */
export async function getCurrentLocation(): Promise<PickedLocation> {
  const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new LocationPermissionError(
      canAskAgain
        ? 'Location permission was not granted. You can still type your address.'
        : 'Location is turned off for DustBin Africa. Enable it in Settings, or type your address.',
    );
  }

  const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  const { latitude, longitude } = position.coords;

  let address: string | null = null;
  try {
    const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (place) {
      address = place.formattedAddress ?? ([place.name, place.street, place.district, place.city].filter(Boolean).join(', ') || null);
    }
  } catch {
    // Reverse geocoding is unavailable on some devices/web; coordinates are still useful.
  }

  return { latitude, longitude, address };
}

/**
 * Current position only if permission was already granted — never prompts.
 * Used for optional evidence (collector arrival) and distance hints.
 */
export async function getLocationIfPermitted(): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const last = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60 * 1000 });
    const pos = last ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
  } catch {
    return null;
  }
}
