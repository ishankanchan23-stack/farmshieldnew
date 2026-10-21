export interface Coordinates {
  latitude: number;
  longitude: number;
}

export function getCurrentLocation(
  geolocation: Pick<Geolocation, "getCurrentPosition"> | undefined = navigator.geolocation,
): Promise<Coordinates> {
  if (!geolocation) {
    return Promise.reject(new Error("Location services are unavailable in this browser."));
  }

  return new Promise((resolve, reject) => {
    geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
      (failure) => {
        const message = failure.code === failure.PERMISSION_DENIED
          ? "Location permission was denied. Allow location access in your browser settings or enter coordinates manually."
          : failure.code === failure.POSITION_UNAVAILABLE
            ? "Your current location is unavailable. Check that location services are enabled, or enter coordinates manually."
            : "Location request timed out. Try again or enter coordinates manually.";
        reject(new Error(message));
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 },
    );
  });
}
